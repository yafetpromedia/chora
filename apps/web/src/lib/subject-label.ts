/** Compact label for tight UI (timetable cards, week chips). Prefers code. */
export function subjectCompactLabel(subject: {
  name: string;
  code?: string | null;
}): string {
  const code = subject.code?.trim();
  if (code) return code;
  const name = subject.name.trim();
  return name.length > 18 ? `${name.slice(0, 17)}…` : name;
}

/** Full accessible label: "Information Technology (ICT)" when both differ. */
export function subjectFullLabel(subject: {
  name: string;
  code?: string | null;
}): string {
  const name = subject.name.trim();
  const code = subject.code?.trim();
  if (code && code.toLowerCase() !== name.toLowerCase()) {
    return `${name} (${code})`;
  }
  return name;
}

/** Suggest a short uppercase code from a subject name (manual override still wins). */
export function suggestSubjectCode(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
  if (!cleaned) return "";

  const stop = new Set([
    "AND",
    "OF",
    "THE",
    "FOR",
    "IN",
    "TO",
    "A",
    "AN",
  ]);
  const words = cleaned
    .split(" ")
    .map((w) => w.toUpperCase())
    .filter((w) => w && !stop.has(w));

  if (words.length >= 2) {
    return words
      .slice(0, 4)
      .map((w) => w[0])
      .join("")
      .slice(0, 12);
  }

  return words[0]?.slice(0, 6) ?? "";
}
