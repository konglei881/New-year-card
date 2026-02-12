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

const SCALE_FACTOR = 4;
const BASE_W = 288 * SCALE_FACTOR;
const BASE_H = 490 * SCALE_FACTOR;
const OUT_W = 288 * SCALE_FACTOR;
const OUT_H = 490 * SCALE_FACTOR;

type ImageAsset = {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type CardConfig = {
  bgColor: string;
  photoRect: { x: number; y: number; width: number; height: number; color: string };
  assets: ImageAsset[];
};

const cardConfigs: Record<Exclude<BlessingType, "">, CardConfig> = {
  xueye: {
    bgColor: "#8aa8ff",
    photoRect: { x: 51, y: 111, width: 190, height: 190, color: "#f1f333" },
    assets: [
      { url: "/templates/assets/mljfqlp8-kzp9b82.svg", x: 170, y: 10, width: 147, height: 139 }, // Cap2
      { url: "/templates/assets/mljfqlp8-ct2g5wo.svg", x: 232, y: 191, width: 30, height: 30 }, // Sparkle
      { url: "/templates/assets/mljfqlp8-d1maust.svg", x: -16, y: 255, width: 79, height: 73 }, // Cap5
      { url: "/templates/assets/mljfqlp8-l03sgls.svg", x: 14, y: 431, width: 47, height: 47 }, // Sparkle Bottom
    ],
  },
  jiankang: {
    bgColor: "#08c3b1",
    photoRect: { x: 51, y: 111, width: 190, height: 190, color: "#ff90de" },
    assets: [
      { url: "/templates/assets/mljfqlqx-d677zhw.svg", x: 17, y: 95, width: 28, height: 28 }, // Sparkle Top
      { url: "/templates/assets/mljfqlqx-qsgfi1j.svg", x: 1, y: 218, width: 34, height: 63 }, // Vector Left
      { url: "/templates/assets/mljfqlqx-64cz5uo.svg", x: -1, y: 263, width: 77, height: 74 }, // Group Left Bottom
      { url: "/templates/assets/mljfqlqx-ni3km9o.png", x: 166, y: 45, width: 128, height: 89 }, // Sticker Comedy
      { url: "/templates/assets/mljfqlqx-1nli1kx.svg", x: 244, y: 244, width: 38, height: 38 }, // Sparkle Right
    ],
  },
  aiqing: {
    bgColor: "#ffd000",
    photoRect: { x: 51, y: 111, width: 190, height: 190, color: "#08c3b1" },
    assets: [
      { url: "/templates/assets/mljfqlon-xkxfjyc.svg", x: 177, y: 25, width: 123, height: 117 }, // Group2 Top Right
      { url: "/templates/assets/mljfqlon-cc89dks.png", x: 238, y: 227, width: 76, height: 36 }, // Coin
      { url: "/templates/assets/mljfqlon-yn889a1.svg", x: -14, y: 282, width: 68, height: 73 }, // Group3 Bottom Left
      { url: "/templates/assets/mljfqlon-k6fqvd5.svg", x: 144, y: 64, width: 38, height: 38 }, // Sparkle
      { url: "/templates/assets/mljfqlon-pzsvbkn.svg", x: 230, y: 431, width: 51, height: 51 }, // Sparkle Bottom Right
    ],
  },
  caiyun: {
    bgColor: "#ff90de",
    photoRect: { x: 50, y: 111, width: 190, height: 190, color: "#90a8ed" },
    assets: [
      { url: "/templates/assets/mljfqloz-471ezfm.svg", x: 183, y: 35, width: 66, height: 64 }, // Top Right Group
      { url: "/templates/assets/mljfqloz-5xpwrp3.svg", x: 9, y: 177, width: 37, height: 38 }, // Left Group
      { url: "/templates/assets/mljfqloz-ln4fpne.svg", x: 217, y: 228, width: 35, height: 34 }, // Photo Group Right
      { url: "/templates/assets/mljfqloz-k0qvycq.svg", x: 15, y: 263, width: 57, height: 55 }, // Photo Group Left Bottom
      { url: "/templates/assets/mljfqloz-1kyfozi.svg", x: 244, y: 127, width: 30, height: 30 }, // Right Group (Approx Y)
      { url: "/templates/assets/mljfqloz-oam48s2.svg", x: 197, y: 414, width: 95, height: 109 }, // Bottom Right Coin
    ],
  },
};

const avatarRectByType: Record<Exclude<BlessingType, "">, { x: number; y: number; width: number; height: number }> = {
  caiyun: { x: 50 * SCALE_FACTOR, y: 111 * SCALE_FACTOR, width: 190 * SCALE_FACTOR, height: 190 * SCALE_FACTOR },
  aiqing: { x: 51 * SCALE_FACTOR, y: 111 * SCALE_FACTOR, width: 190 * SCALE_FACTOR, height: 190 * SCALE_FACTOR },
  jiankang: { x: 51 * SCALE_FACTOR, y: 111 * SCALE_FACTOR, width: 190 * SCALE_FACTOR, height: 190 * SCALE_FACTOR },
  xueye: { x: 51 * SCALE_FACTOR, y: 111 * SCALE_FACTOR, width: 190 * SCALE_FACTOR, height: 190 * SCALE_FACTOR },
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
  drawRoundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, 16 * SCALE_FACTOR);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  // 绘制描边 (Stroke)
  ctx.save();
  ctx.lineWidth = 2 * SCALE_FACTOR;
  ctx.strokeStyle = "#000000";
  drawRoundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, 16 * SCALE_FACTOR);
  ctx.stroke();
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
  const fontSize = 32 * SCALE_FACTOR;
  const lineHeight = 44 * SCALE_FACTOR;
  const color = "#000000";
  const fontFamily = '"PingFang SC", sans-serif';
  const maxWidth = 160 * SCALE_FACTOR; // 固定宽度 160px

  ctx.textAlign = "left";
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

  // 3. 渲染最终行（限制最多显示 2 行以防溢出布局）
  const displayLines = finalLines.slice(0, 2);
  const startX = 24 * SCALE_FACTOR; // 左边距 24px
  const startY = 340 * SCALE_FACTOR; // 顶部距离 340px

  displayLines.forEach((line, index) => {
    ctx.fillText(line, startX, startY + index * lineHeight);
  });
}

