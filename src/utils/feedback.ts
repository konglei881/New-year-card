export const FEEDBACK_DESCRIPTION_MAX_LEN = 100;

export type ValidationOk<T> = { ok: true; value: T };
export type ValidationErr = { ok: false; message: string };
export type ValidationResult<T> = ValidationOk<T> | ValidationErr;

export function normalizeFeedbackDescription(input: string): string {
  return input.replace(/\r\n/g, "\n").trim();
}

export function validateFeedbackDescription(input: string): ValidationResult<string> {
  const v = normalizeFeedbackDescription(input);
  if (!v) return { ok: false, message: "请填写问题描述" };
  if (v.length > FEEDBACK_DESCRIPTION_MAX_LEN) return { ok: false, message: "问题描述最多 100 个字符" };
  return { ok: true, value: v };
}

export function validateOptionalEmail(input: string): ValidationResult<string | null> {
  const v = input.trim();
  if (!v) return { ok: true, value: null };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(v)) return { ok: false, message: "邮箱格式不正确" };
  return { ok: true, value: v };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry: (err: unknown) => boolean;
};

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === options.maxAttempts) break;
      if (!options.shouldRetry(err)) break;

      const exp = options.baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 120);
      const delay = Math.min(options.maxDelayMs, exp + jitter);
      await sleep(delay);
    }
  }

  throw lastErr;
}

export function isLikelyNetworkError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "string") return /network|fetch|timeout/i.test(err);
  if (err instanceof Error) return /network|fetch|timeout/i.test(err.message);
  return false;
}

