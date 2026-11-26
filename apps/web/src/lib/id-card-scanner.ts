import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

/** QR + CODE128 so both faces of the printed ID card work with the camera. */
export const ID_CARD_SCAN_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
];

export function createIdCardScanner(elementId: string): Html5Qrcode {
  return new Html5Qrcode(elementId, {
    formatsToSupport: ID_CARD_SCAN_FORMATS,
    verbose: false,
  });
}

/** Wide box reads linear barcodes; tall enough for QR on the card back. */
export const ID_CARD_CAMERA_CONFIG = {
  fps: 12,
  qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
    const width = Math.floor(Math.min(viewfinderWidth * 0.88, 300));
    const height = Math.floor(
      Math.min(Math.max(viewfinderHeight * 0.42, 110), 200),
    );
    return { width, height };
  },
  aspectRatio: 1.777,
};
