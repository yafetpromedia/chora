"use client";

import { useEffect } from "react";
import { stripPreloaderFromDom } from "@/lib/id-card-print";

/** Print routes must never show the Chora boot splash in screen or PDF output. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    stripPreloaderFromDom();
    const onBeforePrint = () => stripPreloaderFromDom();
    window.addEventListener("beforeprint", onBeforePrint);
    const obs = new MutationObserver(() => {
      if (document.querySelector(".chora-preloader, #chora-preloader")) {
        stripPreloaderFromDom();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      obs.disconnect();
      document.documentElement.classList.remove("sid-print-route");
      document.body.classList.remove("sid-print-route");
    };
  }, []);

  return <>{children}</>;
}
