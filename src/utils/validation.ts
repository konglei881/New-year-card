export function normalizeInputText(value: string) {
  return value.replace(/[ \t]+/g, " ").trim();
}

export function countChars(value: string) {
  return Array.from(value).length;
}

export type BlessingValidationResult =
  | { ok: true; value: string; length: number }
  | { ok: false; value: string; length: number; message: string };

export function validateBlessing(raw: string): BlessingValidationResult {
  const value = normalizeInputText(raw);
  const length = countChars(value.replace(/\n/g, ""));

  if (!value) {
    return { ok: false, value, length, message: "请填写祝福语" };
  }

  if (/^[\p{P}\p{S}\s]+$/u.test(value)) {
    return { ok: false, value, length, message: "祝福语不能只包含符号" };
  }

  if (length < 4) {
    return { ok: false, value, length, message: "祝福语不得少于4字" };
  }

  if (length > 16) {
    return { ok: false, value, length, message: "祝福语最多16字" };
  }

  return { ok: true, value, length };
}

export type FileValidationResult = { ok: true } | { ok: false; message: string };

export function validateAvatarFile(file: File): FileValidationResult {
  const maxSize = 10 * 1024 * 1024;
  if (!file.type.startsWith("image/")) return { ok: false, message: "请上传图片文件" };
  if (file.size > maxSize) return { ok: false, message: "图片大小不能超过10MB" };
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return { ok: false, message: "仅支持 jpg/png/webp" };
  return { ok: true };
}
