import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
// @ts-ignore
import { Signer } from "@volcengine/openapi";
import axios from "axios";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Gemini AI 初始化
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// 静态文件服务
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");

// 确保上传目录存在
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use("/uploads", express.static(uploadsDir));

// 根路由，用于检查后端状态
app.get("/", (req, res) => {
  res.send("🚀 春节祝福卡后端服务已启动！API 运行正常。请访问前端端口 (通常是 5173) 使用功能。");
});

// 配置 multer 上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

const ACCESS_KEY_ID = process.env.VOLC_ACCESS_KEY_ID?.trim();
const SECRET_ACCESS_KEY = process.env.VOLC_SECRET_ACCESS_KEY?.trim();
const REGION = (process.env.VOLC_REGION || "cn-north-1").trim();
const SERVICE = (process.env.VOLC_SERVICE || "cv").trim();
const HOST = "visual.volcengineapi.com";

if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error("❌ 错误: 请在 .env 文件中配置 VOLC_ACCESS_KEY_ID 和 VOLC_SECRET_ACCESS_KEY");
  process.exit(1);
}

console.log(`✅ 已加载 AK: ${ACCESS_KEY_ID.substring(0, 8)}...`);
console.log(`✅ 已加载 Region: ${REGION}`);

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// DeepSeek 生成祝福语接口
app.post("/api/deepseek/chat", async (req, res) => {
  try {
    if (!DEEPSEEK_API_KEY) {
      console.error("DeepSeek API Key missing in server.ts");
      throw new Error("DEEPSEEK_API_KEY 未配置");
    }
    
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
    
    console.log("DeepSeek Response:", cleanContent);
    res.json({ text: cleanContent });

  } catch (error: any) {
    console.error("DeepSeek API error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || error.message });
  }
});

// 上传接口
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const fileUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// 提交任务接口
app.post("/api/jimeng/submit", async (req, res) => {
  try {
    const { prompt, req_key = "jimeng_t2i_v40", image_urls, ...rest } = req.body;

    const query = {
      Action: "CVSync2AsyncSubmitTask",
      Version: "2022-08-31",
    };

    // 处理本地图片地址问题
    let binary_data_base64 = [];

    if (image_urls && image_urls.length > 0) {
      for (const url of image_urls) {
        if (url.includes("localhost") || url.includes("127.0.0.1")) {
          try {
            const fileName = url.split("/").pop();
            const filePath = path.join(uploadsDir, fileName!);
            if (fs.existsSync(filePath)) {
              const fileBuffer = fs.readFileSync(filePath);
              binary_data_base64.push(fileBuffer.toString("base64"));
              console.log(`📦 已将本地图片转换为 Base64: ${fileName}`);
            }
          } catch (e) {
            console.error("❌ 转换本地图片失败:", e);
          }
        }
      }
    }

    const body: any = {
      req_key,
      prompt,
      ...rest,
    };

    if (binary_data_base64.length > 0) {
      body.binary_data_base64 = binary_data_base64;
    } else {
      body.image_urls = image_urls;
    }

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
      accessKeyId: ACCESS_KEY_ID,
      secretKey: SECRET_ACCESS_KEY,
    });

    // 打印 Authorization 头部，排查非法字符
    const headers = requestObj.headers as any;
    const authHeader = headers['Authorization'] || headers['authorization'];
    console.log("🔑 Authorization Header (partial):", authHeader?.substring(0, 50) + "...");

    const url = `https://${HOST}/?Action=${query.Action}&Version=${query.Version}`;
    
    console.log("🚀 正在提交任务到即梦 AI...");
    const response = await axios({
        method: requestObj.method,
        url,
        headers: requestObj.headers,
        data: requestObj.body,
    });

    // 兼容不同的 ID 返回格式
    const taskId = response.data.data?.id || response.data.data?.task_id || response.data.Result?.TaskId;
    console.log("✅ 任务提交成功，响应内容:", JSON.stringify(response.data));
    console.log("📌 提取到的任务 ID:", taskId);
    
    res.json(response.data);

  } catch (error: any) {
    const errorData = error.response?.data;
    const errorMessage = error.message;
    console.error("❌ API Error (Submit):", JSON.stringify(errorData || errorMessage, null, 2));
    res.status(500).json({ error: errorData || errorMessage || "Internal Server Error" });
  }
});

// Gemini AI 生成接口
app.post("/api/gemini/generate", async (req, res) => {
  try {
    if (!DEEPSEEK_API_KEY) {
      console.error("DeepSeek API Key missing in server.ts");
      throw new Error("DEEPSEEK_API_KEY 未配置");
    }
    
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

    if (!genAI) {
      throw new Error("GEMINI_API_KEY 未配置");
    }

    const { prompt, image_data } = req.body; // image_data 是 base64 字符串

    // 使用 gemini-2.0-flash 模型，它支持多模态输入和图像生成
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
    const text = response.text();
    
    // 注意：Gemini 2.0 Flash 的图像生成结果通常在 candidates 中
    // 如果是直接生成图片，逻辑会有所不同。
    // 目前 Gemini API 的图像生成 (Imagen) 通常返回的是 base64 或 URL
    // 这里我们先假设返回的是处理后的文字描述或尝试获取生成的图像数据
    
    res.json({ text, data: response });

  } catch (error: any) {
    console.error("❌ Gemini API Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 查询任务结果接口
app.post("/api/jimeng/query", async (req, res) => {
    try {
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
        accessKeyId: ACCESS_KEY_ID,
        secretKey: SECRET_ACCESS_KEY,
      });
  
      const url = `https://${HOST}/?Action=${query.Action}&Version=${query.Version}`;
      
      const response = await axios({
          method: requestObj.method,
          url,
          headers: requestObj.headers,
          data: requestObj.body,
      });
  
      console.log("🔍 查询任务结果响应:", JSON.stringify(response.data));
      res.json(response.data);
  
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = error.message;
      console.error("❌ API Error (Query):", JSON.stringify(errorData || errorMessage, null, 2));
      res.status(500).json({ error: errorData || errorMessage || "Internal Server Error" });
    }
  });

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
