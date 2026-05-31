const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function fileToPhotoDataUrl(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Photo must be JPEG, PNG, or WebP");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Photo must be under 2 MB");
  }

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
