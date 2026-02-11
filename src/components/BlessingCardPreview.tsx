import { cn } from "@/lib/utils";

type Props = {
  mainUrl: string | null;
  subUrl: string | null;
  isGenerating: boolean;
  hint: string;
  className?: string;
};

export default function BlessingCardPreview(props: Props) {
  const hasResult = Boolean(props.mainUrl);

  return (
    <div
      className={cn(
        "flex min-h-[560px] w-full flex-col items-center justify-center rounded-2xl bg-[#F7F9FC] relative overflow-hidden",
        hasResult ? "px-2 sm:px-6" : "px-4 sm:px-12",
        props.className
      )}
      style={{ fontFamily: '"PingFang SC", sans-serif' }}
    >
      {/* 加载动画叠加层 */}
      {props.isGenerating && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#F7F9FC]/80 backdrop-blur-[2px] p-4">
          <div className="relative aspect-[288/472] w-full max-w-[288px] overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            {/* 骨架屏效果 */}
            <div className="flex h-full flex-col p-4">
              <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-100" /> {/* 照片占位 */}
              <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-gray-100" /> {/* 标题占位 */}
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-gray-100" /> {/* 文字行1 */}
              <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-gray-100" /> {/* 文字行2 */}
              <div className="mt-auto flex justify-end">
                <div className="h-12 w-12 animate-pulse rounded-full bg-gray-100" /> {/* 印章占位 */}
              </div>
            </div>
            
            {/* 扫描光效 */}
            <div className="absolute inset-0 -translate-y-full animate-[scan_2s_linear_infinite] bg-gradient-to-b from-transparent via-[#FF6E87]/20 to-transparent" />
          </div>
          <div className="mt-6 flex flex-col items-center gap-2">
          </div>
        </div>
      )}

      {!hasResult ? (
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="mb-4">
            <img src="/ui/icon-placeholder.svg" alt="" className="h-[60px] w-[60px]" />
          </div>
          <div className="text-base font-medium leading-6 text-[#232339]">祝福卡生成区</div>
          <div className="mt-2 text-sm leading-[22px] text-black/30">{props.hint}</div>
        </div>
      ) : (
        <img
          src={props.mainUrl ?? ""}
          alt="祝福卡预览"
          className="h-auto w-full max-w-[288px] rounded-lg shadow-md"
        />
      )}

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}
