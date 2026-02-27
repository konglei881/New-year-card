import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/supabase/client";
import {
  FEEDBACK_DESCRIPTION_MAX_LEN,
  isLikelyNetworkError,
  validateFeedbackDescription,
  validateOptionalEmail,
  withRetry,
} from "@/utils/feedback";

type Status = "idle" | "submitting" | "success" | "error";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const remaining = FEEDBACK_DESCRIPTION_MAX_LEN - description.length;

  const supabaseAvailable = useMemo(() => Boolean(getSupabaseClient()), []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(240, Math.max(88, el.scrollHeight))}px`;
  }, [description, open]);

  function resetSuccessLater() {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setSuccessMsg(null);
      setOpen(false);
      setStatus("idle");
    }, 3000);
  }

  async function submitOnce() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("未配置 Supabase 环境变量");

    const d = validateFeedbackDescription(description);
    if (!d.ok) {
      setErrorMsg("message" in d ? d.message : "请检查输入");
      setStatus("error");
      return;
    }

    const e = validateOptionalEmail(email);
    if (!e.ok) {
      setErrorMsg("message" in e ? e.message : "邮箱格式不正确");
      setStatus("error");
      return;
    }

    const payload = {
      description: d.value,
      email: e.value,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("feedback").insert(payload);
    if (error) throw new Error(error.message);

    setErrorMsg(null);
    setStatus("success");
    setSuccessMsg("提交成功");
    setDescription("");
    setEmail("");
    resetSuccessLater();
  }

  async function onSubmit() {
    if (status === "submitting") return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setStatus("submitting");

    try {
      await withRetry(
        async () => {
          await submitOnce();
        },
        {
          maxAttempts: 3,
          baseDelayMs: 500,
          maxDelayMs: 2500,
          shouldRetry: (err) => isLikelyNetworkError(err),
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "提交失败，请稍后重试";
      setStatus("error");
      setErrorMsg(isLikelyNetworkError(err) ? "网络异常，已自动重试仍失败，请稍后再试" : message);
    }
  }

  function onOpen() {
    setOpen(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (status === "success") setStatus("idle");
  }

  function onClose() {
    setOpen(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (status !== "submitting") setStatus("idle");
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      <button
        type="button"
        aria-label="反馈"
        onClick={() => (open ? onClose() : onOpen())}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-[#5B8CFF] text-white shadow-[0_16px_40px_rgba(0,0,0,.25)]",
          "transition hover:brightness-110 active:brightness-95",
          open && "opacity-0 pointer-events-none"
        )}
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      <div
        className={cn(
          "fixed bottom-4 right-4 z-50 w-[calc(100vw-32px)] max-w-[380px]",
          "rounded-2xl bg-white shadow-[0_16px_40px_rgba(0,0,0,.18)] ring-1 ring-black/5",
          "origin-bottom-right transition duration-200 ease-out",
          open ? "opacity-100 translate-y-0 scale-100" : "pointer-events-none opacity-0 translate-y-2 scale-[0.98]",
          "sm:bottom-6 sm:right-6"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold text-[#232339]">问题反馈</div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="rounded-md p-1 text-black/50 transition hover:bg-black/5 hover:text-black/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-4">
          {!supabaseAvailable && (
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              未配置 Supabase（需要 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`），暂不可提交。
            </div>
          )}

          <label className="block text-xs font-medium text-black/60">问题描述（必填）</label>
          <div className="mt-2">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, FEEDBACK_DESCRIPTION_MAX_LEN))}
              maxLength={FEEDBACK_DESCRIPTION_MAX_LEN}
              rows={3}
              placeholder="请描述你遇到的问题或建议（最多 100 字）"
              disabled={!supabaseAvailable || status === "submitting"}
              className={cn(
                "w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/90 outline-none",
                "focus:border-[#5B8CFF] focus:ring-2 focus:ring-[#5B8CFF]/15",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-black/40">
              <div className={cn(remaining < 0 && "text-[#FF5B5B]")}>剩余 {Math.max(0, remaining)} 字</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-medium text-black/60">邮箱联系方式</label>
              <span className="text-[11px] text-black/35">可选</span>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={!supabaseAvailable || status === "submitting"}
              className={cn(
                "mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/90 outline-none",
                "focus:border-[#5B8CFF] focus:ring-2 focus:ring-[#5B8CFF]/15",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            />
          </div>

          {(errorMsg || successMsg) && (
            <div
              className={cn(
                "mt-4 rounded-xl px-3 py-2 text-xs",
                errorMsg ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
              )}
            >
              {errorMsg || successMsg}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            {status === "error" && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!supabaseAvailable}
                className={cn(
                  "rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black/70",
                  "transition hover:bg-black/5 disabled:opacity-60"
                )}
              >
                重试
              </button>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={!supabaseAvailable || status === "submitting"}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl bg-[#5B8CFF] px-4 py-2 text-sm font-semibold text-white",
                "transition hover:brightness-110 active:brightness-95 disabled:opacity-60"
              )}
            >
              {status === "submitting" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {status === "submitting" ? "提交中" : "提交"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