// 保持本地渲染逻辑作为基础，但不再导出，或作为 fallback
// 这里我们修改 renderBlessingCard 为 AI 生成逻辑
// 如果需要保留本地渲染，可以改名为 renderBlessingCardLocal

async function drawCardBackground(ctx: CanvasRenderingContext2D, type: Exclude<BlessingType, "">) {
  const config = cardConfigs[type];
  
  // 1. Fill BG
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // 2. Draw Text "2026"
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000000";
  // "Katibeh" fallback to serif
  ctx.font = `normal ${69 * SCALE_FACTOR}px "Katibeh", "Times New Roman", serif`;
  ctx.fillText("2026", 24 * SCALE_FACTOR, 27 * SCALE_FACTOR);

  // 3. Draw Text "Happy New Year"
  ctx.font = `normal ${14 * SCALE_FACTOR}px "Karla", "Arial", sans-serif`;
  ctx.fillText("Happy New Year", 24 * SCALE_FACTOR, (27 + 44) * SCALE_FACTOR);

  // 4. Draw Assets
  for (const asset of config.assets) {
    const img = await loadImageFromUrl(asset.url);
    ctx.drawImage(
      img, 
      asset.x * SCALE_FACTOR, 
      asset.y * SCALE_FACTOR, 
      asset.width * SCALE_FACTOR, 
      asset.height * SCALE_FACTOR
    );
  }

  // 5. Draw Photo BG Rect (Behind avatar)
  const pRect = config.photoRect;
  ctx.save();
  ctx.fillStyle = pRect.color;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2 * SCALE_FACTOR;
  
  drawRoundedRectPath(
      ctx, 
      pRect.x * SCALE_FACTOR, 
      pRect.y * SCALE_FACTOR, 
      pRect.width * SCALE_FACTOR, 
      pRect.height * SCALE_FACTOR, 
      16 * SCALE_FACTOR
  );
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

async function renderBlessingCardLocal(input: RenderInput): Promise<RenderOutput> {
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = BASE_W;
  baseCanvas.height = BASE_H;
  const baseCtx = baseCanvas.getContext("2d");
  if (!baseCtx) throw new Error("Canvas 初始化失败");

  await drawCardBackground(baseCtx, input.blessingType);

  const avatar = await loadImageFromFile(input.avatarFile);
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
export async function renderBlessingCard(
  input: RenderInput,
  useAI = true,
  aiProvider: 'jimeng' | 'gemini' | 'doubao-4.5' = 'jimeng'
): Promise<RenderOutput> {
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
      // 区分模型
      let model = "jimeng_t2i_v40"; // 默认即梦4.0
      if (aiProvider === 'doubao-4.5') {
        model = "doubao-seedream-4.5";
      }

      // 将 scale 降低到 0.6，增加对原图（面部和服装）的保留程度，同时利用提示词引导风格化
      const taskId = await submitTask(prompt, [imageUrl], 0.6, model);

      // 5. 轮询结果
      resultUrl = await pollTaskResult(taskId, 120000, model);
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

  // 绘制背景模板 (Now vectors!)
  await drawCardBackground(baseCtx, blessingType);

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
