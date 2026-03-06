import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
// @ts-ignore
import { Signer } from "@volcengine/openapi";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel 环境下无需手动调用 dotenv.config()，系统会自动注入环境变量
// dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 环境变量获取
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const ARK_API_KEY = process.env.ARK_API_KEY; // 新增：火山方舟 API Key
const ACCESS_KEY_ID = process.env.VOLC_ACCESS_KEY_ID?.trim();
const SECRET_ACCESS_KEY = process.env.VOLC_SECRET_ACCESS_KEY?.trim();
const REGION = (process.env.VOLC_REGION || "cn-north-1").trim();
const SERVICE = (process.env.VOLC_SERVICE || "cv").trim();
const HOST = "visual.volcengineapi.com";

// Gemini AI 初始化
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// 辅助函数：校验环境变量
function checkVolcKeys() {
  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    throw new Error("检测到 Vercel 环境变量 VOLC_ACCESS_KEY_ID 或 VOLC_SECRET_ACCESS_KEY 未配置，请在 Vercel 控制台设置。");
  }
}

// 创建一个 Router 来处理 API 请求
const apiRouter = express.Router();

// 根路由
apiRouter.get("/", (req, res) => {
  res.send("🚀 春节祝福卡 API 已就绪！");
});

// 上传接口
apiRouter.post("/upload", (req, res) => {
  res.json({ message: "Vercel mode: Use base64 for image transmission." });
});

// 提交任务接口
apiRouter.post("/jimeng/submit", async (req, res) => {
  try {
    checkVolcKeys();
    const { prompt, req_key = "jimeng_t2i_v40", image_urls, binary_data_base64, ...rest } = req.body;

    const query = {
      Action: "CVSync2AsyncSubmitTask",
      Version: "2022-08-31",
    };

    const body: any = {
      req_key,
      prompt,
      ...rest,
    };

    if (binary_data_base64 && binary_data_base64.length > 0) {
      body.binary_data_base64 = binary_data_base64;
    } else if (image_urls && image_urls.length > 0) {
      body.image_urls = image_urls;
    }

    // ---------------------------------------------------------
    // 特殊处理：Doubao-Seedream-4.5 (Ark 平台)
    // ---------------------------------------------------------
    if (req_key === "doubao-seedream-4.5") {
      // 检查是否配置了 Endpoint ID，如果有则使用 Endpoint 域名
      const endpointId = process.env.ARK_ENDPOINT_ID;
      
      let arkHost = "ark.cn-beijing.volces.com";
      // 如果提供了 Endpoint ID，通常域名格式为 <endpoint_id>.ark.cn-beijing.volces.com
      if (endpointId) {
        arkHost = `${endpointId}.ark.cn-beijing.volces.com`;
      }
      
      const arkPath = "/api/v3/images/generations";
      const arkService = "ark";
      const arkRegion = "cn-beijing";

      // 构造 Ark 格式的 Payload
      const arkBody: any = {
        model: endpointId || "doubao-seedream-4.5", 
        prompt: prompt,
        // size: "1024x1024", 
      };

      // 处理图片输入
      if (binary_data_base64 && binary_data_base64.length > 0) {
        arkBody.image_url = `data:image/png;base64,${binary_data_base64[0]}`;
      } else if (image_urls && image_urls.length > 0) {
        arkBody.image_url = image_urls[0];
      }

      const arkRequestObj = {
        method: 'POST',
        region: arkRegion,
        pathname: arkPath,
        headers: {
          'Content-Type': 'application/json',
        } as any,
        body: JSON.stringify(arkBody),
      };

      if (ARK_API_KEY) {
        console.log("Using ARK_API_KEY for authentication...");
        arkRequestObj.headers['Authorization'] = `Bearer ${ARK_API_KEY}`;
      } else {
        console.log("Using Volcengine AK/SK Signer for authentication...");
        const arkSigner = new Signer(arkRequestObj, arkService);
        arkSigner.addAuthorization({
          accessKeyId: ACCESS_KEY_ID!,
          secretKey: SECRET_ACCESS_KEY!,
        });
      }

      console.log("Calling Ark API for Doubao-Seedream-4.5...", `URL: https://${arkHost}${arkPath}`);
      
      const arkResponse = await axios({
        method: arkRequestObj.method,
        url: `https://${arkHost}${arkPath}`,
        headers: arkRequestObj.headers,
        data: arkRequestObj.body,
        validateStatus: () => true,
      });

      if (arkResponse.status !== 200) {
        console.error("Ark API Error:", arkResponse.data);
        throw new Error(`Ark API Error: ${arkResponse.status} - ${JSON.stringify(arkResponse.data)}`);
      }

      const arkData = arkResponse.data;
      if (arkData.data && arkData.data.length > 0) {
        const imageUrl = arkData.data[0].url || arkData.data[0].image_url;
        const fakeTaskId = `DIRECT_URL:${Buffer.from(imageUrl).toString('base64')}`;
        
        console.log("✅ Ark (Doubao) 生成成功");
        res.status(200).json({
          data: {
            task_id: fakeTaskId,
            status: "succeeded" 
          }
        });
        return; 
      }
    } else {
        // 非 Doubao-Seedream-4.5 的逻辑，继续执行后续代码
        // 但为了避免代码冗余，我们把通用逻辑放在 else 块里
        const requestObj = {
            method: 'POST',
            region: REGION,
            pathname: '/',
            params: query,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          };
      
          const signer = new Signer(requestObj, SERVICE);
          signer.addAuthorization({
            accessKeyId: ACCESS_KEY_ID!,
            secretKey: SECRET_ACCESS_KEY!,
          });
      
          const url = `https://${HOST}/?Action=${query.Action}&Version=${query.Version}`;
          
          const response = await axios({
              method: requestObj.method,
              url,
              headers: requestObj.headers,
              data: requestObj.body,
          });
      
          res.json(response.data);
    }

  } catch (error: any) {
    const errorData = error.response?.data;
    console.error("Jimeng/Volcengine API Error:", {
      message: error.message,
      status: error.response?.status,
      data: errorData,
      requestBody: req.body // Log the request payload for debugging
    });
    res.status(500).json({ error: errorData || error.message || "Internal Server Error" });
  }
});

