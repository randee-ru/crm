/** Нормализует российский номер к формату 7XXXXXXXXXX. */
export function normalizeRussianPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return digits;
  // 8XXXXXXXXX — внутренний формат с «8» вместо +7.
  if (digits.length === 10 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  // 7XXXXXXXXX — пользователь уже ввёл код страны, не добавляем вторую «7».
  if (digits.length === 10 && digits.startsWith("7")) return digits;
  if (digits.length === 10) return `7${digits}`;
  return digits;
}

export function isValidRussianMobile(value: string): boolean {
  const digits = normalizeRussianPhone(value);
  return digits.length === 11 && digits.startsWith("7");
}

export function formatRussianPhoneInput(value: string): string {
  const digits = normalizeRussianPhone(value);
  if (digits.length <= 1) return digits ? `+${digits}` : "";
  const local = digits.slice(1);
  let result = `+7`;
  if (local.length > 0) result += ` (${local.slice(0, 3)}`;
  if (local.length >= 3) result += `) ${local.slice(3, 6)}`;
  if (local.length >= 6) result += `-${local.slice(6, 8)}`;
  if (local.length >= 8) result += `-${local.slice(8, 10)}`;
  return result;
}
