"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type BarcodeVariant = "standard" | "compact" | "mini";

type Props = {
  /** Value encoded in the bars — use the same scan payload as the QR. */
  code: string;
  /** Human-readable text under the bars (defaults to `code`). */
  displayValue?: string;
  variant?: BarcodeVariant;
};

function barcodeOptions(variant: BarcodeVariant, encodedLength: number) {
  const dense = encodedLength > 10;
  if (variant === "mini") {
    return { width: dense ? 0.85 : 1.05, height: 22, fontSize: 7 };
  }
  if (variant === "compact") {
    return { width: dense ? 0.95 : 1.25, height: 28, fontSize: 8 };
  }
  return { width: dense ? 1.05 : 1.45, height: 34, fontSize: 9 };
}

export function StudentCardBarcode({
  code,
  displayValue,
  variant = "standard",
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const label = displayValue?.trim() || code;

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !code) return;
    const { width, height, fontSize } = barcodeOptions(variant, code.length);
    try {
      JsBarcode(el, code, {
        format: "CODE128",
        width,
        height,
        displayValue: true,
        text: label,
        font: "system-ui, Segoe UI, sans-serif",
        fontOptions: "bold",
        fontSize,
        textMargin: 1,
        margin: 2,
        lineColor: "#0a3d42",
        background: "#ffffff",
      });
    } catch {
      el.innerHTML = "";
    }
  }, [code, label, variant]);

  if (!code) return null;

  return (
    <div className="sid__barcode-wrap">
      <svg
        ref={svgRef}
        className="sid__barcode"
        role="img"
        aria-label={`Barcode ${label}`}
      />
    </div>
  );
}