// Gemini AI 生成接口
apiRouter.post("/gemini/generate", async (req, res) => {
  try {
    // 如果没有配置 GEMINI_API_KEY 或者 Gemini 额度超限，使用 DeepSeek 作为备选方案生成 Prompt
    const useDeepSeekForPrompt = true;

    if (useDeepSeekForPrompt) {
      const { prompt, image_data } = req.body;
      
      const deepseekPrompt = `我有一张照片，我想基于它生成一张春节祝福卡。
      请描述这张照片的内容（虽然你看不到，但假设它是一个人的肖像），并结合以下用户提示词生成一个绘画 Prompt。
      用户提示词：${prompt}
      
      请直接输出英文的绘画 Prompt，包含画面描述、风格（如中国风、喜庆、插画风格）、光影效果等。
      不要输出任何解释性文字。`;

      const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "你是一个专业的 AI 绘画 Prompt 生成助手。" },
            { role: "user", content: deepseekPrompt }
          ],
          stream: false,
          temperature: 0.7,
          max_tokens: 200
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
          },
          timeout: 10000
        }
      );

      const generatedPrompt = response.data.choices[0].message.content.trim();
      
      // 关键修复：返回的数据结构必须与前端预期一致
      // 前端 Home.tsx 中期望 res.data.text 或 res.data
      // 这里我们返回 text 字段
      console.log("✅ DeepSeek 生成 Prompt 成功:", generatedPrompt);
      res.json({ text: generatedPrompt });
      return;
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DeepSeek 生成祝福语接口
apiRouter.post("/deepseek/chat", async (req, res) => {
  try {
    if (!DEEPSEEK_API_KEY) {
      console.error("DeepSeek API Key missing");
      throw new Error("DEEPSEEK_API_KEY 未配置");
    }
    
    // Log for debugging
    console.log("DeepSeek API Key configured (length):", DEEPSEEK_API_KEY.length);
    console.log("DeepSeek API Requesting category:", req.body.category);

    const { category } = req.body;

    // 尝试不同的 DeepSeek 模型
    // V3 是 deepseek-chat, R1 是 deepseek-reasoner
    // 如果 deepseek-chat 不稳定，可以尝试切换模型或者增加超时
    const model = "deepseek-chat"; 

    // 增加明确的引导和示例，避免 DeepSeek 拒绝回答或输出格式错误
    const prompt = `请直接生成一个春节祝福语，类别为"${category}"。
    严格要求：
    1. 总字数必须在8到16个汉字之间（含空格）。
    2. 必须是双数字数。
    3. 格式必须是两个对称的短语，中间用空格隔开。
    4. 只需要返回祝福语文本，绝对不要包含任何解释、前缀、后缀、标点符号或引号。
    
    正确示例：
    新年快乐 万事如意
    身体健康 龙马精神
    财源广进 恭喜发财`;

    const response = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: model,
        messages: [
          { role: "system", content: "你是一个精通中国传统文化的祝福语生成助手。" },
          { role: "user", content: prompt }
        ],
        stream: false,
        temperature: 1.0,
        max_tokens: 50 // 限制回复长度，避免超时
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 10000 // 10秒超时
      }
    );

    const content = response.data.choices[0].message.content.trim();
    // 简单的后处理，去除可能存在的引号
    const cleanContent = content.replace(/["'“”]/g, "").trim();
    
    res.json({ text: cleanContent });

  } catch (error: any) {
    console.error("DeepSeek API error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || error.message });
  }
});

// 查询任务结果接口
apiRouter.post("/jimeng/query", async (req, res) => {
    try {
      checkVolcKeys();
      const { task_id, req_key = "jimeng_t2i_v40" } = req.body;
  
      const query = {
        Action: "CVSync2AsyncGetResult",
        Version: "2022-08-31",
      };

      const body = {
        task_id,
        req_key,
      };
  
      const requestObj = {
        method: 'POST',
        region: REGION,
        pathname: '/',
        params: query,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      };
  
      const signer = new Signer(requestObj, SERVICE);
      signer.addAuthorization({
        accessKeyId: ACCESS_KEY_ID!,
        secretKey: SECRET_ACCESS_KEY!,
      });
  
      const url = `https://${HOST}/?Action=${query.Action}&Version=${query.Version}`;
      
      const response = await axios({
          method: requestObj.method,
          url,
          headers: requestObj.headers,
          data: requestObj.body,
      });
  
      res.json(response.data);
  
    } catch (error: any) {
      const errorData = error.response?.data;
      res.status(500).json({ error: errorData || error.message || "Internal Server Error" });
    }
});

// 将 Router 挂载到 /api 和 / 两个路径，以确保兼容性
app.use("/api", apiRouter);
app.use("/", apiRouter);

export default app;
