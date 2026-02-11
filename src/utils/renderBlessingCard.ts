import type { BlessingType, Gender } from "@/stores/blessingCardStore";
import { loadImageFromFile, loadImageFromUrl, resizeImage } from "@/utils/image";
import { uploadImage, submitTask, pollTaskResult } from "@/services/jimeng";
import { generateWithGemini } from "@/services/gemini";

type RenderInput = {
  gender: Exclude<Gender, "">;
  blessingType: Exclude<BlessingType, "">;
  blessing: string;
  avatarFile: File;
};

type RenderOutput = {
  main: Blob;
  sub: Blob;
  stylizedAvatar?: HTMLImageElement; // 新增：返回 AI 生成的原始头像对象
};

const BASE_W = 864;
const BASE_H = 1416;
const OUT_W = 500;
const OUT_H = 750;

const templateUrlByType: Record<Exclude<BlessingType, "">, string> = {
  caiyun: "/templates/template-caiyun-3x.png",
  aiqing: "/templates/template-aiqing-3x.png",
  jiankang: "/templates/template-jiankang-3x.png",
};

const avatarRectByType: Record<Exclude<BlessingType, "">, { x: number; y: number; width: number; height: number }> = {
  caiyun: { x: 72, y: 267, width: 720, height: 648 },
  aiqing: { x: 72, y: 267, width: 720, height: 648 },
  jiankang: { x: 72, y: 267, width: 720, height: 648 },
};

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) return reject(new Error("导出失败"));
      resolve(b);
    }, "image/png");
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawAvatarCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  rect: { x: number; y: number; width: number; height: number }
) {
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  const scale = Math.max(rect.width / sw, rect.height / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = rect.x + (rect.width - dw) / 2;
  const dy = rect.y + (rect.height - dh) / 2;

  ctx.save();
  drawRoundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, 48);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function splitBlessingLines(text: string, maxPerLine: number) {
  const chars = Array.from(text);
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += maxPerLine) {
    lines.push(chars.slice(i, i + maxPerLine).join(""));
  }
  return lines;
}

function splitBlessingLinesWithBreaks(text: string, maxPerLine: number, maxLines: number) {
  const rawLines = text.split(/\r?\n/);
  const lines: string[] = [];
  rawLines.forEach((raw) => {
    if (raw === "") {
      lines.push("");
      return;
    }
    splitBlessingLines(raw, maxPerLine).forEach((line) => lines.push(line));
  });
  return lines.slice(0, maxLines);
}

