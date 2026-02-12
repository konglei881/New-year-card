import { Upload, Sparkles, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BlessingType, Gender } from "@/stores/blessingCardStore";
import { useBlessingCardStore } from "@/stores/blessingCardStore";
import { cn } from "@/lib/utils";
import { validateAvatarFile, validateBlessing } from "@/utils/validation";

type Props = {
  isGenerating: boolean;
  onGenerate: () => void;
  onDownload: () => void;
  canDownload: boolean;
  className?: string;
};

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

function MenuSelect<T extends string>(props: {
  label: string;
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  placeholder: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const currentLabel = props.options.find((o) => o.value === props.value)?.label ?? "";
  const showPlaceholder = !currentLabel;

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (!open) return;
      if (el.contains(e.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={props.label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-[34px] w-full items-center justify-between rounded-lg border border-black/[0.08] bg-white px-[11px] text-sm font-medium leading-[22px] text-black/[0.92] transition",
          open ? "border-[#FF6E87]" : "",
          "focus:outline-none focus:ring-2 focus:ring-[#FF6E87]/30"
        )}
      >
        <span className={cn(showPlaceholder ? "text-black/30" : "text-black/[0.92]")}
        >{showPlaceholder ? props.placeholder : currentLabel}</span>
        <img src="/ui/icon-down.svg" alt="" className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-[42px] z-50 flex min-h-[84px] w-full flex-col items-start gap-[2px] rounded-[8px] bg-white p-1 shadow-[0_8px_20px_0_rgba(0,0,0,0.12)]"
        >
          {props.options.map((opt) => {
            const active = opt.value === props.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  props.onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex h-[38px] w-full items-center gap-1 rounded-[4px] px-2 text-left transition-colors",
                  active ? "bg-[#F5F5F5]" : "bg-white hover:bg-[#F5F5F5]"
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    active
                      ? "font-medium leading-[22px] text-black/[0.92]"
                      : "font-normal leading-5 text-[#171718]"
                  )}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const genderOptions: Array<SelectOption<Exclude<Gender, "">>> = [
  { label: "女性", value: "female" },
  { label: "男性", value: "male" },
];

const typeOptions: Array<SelectOption<Exclude<BlessingType, "">>> = [
  { label: "财运", value: "caiyun" },
  { label: "爱情", value: "aiqing" },
  { label: "健康", value: "jiankang" },
  { label: "学业", value: "xueye" },
];

const aiOptions: Array<SelectOption<'jimeng' | 'gemini'>> = [
  { label: "即梦 AI 4.0", value: "jimeng" },
  { label: "Nano Banana (Gemini)", value: "gemini" },
];

export default function BlessingCardForm(props: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { gender, blessingType, blessing, avatarFile, aiProvider, setGender, setBlessingType, setBlessing, setAvatarFile, setAiProvider } =
    useBlessingCardStore();

  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const blessingCheck = useMemo(() => validateBlessing(blessing), [blessing]);
  const blessingError = "message" in blessingCheck ? blessingCheck.message : null;

  const canGenerate = Boolean(avatarFile) && Boolean(gender) && Boolean(blessingType) && blessingCheck.ok && !props.isGenerating;

  function pickFile() {
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setAvatarFile(null);
      setAvatarError(null);
      return;
    }

    const check = validateAvatarFile(file);
    if ("message" in check) {
      setAvatarFile(null);
      setAvatarError(check.message);
      return;
    }

    setAvatarFile(file);
    setAvatarError(null);
  }

  function onDropFile(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] ?? null;
    if (!file) return;

    const check = validateAvatarFile(file);
    if ("message" in check) {
      setAvatarFile(null);
      setAvatarError(check.message);
      return;
    }

    setAvatarFile(file);
    setAvatarError(null);
  }

  useEffect(() => {
    if (!avatarFile) {
      setAvatarUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function clearAvatar() {
    if (inputRef.current) inputRef.current.value = "";
    setAvatarFile(null);
    setAvatarError(null);
  }

  return (
    <div className={cn("rounded-2xl bg-[#F7F9FC] p-6 overflow-visible", props.className)} style={{ fontFamily: '"PingFang SC", sans-serif' }}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium leading-[22px] text-black/55">您的性別</div>
          <MenuSelect
            label="性别"
            value={gender}
            options={genderOptions}
            onChange={setGender}
            placeholder="请选择"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium leading-[22px] text-black/55">祝福类型</div>
          <MenuSelect
            label="祝福类型"
            value={blessingType}
            options={typeOptions}
            onChange={setBlessingType}
            placeholder="请选择"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium leading-[22px] text-black/55">生成您的AI形象</div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={pickFile}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropFile}
            className={cn(
              avatarFile
                ? "group relative flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#D3D4D5] bg-white"
                : "flex h-[86px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#D3D4D5] bg-white px-[23px] py-[17px] text-sm font-medium leading-[22px] text-black/45",
              "transition focus:outline-none focus:ring-2 focus:ring-[#FF6E87]/30"
            )}
          >
            {avatarFile && avatarUrl ? (
              <>
                <img src={avatarUrl} alt="已上传照片" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-[#17171873] opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAvatar();
                    }}
                    className="flex h-6 w-6 items-center justify-center text-white"
                    aria-label="删除照片"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-5 w-5 text-black/45" />
                <span className="text-center text-sm leading-[22px]">
                  <span className="text-black/30">将照片拖到此处 或</span>
                  <span className="font-medium text-[#FF7E96]">点击上传</span>
                </span>
              </div>
            )}
          </button>
          {avatarError ? <div className="text-sm text-red-600">{avatarError}</div> : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium leading-[22px] text-black/55">填写祝福语</div>
          <div className="relative">
            <textarea
              value={blessing}
              onChange={(e) => setBlessing(e.target.value)}
              rows={3}
              className={cn(
                "h-[77px] w-full resize-none rounded-lg border bg-white px-[11px] py-[5px] text-[14px] font-medium leading-[22px] text-black/[0.92] outline-none placeholder:text-black/30 transition-colors",
                "border-black/[0.08] focus:border-[#FF6E87] active:border-[#FF6E87]"
              )}
              placeholder="请输入祝福语"
            />
            <div className="pointer-events-none absolute bottom-3 right-3 h-[18px] w-auto text-right text-sm leading-[18px] text-black/30">
              {blessingCheck.length}/14
            </div>
          </div>
          {blessingError ? <div className="text-sm text-red-600"></div> : null}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={props.onGenerate}
            disabled={!canGenerate}
            className={cn(
              "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition",
              canGenerate ? "bg-[#FF6E87] text-white hover:bg-[#ff5c78]" : "bg-[#FF6E87]/40 text-white/80",
              "focus:outline-none focus:ring-2 focus:ring-[#FF6E87]/30"
            )}
          >
            <Sparkles className="h-4 w-4" />
            {props.isGenerating ? "生成中..." : "生成祝福卡"}
          </button>
          <button
            type="button"
            onClick={props.onDownload}
            disabled={!props.canDownload}
            className={cn(
              "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition",
              props.canDownload ? "bg-[#E5E7EB] text-black/80 hover:bg-[#D1D5DB]" : "bg-[#E5E7EB]/60 text-black/35",
              "focus:outline-none focus:ring-2 focus:ring-black/10"
            )}
          >
            <Download className="h-4 w-4" />
            保存图片
          </button>
        </div>
      </div>
    </div>
  );
}
