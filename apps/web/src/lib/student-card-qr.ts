import QRCode from "qrcode";
import type { StudentIdCard } from "@/lib/student-cards";

const QR_OPTS = {
  margin: 1,
  errorCorrectionLevel: "M" as const,
  color: { dark: "#0a3d42", light: "#ffffff" },
};

export async function generateCardQrDataUrl(
  scanPayload: string,
  size = 120,
): Promise<string> {
  return QRCode.toDataURL(scanPayload, { ...QR_OPTS, width: size });
}

/** Batch-generate QR images for bulk print (avoids 1000s of per-card effects). */
export async function buildCardQrMap(
  cards: Pick<StudentIdCard, "studentProfileId" | "scanPayload">[],
  size = 120,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const total = cards.length;
  for (let i = 0; i < total; i++) {
    const card = cards[i]!;
    map.set(
      card.studentProfileId,
      await generateCardQrDataUrl(card.scanPayload, size),
    );
    if (i % 8 === 0 || i === total - 1) {
      onProgress?.(i + 1, total);
    }
  }
  return map;
}
