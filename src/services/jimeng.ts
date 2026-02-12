import axios from "axios";

const API_BASE_URL = "/api/jimeng";
const UPLOAD_URL = "/api/upload";

export interface SubmitTaskResponse {
  code: number;
  message: string;
  request_id: string;
  data: any;
  Result?: any;
  ResponseMetadata?: any;
}

export interface QueryTaskResponse {
  code: number;
  message: string;
  request_id: string;
  data: any;
  Result?: any;
  ResponseMetadata?: any;
}

export async function uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // 去掉 data:image/xxx;base64, 前缀
      const base64Content = base64.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function submitTask(
  prompt: string,
  imageUrls: string[] = [],
  scale = 0.65,
  model = "jimeng_t2i_v40"
): Promise<string> {
  // 判断传入的是 URL 还是 Base64 (这里我们约定前端统一转 base64 传给后端)
  const isBase64 = imageUrls.length > 0 && !imageUrls[0].startsWith('http');

  const payload: any = {
    req_key: model,
    prompt,
    binary_data_base64: isBase64 ? imageUrls : undefined,
    image_urls: !isBase64 ? imageUrls : undefined,
    scale,
  };

  // 针对 Doubao-Seedream-4.5 (即 high_aes_general_v20) 需要添加特殊参数
  // 注意：文档中提到的 "doubao-seedream-4.5" 对应的 req_key 通常是 high_aes_general_v20 或 high_aes_general_v21_L
  // 如果用户明确指定了 doubao-seedream-4.5，我们这里做一个映射，或者直接透传
  // 为了安全起见，我们增加 sequential_image_generation 参数
  if (model.includes("high_aes") || model === "doubao-seedream-4.5") {
    // 强制将模型名称映射为官方 API 实际接受的 req_key
    // 根据火山引擎文档，doubao-seedream-4.5 对应的 req_key 应该是 high_aes_general_v21_L
    payload.req_key = "high_aes_general_v21_L"; 
    payload.sequential_image_generation = "disabled"; // 生成单图
  } else {
    // 旧版参数
    payload.force_single = true;
  }

  const res = await axios.post<SubmitTaskResponse>(`${API_BASE_URL}/submit`, payload);

  const taskId = res.data.data?.id || res.data.data?.task_id || res.data.Result?.TaskId;
  
  if (!taskId) {
    console.error("Full API Response:", res.data);
    throw new Error("接口未返回有效的任务 ID");
  }

  return taskId;
}

export async function queryTask(taskId: string, model = "jimeng_t2i_v40"): Promise<string | null> {
  // 如果是 doubao-4.5，查询时也要用对应的 req_key
  const reqKey = (model === "doubao-seedream-4.5") ? "high_aes_general_v21_L" : model;

  const res = await axios.post<QueryTaskResponse>(`${API_BASE_URL}/query`, {
    task_id: taskId,
    req_key: reqKey,
  });

  // 兼容不同的成功码或返回结构
  const data = res.data.data || res.data.Result;
  const status = data?.status || data?.Status;
  
  // 兼容不同的结果字段名
  const results = data?.results || data?.Results || data?.BinaryData || data?.binary_data_base64;

  if (status === "succeeded" || status === "Success" || status === "done") {
    if (results && results.length > 0) {
      const firstResult = results[0];
      
      // 如果是 base64 字符串（不包含 data: 前缀）
      if (typeof firstResult === 'string' && !firstResult.startsWith('http') && !firstResult.startsWith('data:')) {
        return `data:image/png;base64,${firstResult}`;
      }
      
      // 如果是 URL 字符串或已带前缀的 base64
      return typeof firstResult === 'string' ? firstResult : firstResult.url;
    }
  }

  if (status === "failed" || status === "Failed") {
    throw new Error("任务生成失败");
  }

  return null; // 继续轮询
}

// 轮询工具函数
export async function pollTaskResult(taskId: string, timeoutMs = 120000, model = "jimeng_t2i_v40"): Promise<string> {
  const startTime = Date.now();
  let retryCount = 0;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const url = await queryTask(taskId, model);
      if (url) return url;
      
      // 如果没有报错但也没拿到 URL，说明还在生成中
      await new Promise((resolve) => setTimeout(resolve, 3000)); // 稍微拉长轮询间隔，减少请求频率
    } catch (err) {
      console.warn("轮询中遇到临时错误，正在重试...", err);
      retryCount++;
      if (retryCount > 5) throw err; // 连续报错 5 次才彻底放弃
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  throw new Error("AI 还在努力创作中，请稍后重试或尝试更换一张照片。");
}
