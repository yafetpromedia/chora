const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DATA_URL_CHARS = 2_800_000;
const MAX_DIMENSION = 960;
const JPEG_QUALITY = 0.85;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** Resize and compress for JSON enroll/update (keeps requests under API limits). */
export async function fileToPhotoDataUrl(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Photo must be JPEG, PNG, or WebP");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Photo must be under 8 MB");
  }

  const dataUrl = await resizeImageFileToJpegDataUrl(file);
  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error("Photo is still too large — try a smaller image");
  }
  return dataUrl;
}

async function resizeImageFileToJpegDataUrl(file: File): Promise<string> {
  if (typeof window === "undefined") {
    return readFileAsDataUrl(file);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const maxSide = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = maxSide > MAX_DIMENSION ? MAX_DIMENSION / maxSide : 1;
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not process photo");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = JPEG_QUALITY;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > MAX_DATA_URL_CHARS && quality > 0.45) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read photo"));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read photo"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.readAsDataURL(file);
  });
}

export function telHref(phone: string | null | undefined) {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("251")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+251${digits.slice(1)}`;
  return `tel:+251${digits}`;
}
