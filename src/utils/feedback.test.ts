import { describe, expect, it, vi } from "vitest";
import {
  FEEDBACK_DESCRIPTION_MAX_LEN,
  isLikelyNetworkError,
  normalizeFeedbackDescription,
  validateFeedbackDescription,
  validateOptionalEmail,
  withRetry,
} from "@/utils/feedback";

describe("normalizeFeedbackDescription", () => {
  it("trims and normalizes newlines", () => {
    expect(normalizeFeedbackDescription("  a\r\n b \n")).toBe("a\n b");
  });
});

describe("validateFeedbackDescription", () => {
  it("rejects empty", () => {
    expect(validateFeedbackDescription("   ").ok).toBe(false);
  });

  it("enforces max length", () => {
    const long = "a".repeat(FEEDBACK_DESCRIPTION_MAX_LEN + 1);
    expect(validateFeedbackDescription(long).ok).toBe(false);
    expect(validateFeedbackDescription("a".repeat(FEEDBACK_DESCRIPTION_MAX_LEN)).ok).toBe(true);
  });
});

describe("validateOptionalEmail", () => {
  it("accepts empty", () => {
    const r = validateOptionalEmail("  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(null);
  });

  it("rejects invalid email", () => {
    expect(validateOptionalEmail("abc").ok).toBe(false);
  });

  it("accepts valid email", () => {
    const r = validateOptionalEmail("a@b.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("a@b.com");
  });
});

describe("isLikelyNetworkError", () => {
  it("detects common network messages", () => {
    expect(isLikelyNetworkError(new Error("NetworkError when attempting to fetch resource"))).toBe(true);
    expect(isLikelyNetworkError(new Error("timeout"))).toBe(true);
    expect(isLikelyNetworkError(new Error("permission denied"))).toBe(false);
  });
});

describe("withRetry", () => {
  it("retries and eventually succeeds", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    let n = 0;
    const fn = async () => {
      n++;
      if (n < 3) throw new Error("NetworkError");
      return "ok";
    };

    const r = await withRetry(fn, {
      maxAttempts: 5,
      baseDelayMs: 1,
      maxDelayMs: 5,
      shouldRetry: (err) => isLikelyNetworkError(err),
    });

    expect(r).toBe("ok");
    expect(n).toBe(3);
  });

  it("stops when shouldRetry returns false", async () => {
    const fn = async () => {
      throw new Error("permission denied");
    };

    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
        shouldRetry: (err) => isLikelyNetworkError(err),
      })
    ).rejects.toBeTruthy();
  });
});

