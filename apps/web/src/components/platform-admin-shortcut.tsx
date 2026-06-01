"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PLATFORM_TOKEN_KEY } from "@/lib/platform-auth";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

export function PlatformAdminShortcut() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "a") return;
      if (!e.shiftKey) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (isTypingTarget(e.target)) return;

      e.preventDefault();

      const hasToken =
        typeof window !== "undefined" && Boolean(localStorage.getItem(PLATFORM_TOKEN_KEY));

      router.push(hasToken ? "/platform" : "/platform/login");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
