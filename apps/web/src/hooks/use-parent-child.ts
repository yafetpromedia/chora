"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchParentChildren,
  pickChildId,
  writeStoredChildId,
  type ParentChildOption,
} from "@/lib/parent-child";

export function useParentChild() {
  const [children, setChildren] = useState<ParentChildOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchParentChildren()
      .then((list) => {
        if (cancelled) return;
        setChildren(list);
        const id = pickChildId(list);
        setSelectedId(id);
        if (id) writeStoredChildId(id);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load children");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectChild = useCallback((profileId: string) => {
    setSelectedId(profileId);
    writeStoredChildId(profileId);
  }, []);

  const selected = children.find((c) => c.profileId === selectedId) ?? null;

  return {
    children,
    selectedId,
    selected,
    selectChild,
    loading,
    error,
  };
}
