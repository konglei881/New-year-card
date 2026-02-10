import { useEffect, useMemo, useState } from "react";
import BlessingCardForm from "@/components/BlessingCardForm";
import BlessingCardPreview from "@/components/BlessingCardPreview";
import { useBlessingCardStore } from "@/stores/blessingCardStore";
import { downloadBlob } from "@/utils/download";
import { renderBlessingCard, combineTemplate } from "@/utils/renderBlessingCard";
import { validateBlessing } from "@/utils/validation";

function formatDateYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export default function Home() {
  const { gender, blessingType, blessing, avatarFile, aiProvider } = useBlessingCardStore();
  const blessingCheck = useMemo(() => validateBlessing(blessing), [blessing]);
  const blessingError = "message" in blessingCheck ? blessingCheck.message : null;

  const [isGenerating, setIsGenerating] = useState(false);
  const [mainUrl, setMainUrl] = useState<string | null>(null);
  const [subUrl, setSubUrl] = useState<string | null>(null);
  const [mainBlob, setMainBlob] = useState<Blob | null>(null);
  const [subBlob, setSubBlob] = useState<Blob | null>(null);
  const [hint, setHint] = useState("请先上传照片，然后输入字幕内容");
  
  // 用于存储 AI 生成的原始人物图像，以便在修改文字时直接复用
  const [stylizedAvatar, setStylizedAvatar] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    return () => {
      if (mainUrl) URL.revokeObjectURL(mainUrl);
      if (subUrl) URL.revokeObjectURL(subUrl);
    };
  }, [mainUrl, subUrl]);

  // 监听祝福语的变化，实时更新预览
  useEffect(() => {
    if (stylizedAvatar && blessingType && !blessingError) {
      updatePreviewWithText();
    }
  }, [blessing, blessingType]);

  async function updatePreviewWithText() {
    if (!stylizedAvatar || !blessingType) return;
    
    try {
      const { main, sub } = await combineTemplate(blessingType, blessing, stylizedAvatar);
      
      if (mainUrl) URL.revokeObjectURL(mainUrl);
      if (subUrl) URL.revokeObjectURL(subUrl);

      const nextMainUrl = URL.createObjectURL(main);
      const nextSubUrl = URL.createObjectURL(sub);
      setMainUrl(nextMainUrl);
      setSubUrl(nextSubUrl);
      setMainBlob(main);
      setSubBlob(sub);
    } catch (err) {
      console.error("实时更新文字失败:", err);
    }
  }

  async function onGenerate() {
    if (!gender) {
      setHint("请选择性别");
      return;
    }
    if (!blessingType) {
      setHint("请选择祝福类型");
      return;
    }
    if (!avatarFile) {
      setHint("请先上传照片");
      return;
    }
    if (blessingError) {
      setHint(blessingError);
      return;
    }

    setIsGenerating(true);
    setHint("正在通过即梦 AI 生成...（约1-3秒）");

    try {
      // 1. 尝试使用即梦 AI 4.0 生成
      const result = await renderBlessingCard({
        gender,
        blessingType,
        blessing: blessingCheck.value,
        avatarFile,
      }, true, 'jimeng');

      handleGenerateSuccess(result);
    } catch (err: any) {
      console.warn("即梦 AI 失败，正在自动切换到 Nano Banana...", err);
      setHint("即梦 AI 繁忙，正在切换到 Nano Banana...（约5-10秒）");
      
      try {
        // 2. 自动降级切换到 Nano Banana (Gemini)
        const result = await renderBlessingCard({
          gender,
          blessingType,
          blessing: blessingCheck.value,
          avatarFile,
        }, true, 'gemini');

        handleGenerateSuccess(result);
      } catch (geminiErr: any) {
        console.error("所有 AI 引擎均失败:", geminiErr);
        setHint(geminiErr.message || "生成失败，请重试或更换图片");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handleGenerateSuccess(result: any) {
    const { main, sub, stylizedAvatar: nextStylizedAvatar } = result;
    
    // 为了实现实时预览，在第一次生成时把 AI 结果存起来
    if (nextStylizedAvatar) {
      setStylizedAvatar(nextStylizedAvatar);
    }

    if (mainUrl) URL.revokeObjectURL(mainUrl);
    if (subUrl) URL.revokeObjectURL(subUrl);

    const nextMainUrl = URL.createObjectURL(main);
    const nextSubUrl = URL.createObjectURL(sub);
    setMainUrl(nextMainUrl);
    setSubUrl(nextSubUrl);
    setMainBlob(main);
    setSubBlob(sub);
    setHint("已生成，可点击保存图片下载");
  }

  function onDownload() {
    if (!blessingType || !gender) {
      setHint("请先选择性别和祝福类型");
      return;
    }
    if (!mainBlob) {
      setHint("请先生成祝福卡");
      return;
    }

    const typeLabel =
      blessingType === "caiyun" ? "财运" : blessingType === "aiqing" ? "爱情" : "健康";
    const genderLabel = gender === "female" ? "女性" : "男性";
    const baseName = `春节祝福卡_${typeLabel}_${genderLabel}_${formatDateYmd(new Date())}`;
    downloadBlob(mainBlob, `${baseName}.png`);

    if (subBlob) {
      setTimeout(() => downloadBlob(subBlob, `${baseName}_副卡.png`), 350);
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-[#FFEFED]">
      <div className="flex h-auto w-full max-w-[1440px] flex-col items-center bg-[#FFEFED] px-4 pb-10 pt-8 sm:px-6 md:pt-12 lg:px-8 xl:px-[100px]">
        <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6 lg:px-10">
          <img src="/ui/logo.svg" alt="" className="h-12 w-12 sm:h-[71px] sm:w-[71px]" />
          <div
            className="text-center text-2xl font-semibold leading-tight text-black sm:text-[40px] md:text-[48px] md:leading-[72px]"
            style={{ fontFamily: '"Alibaba PuHuiTi 3.0", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif' }}
          >春节个人专属祝福卡</div>
        </div>

        <div className="mt-8 w-full max-w-[1100px] rounded-2xl bg-white p-4 sm:p-6 md:mt-[40px] md:p-8 lg:p-10">
          <div className="flex flex-col items-stretch gap-6 lg:flex-row">
            <div className="w-full lg:flex-1">
              <BlessingCardForm
                isGenerating={isGenerating}
                onGenerate={onGenerate}
                onDownload={onDownload}
                canDownload={Boolean(mainBlob) && !isGenerating}
                className="h-full"
              />
            </div>

            <div className="flex w-full justify-center lg:flex-1">
              <BlessingCardPreview
                mainUrl={mainUrl}
                subUrl={subUrl}
                isGenerating={isGenerating}
                hint={hint}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
