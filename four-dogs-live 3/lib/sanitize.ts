export function sanitize(raw: string, maxLen: number = 100): string {
  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function normalizeTeamName(name: string): string {
  return sanitize(name, 30)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function isValid(val: string): boolean {
  return sanitize(val).length >= 1;
}
