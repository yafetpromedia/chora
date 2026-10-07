import { getApiBaseUrl } from "@/lib/api";

/** Fallback only — prefer platform settings (`demoVideoUrl`). */
export const DEMO_VIDEO_URL_ENV =
  process.env.NEXT_PUBLIC_CHORA_DEMO_VIDEO_URL?.trim() || "";

export const BOOK_DEMO_HREF =
  "mailto:hello@awuddigitals.com?subject=Book%20a%20Chora%20demo";

export type DemoChapter = {
  time: string;
  seconds: number;
  title: string;
};

export type DemoStoryPoint = {
  n: string;
  title: string;
  desc: string;
};

export const DEMO_CHAPTERS: DemoChapter[] = [
  { time: "00:00", seconds: 0, title: "Why Chora" },
  { time: "01:00", seconds: 60, title: "School Administration" },
  { time: "02:30", seconds: 150, title: "Teacher Portal" },
  { time: "04:00", seconds: 240, title: "Student Experience" },
  { time: "06:00", seconds: 360, title: "AI & eLearning" },
  { time: "08:00", seconds: 480, title: "Assessments & Grade 12 Preparation" },
  { time: "10:00", seconds: 600, title: "Attendance & QR" },
  { time: "11:30", seconds: 690, title: "Fees & Payments" },
  { time: "13:00", seconds: 780, title: "Parent Experience" },
  { time: "14:00", seconds: 840, title: "Mobile Experience" },
  { time: "15:00", seconds: 900, title: "Getting Started" },
];

export const DEMO_STORY_POINTS: DemoStoryPoint[] = [
  {
    n: "01",
    title: "Manage",
    desc: "Students, teachers, attendance, fees and academic records.",
  },
  {
    n: "02",
    title: "Teach",
    desc: "Teachers manage classes, assignments, assessments and communication.",
  },
  {
    n: "03",
    title: "Learn",
    desc: "Students access references, eLearning, AI assistance, practice and model exams.",
  },
  {
    n: "04",
    title: "Connect",
    desc: "Parents stay informed about attendance, results, payments and announcements.",
  },
];

/** YouTube watch / share / embed → embeddable ID, or null. */
export function youtubeIdFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
    }
  } catch {
    /* not a URL */
  }
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

export function youtubeEmbedSrc(videoId: string, startSeconds = 0): string {
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (startSeconds > 0) params.set("start", String(Math.floor(startSeconds)));
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}

/** Resolve stored demo video URL (relative upload path, absolute, or YouTube). */
export function resolveDemoMediaUrl(url: string | null | undefined): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const base = getApiBaseUrl().replace(/\/$/, "");
  return `${base}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

export function isDirectVideoUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;
  if (youtubeIdFromUrl(trimmed)) return false;
  return (
    trimmed.includes("/platform/demo/files/") ||
    /\.(mp4|webm|mov)(\?|$)/i.test(trimmed) ||
    trimmed.startsWith("blob:")
  );
}
