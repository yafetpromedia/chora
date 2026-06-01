"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type BarcodeVariant = "standard" | "compact" | "mini";

type Props = {
  code: string;
  variant?: BarcodeVariant;
};

function barcodeOptions(variant: BarcodeVariant) {
  if (variant === "mini") {
    return { width: 1.05, height: 22, fontSize: 7 };
  }
  if (variant === "compact") {
    return { width: 1.25, height: 28, fontSize: 8 };
  }
  return { width: 1.45, height: 34, fontSize: 9 };
}

export function StudentCardBarcode({ code, variant = "standard" }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !code) return;
    const { width, height, fontSize } = barcodeOptions(variant);
    try {
      JsBarcode(el, code, {
        format: "CODE128",
        width,
        height,
        displayValue: true,
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
  }, [code, variant]);

  if (!code) return null;

  return (
    <div className="sid__barcode-wrap">
      <svg ref={svgRef} className="sid__barcode" role="img" aria-label={`Barcode ${code}`} />
    </div>
  );
}
