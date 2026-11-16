const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_HERO_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_DOCS_THUMB_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_DATA_URL_CHARS = 2_800_000;
const JPEG_QUALITY = 0.85;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function fileToPhotoDataUrl(file: File): Promise<string> {
  return fileToCompressedJpegDataUrl(file, {
    maxDimension: 960,
    maxDataUrlChars: MAX_DATA_URL_CHARS,
    maxUploadBytes: MAX_UPLOAD_BYTES,
  });
}

/** Compact school mark for sidebar + ID cards (keeps settings saves under body limits). */
export async function fileToSchoolLogoDataUrl(file: File): Promise<string> {
  return fileToCompressedJpegDataUrl(file, {
    maxDimension: 512,
    maxDataUrlChars: 900_000,
    jpegQuality: 0.82,
    maxUploadBytes: MAX_UPLOAD_BYTES,
    sizeError: "Logo must be under 8 MB (JPEG, PNG, or WebP)",
  });
}

/** Official school stamp — keeps PNG transparency and crops empty padding. */
export async function fileToStampDataUrl(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Stamp must be JPEG, PNG, or WebP");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Stamp must be under 8 MB");
  }
  if (typeof window === "undefined") {
    return readFileAsDataUrl(file);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return encodeTrimmedStamp(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Crop transparent padding so the seal fills the stamp frame on ID cards. */
export async function trimStampSrc(src: string): Promise<string> {
  if (typeof window === "undefined" || !src.trim()) return src;
  try {
    const img = await loadImage(src);
    return encodeTrimmedStamp(img);
  } catch {
    return src;
  }
}

async function encodeTrimmedStamp(img: HTMLImageElement): Promise<string> {
  const maxDimension = 640;
  const maxSide = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = maxSide > maxDimension ? maxDimension / maxSide : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not process stamp");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const trimmed = cropTransparentBounds(canvas, ctx);
  const out = trimmed ?? canvas;

  const png = out.toDataURL("image/png");
  if (png.length <= 1_200_000) return png;

  let quality = 0.85;
  let jpeg = out.toDataURL("image/jpeg", quality);
  while (jpeg.length > 900_000 && quality > 0.5) {
    quality -= 0.08;
    jpeg = out.toDataURL("image/jpeg", quality);
  }
  if (jpeg.length > 900_000) {
    throw new Error("Stamp is still too large — try a smaller PNG");
  }
  return jpeg;
}

function cropTransparentBounds(
  source: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): HTMLCanvasElement | null {
  const { width, height } = source;
  const data = ctx.getImageData(0, 0, width, height).data;
  let top = height;
  let left = width;
  let right = 0;
  let bottom = 0;
  let found = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 12) {
        found = true;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (!found) return null;

  const pad = 2;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(width - 1, right + pad);
  bottom = Math.min(height - 1, bottom + pad);

  const cropW = Math.max(1, right - left + 1);
  const cropH = Math.max(1, bottom - top + 1);
  if (cropW >= width * 0.96 && cropH >= height * 0.96) return null;

  const side = Math.max(cropW, cropH);
  const out = document.createElement("canvas");
  out.width = side;
  out.height = side;
  const outCtx = out.getContext("2d");
  if (!outCtx) return null;
  outCtx.clearRect(0, 0, side, side);
  const offsetX = Math.round((side - cropW) / 2);
  const offsetY = Math.round((side - cropH) / 2);
  outCtx.drawImage(source, left, top, cropW, cropH, offsetX, offsetY, cropW, cropH);
  return out;
}

/** Wider compression for full-bleed marketing hero images. */
export async function fileToHeroDataUrl(file: File): Promise<string> {
  return fileToCompressedJpegDataUrl(file, {
    maxDimension: 1920,
    maxDataUrlChars: 3_800_000,
    jpegQuality: 0.82,
    maxUploadBytes: MAX_HERO_UPLOAD_BYTES,
    sizeError: "Image must be under 25 MB",
  });
}

/** Portrait cover for Explore documentation card — accepts large exports, stores compressed. */
export async function fileToDocsThumbnailDataUrl(file: File): Promise<string> {
  return fileToCompressedJpegDataUrl(file, {
    maxDimension: 1400,
    maxDataUrlChars: 2_400_000,
    jpegQuality: 0.8,
    maxUploadBytes: MAX_DOCS_THUMB_UPLOAD_BYTES,
    sizeError: "Thumbnail must be under 25 MB (JPEG, PNG, or WebP)",
  });
}

async function fileToCompressedJpegDataUrl(
  file: File,
  options: {
    maxDimension: number;
    maxDataUrlChars: number;
    jpegQuality?: number;
    maxUploadBytes?: number;
    sizeError?: string;
  },
): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Photo must be JPEG, PNG, or WebP");
  }
  const maxBytes = options.maxUploadBytes ?? MAX_UPLOAD_BYTES;
  if (file.size > maxBytes) {
    throw new Error(
      options.sizeError ??
        `Photo must be under ${Math.round(maxBytes / (1024 * 1024))} MB`,
    );
  }

  const dataUrl = await resizeImageFileToJpegDataUrl(
    file,
    options.maxDimension,
    options.jpegQuality ?? JPEG_QUALITY,
    options.maxDataUrlChars,
  );
  if (dataUrl.length > options.maxDataUrlChars) {
    throw new Error("Photo is still too large — try a smaller image");
  }
  return dataUrl;
}

async function resizeImageFileToJpegDataUrl(
  file: File,
  maxDimension: number,
  jpegQuality: number,
  maxDataUrlChars: number,
): Promise<string> {
  if (typeof window === "undefined") {
    return readFileAsDataUrl(file);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const maxSide = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = maxSide > maxDimension ? maxDimension / maxSide : 1;
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

    let quality = jpegQuality;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > maxDataUrlChars && quality > 0.45) {
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
