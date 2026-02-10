import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
// @ts-ignore
import { Signer } from "@volcengine/openapi";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Gemini AI 初始化
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// 环境变量配置
const ACCESS_KEY_ID = process.env.VOLC_ACCESS_KEY_ID?.trim();
const SECRET_ACCESS_KEY = process.env.VOLC_SECRET_ACCESS_KEY?.trim();
const REGION = (process.env.VOLC_REGION || "cn-north-1").trim();
const SERVICE = (process.env.VOLC_SERVICE || "cv").trim();
const HOST = "visual.volcengineapi.com";

// 根路由
app.get("/api", (req, res) => {
  res.send("🚀 春节祝福卡 API 已就绪！");
});

// 上传接口 - Vercel 环境下直接返回 base64 或透传
app.post("/api/upload", (req, res) => {
  // 在 Vercel 环境下，我们不建议保存文件到磁盘
  // 建议前端直接处理图片为 Base64
  res.json({ message: "Please use base64 in frontend" });
});

// 提交任务接口
app.post("/api/jimeng/submit", async (req, res) => {
  try {
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

// Gemini AI 生成接口
app.post("/api/gemini/generate", async (req, res) => {
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

export default app;
