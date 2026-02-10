import axios from "axios";

const API_BASE_URL = "/api/gemini";

export interface GeminiResponse {
  text: string;
  data: any;
}

export async function generateWithGemini(prompt: string, imageFile: File): Promise<string> {
  // 1. 将文件转换为 Base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 去掉 data:image/jpeg;base64, 前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });

  // 2. 发送请求到后端
  const res = await axios.post<GeminiResponse>(`${API_BASE_URL}/generate`, {
    prompt,
    image_data: base64Data
  });

  // 3. 处理返回结果
  // 如果 Gemini 返回的是生成的图像数据（在某些版本中通过 candidates 返回）
  const candidates = res.data.data?.candidates;
  if (candidates && candidates[0]?.content?.parts) {
    const parts = candidates[0].content.parts;
    const imagePart = parts.find((p: any) => p.inlineData || p.fileData);
    if (imagePart) {
      // 如果直接返回了图像数据
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
  }

  // 如果没有直接返回图片，可能是返回了 URL 或其他描述
  // 这里需要根据 Gemini 2.0 的具体返回格式进行调整
  // 目前 Gemini 2.0 在 Google AI Studio 中生成的图片可能需要特定的处理逻辑
  throw new Error("Gemini 未能生成有效的图像结果，请检查 Prompt 或模型配置。");
}