// 绘制祝福文字逻辑
function drawBlessingText(ctx: CanvasRenderingContext2D, text: string) {
  // 基础配置
  const fontSize = 96; // 32px * 3 (scale)
  const lineHeight = 120; // 40px * 3 (scale)
  const color = "#000000";
  const fontFamily = '"PingFang SC", sans-serif';
  const maxWidth = BASE_W - (24 * 2) * 3; // 两侧各留 24px (换算为 Canvas 像素为 72px)

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  ctx.font = `normal ${fontSize}px ${fontFamily}`;

  // 1. 先按用户输入（空格或回车）进行初步分割
  const manualLines = text.split(/[\n ]/).filter(line => line.length > 0);
  const finalLines: string[] = [];

  // 2. 对每一部分进行自动换行计算
  manualLines.forEach(segment => {
    let currentLine = "";
    for (let i = 0; i < segment.length; i++) {
      const char = segment[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine.length > 0) {
        finalLines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      finalLines.push(currentLine);
    }
  });

  // 3. 渲染最终行（限制最多显示 3 行以防溢出布局）
  const displayLines = finalLines.slice(0, 3);
  const startX = BASE_W / 2;
  const startY = 969;

  displayLines.forEach((line, index) => {
    ctx.fillText(line, startX, startY + index * lineHeight);
  });
}

// 保持本地渲染逻辑作为基础，但不再导出，或作为 fallback
// 这里我们修改 renderBlessingCard 为 AI 生成逻辑
// 如果需要保留本地渲染，可以改名为 renderBlessingCardLocal

async function renderBlessingCardLocal(input: RenderInput): Promise<RenderOutput> {
  const templateUrl = templateUrlByType[input.blessingType];
  const [template, avatar] = await Promise.all([
    loadImageFromUrl(templateUrl),
    loadImageFromFile(input.avatarFile),
  ]);

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = BASE_W;
  baseCanvas.height = BASE_H;
  const baseCtx = baseCanvas.getContext("2d");
  if (!baseCtx) throw new Error("Canvas 初始化失败");

  baseCtx.clearRect(0, 0, BASE_W, BASE_H);
  baseCtx.drawImage(template, 0, 0, BASE_W, BASE_H);

  const rect = avatarRectByType[input.blessingType];
  drawAvatarCover(baseCtx, avatar, rect);
  drawBlessingText(baseCtx, input.blessing);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = OUT_W;
  outCanvas.height = OUT_H;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("Canvas 初始化失败");
  outCtx.clearRect(0, 0, OUT_W, OUT_H);
  drawCoverTop(outCtx, baseCanvas, BASE_W, BASE_H, OUT_W, OUT_H);

  const subCanvas = document.createElement("canvas");
  subCanvas.width = Math.floor(OUT_W / 2);
  subCanvas.height = Math.floor(OUT_H / 2);
  const subCtx = subCanvas.getContext("2d");
  if (!subCtx) throw new Error("Canvas 初始化失败");
  subCtx.drawImage(outCanvas, 0, 0, subCanvas.width, subCanvas.height);

  const [main, sub] = await Promise.all([canvasToBlob(outCanvas), canvasToBlob(subCanvas)]);
  return { main, sub };
}

// AI 生成逻辑
export async function renderBlessingCard(input: RenderInput, useAI = true, aiProvider: 'jimeng' | 'gemini' = 'jimeng'): Promise<RenderOutput> {
  // 暂时保留本地生成开关，或者如果 AI 失败降级到本地
  if (!useAI) {
    const res = await renderBlessingCardLocal(input);
    return res;
  }

  try {
    let resultUrl = "";

    if (aiProvider === 'gemini') {
      // ... (省略 Gemini 逻辑)
      const prompt = `Convert the person in this photo into a stylized 2D cartoon character for Chinese New Year.
      Style: (2D flat vector illustration), (bold clean outlines), (high quality anime art).
      Character: ${input.gender === "female" ? "cute girl" : "handsome boy"}, wearing red traditional Chinese festive outfit.
      Technical: Masterpiece, vivid colors, professional character design, maintain original facial features and expression but in cartoon form.
      Avoid: 3D render, realistic texture, complex shading.`;

      resultUrl = await generateWithGemini(prompt, input.avatarFile);
    } else {
      // 原有的即梦 AI 逻辑
      // 1. 预处理图片：缩放尺寸，避免 AI 接口由于图片分辨率过高而报错
      const resizedBlob = await resizeImage(input.avatarFile, 1024);
      const resizedFile = new File([resizedBlob], input.avatarFile.name, { type: input.avatarFile.type });

      // 2. 上传图片获取 URL
      const imageUrl = await uploadImage(resizedFile);
      
      // 3. 构造 AI 提示词 (优化：保持服装一致，提升面部相似度)
      const prompt = `(2D vector art:1.2), (flat illustration:1.2), (clean anime style:1.1), character portrait, ${input.gender === "female" ? "cute girl" : "handsome boy"}, (keep original clothes and outfit:1.5), (maintain highly detailed facial features and facial proportions of the original person:1.8), simple clean lines, high saturation colors, bold outlines, masterpiece, high quality, professional character design, no shading, no 3D render`;
      
      // 4. 提交任务
      // 将 scale 降低到 0.6，增加对原图（面部和服装）的保留程度，同时利用提示词引导风格化
      const taskId = await submitTask(prompt, [imageUrl], 0.6);

      // 5. 轮询结果
      resultUrl = await pollTaskResult(taskId);
    }

    // 6. 下载 AI 生成的卡通图像
    const stylizedAvatar = await loadImageFromUrl(resultUrl);
    
    // 6. 最终合成：将卡通人物放进模板
    const { main, sub } = await combineTemplate(input.blessingType, input.blessing, stylizedAvatar);
    return { main, sub, stylizedAvatar };

  } catch (error: any) {
    console.error("AI 生成详细错误:", error);
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
    throw new Error(`AI 生成失败: ${errorMessage}`);
  }
}

/**
 * 专门用于将已生成的卡通头像与模板及文字合成的函数
 * 这样修改祝福语时可以只调用这个，而不需要重新跑 AI
 */
export async function combineTemplate(
  blessingType: Exclude<BlessingType, "">,
  blessing: string,
  stylizedAvatar: HTMLImageElement
): Promise<RenderOutput> {
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = BASE_W;
  baseCanvas.height = BASE_H;
  const baseCtx = baseCanvas.getContext("2d");
  if (!baseCtx) throw new Error("Canvas 初始化失败");

  // 绘制背景模板
  const templateUrl = templateUrlByType[blessingType];
  const template = await loadImageFromUrl(templateUrl);
  baseCtx.drawImage(template, 0, 0, BASE_W, BASE_H);

  // 在“照片区”绘制卡通人物
  const rect = avatarRectByType[blessingType];
  drawAvatarCover(baseCtx, stylizedAvatar, rect);
  
  // 绘制祝福语
  drawBlessingText(baseCtx, blessing);

  // 输出主图和副图
  const outCanvas = document.createElement("canvas");
  outCanvas.width = OUT_W;
  outCanvas.height = OUT_H;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("Canvas 初始化失败");
  drawCoverTop(outCtx, baseCanvas, BASE_W, BASE_H, OUT_W, OUT_H);

  const subCanvas = document.createElement("canvas");
  subCanvas.width = Math.floor(OUT_W / 2);
  subCanvas.height = Math.floor(OUT_H / 2);
  const subCtx = subCanvas.getContext("2d");
  if (!subCtx) throw new Error("Canvas 初始化失败");
  subCtx.drawImage(outCanvas, 0, 0, subCanvas.width, subCanvas.height);

  const [main, sub] = await Promise.all([canvasToBlob(outCanvas), canvasToBlob(subCanvas)]);
  return { main, sub };
}

function drawCoverTop(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
) {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const dx = (dstW - drawW) / 2;
  const dy = 0;
  ctx.drawImage(source, dx, dy, drawW, drawH);
}
