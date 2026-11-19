"use client";

import { useSyncExternalStore } from "react";
import { getCurrentUserId } from "@/lib/auth";

const noopSubscribe = () => () => {};

/** Reads a browser-only value (e.g. localStorage) during render; returns `serverValue` on the server / first hydration pass. */
export function useClientSnapshot<T extends string | number | boolean | null>(
  getSnapshot: () => T,
  serverValue: T,
): T {
  return useSyncExternalStore(noopSubscribe, getSnapshot, () => serverValue);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useCurrentUserId(): string | null {
  return useClientSnapshot(getCurrentUserId, null);
}
