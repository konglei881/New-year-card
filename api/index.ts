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
      // 或者依然是 ark.cn-beijing.volces.com 但在 path 或 header 中指定 endpoint
      // 根据最新的 Ark 文档，在线推理 endpoint 调用通常是: https://<endpoint_id>.ark.cn-beijing.volces.com/api/v3/images/generations
      if (endpointId) {
        arkHost = `${endpointId}.ark.cn-beijing.volces.com`;
      }
      
      const arkPath = "/api/v3/images/generations";
      const arkService = "ark";
      const arkRegion = "cn-beijing";

      // 构造 Ark 格式的 Payload
      const arkBody: any = {
        // 如果使用了 Endpoint 域名，model 参数通常会被忽略或者需要匹配模型名称
        // 这里保留 doubao-seedream-4.5 或者使用 endpointId
        model: endpointId || "doubao-seedream-4.5", 
        prompt: prompt,
        // size: "1024x1024",  // Seedream 4.5 可能对 size 格式有特殊要求，或者某些 endpoint 不支持该参数，暂时注释掉以使用默认值
        // 移除 return_url 参数，因为它可能导致 400 错误
        // return_url: true, 
      };

      // 处理图片输入
      // 如果是 Base64，Ark 通常需要 Data URI 格式
      if (binary_data_base64 && binary_data_base64.length > 0) {
        arkBody.image_url = `data:image/png;base64,${binary_data_base64[0]}`;
      } else if (image_urls && image_urls.length > 0) {
        arkBody.image_url = image_urls[0];
      }

      // Vercel Edge/Serverless 环境下，axios 可能会有一些兼容性问题，
      // 这里使用更底层的 fetch 或者确保 header 正确。
      // 最关键的是 Signer 签名必须正确。
      const arkRequestObj = {
        method: 'POST',
        region: arkRegion,
        pathname: arkPath,
        headers: {
          'Content-Type': 'application/json',
          // 必须移除 Host header，让 axios/fetch 自动处理，否则可能导致签名错误或 400/401
        } as any,
        body: JSON.stringify(arkBody),
      };

      // 优先使用 ARK_API_KEY (Bearer Token)，如果没有则尝试 AK/SK 签名 (Signer)
      // 注意：Ark 的 OpenAI 兼容接口 (/api/v3/...) 通常推荐使用 API Key
      if (ARK_API_KEY) {
        console.log("Using ARK_API_KEY for authentication...");
        arkRequestObj.headers['Authorization'] = `Bearer ${ARK_API_KEY}`;
        // 使用 API Key 时，不需要 Signer 签名，直接发送请求即可
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
        headers: arkRequestObj.headers, // 这里包含了 Signer 添加的 Header 或者 Authorization Header
        data: arkRequestObj.body,
        validateStatus: () => true, // 不要在 4xx/5xx 时抛出异常，让我们自己处理
      });

      if (arkResponse.status !== 200) {
        console.error("Ark API Error:", arkResponse.data);
        throw new Error(`Ark API Error: ${arkResponse.status} - ${JSON.stringify(arkResponse.data)}`);
      }

      // 转换 Ark 响应格式为前端兼容的格式
      // Ark Response: { data: [{ url: "...", ... }], created: ... }
      // Frontend expects: { data: { status: "succeeded", results: [{ url: "..." }] } }
      // 注意：Ark 返回的 URL 可能非常长，或者直接返回 base64 数据
      const arkData = arkResponse.data;
      if (arkData.data && arkData.data.length > 0) {
        // 由于 Vercel Serverless Function 对响应体大小有限制（通常为 4.5MB），
        // 如果 Ark 返回的是 Base64 数据且过大，这里直接返回可能会再次触发 413 或 500 错误。
        // 但是，如果前端使用的是 URL 模式，这里应该是 URL。
        
        const imageUrl = arkData.data[0].url || arkData.data[0].image_url;
        
        // 安全起见，如果 URL 非常长（可能是 Base64），我们尽量缩减返回体
        // 这里我们构造一个伪造的 task_id 返回给前端，前端会解析它
        // Encode URL to safe string
        const fakeTaskId = `DIRECT_URL:${Buffer.from(imageUrl).toString('base64')}`;
        
        // 关键修复：不要直接返回 res.json()，这会自动设置 Content-Type 并发送。
        // 如果 Vercel 或 Express 已经在前面的步骤中尝试发送了部分响应（虽然不太可能），会报错。
        // 但这里的报错是 'Cannot set headers after they are sent to the client'，
        // 通常意味着 res.json() 被调用了两次，或者在 res.json() 之后代码继续执行了。
        // 我们在下面有 `return;`，理论上不会继续。
        // 检查 catch 块是否被触发了？或者 validateStatus 导致的？
        
        // 另外，如果 response body 太大，Vercel 可能会截断或报错。
        // 让我们只返回最核心的数据。
        
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
    if (!genAI) throw new Error("GEMINI_API_KEY 未配置");

    const { prompt, image_data } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: image_data,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const response = await result.response;
    res.json({ text: response.text(), data: response });

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
