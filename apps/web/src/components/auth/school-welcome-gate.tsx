"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SchoolWelcomeDialog } from "@/components/auth/school-welcome-dialog";
import {
  clearPendingSchoolWelcome,
  readPendingSchoolWelcome,
  type PendingSchoolWelcome,
} from "@/lib/school-welcome";

/** Shows the post-registration welcome dialog if the user refreshed or navigated away early. */
export function SchoolWelcomeGate() {
  const router = useRouter();
  const [welcome, setWelcome] = useState<PendingSchoolWelcome | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const pending = readPendingSchoolWelcome();
      if (pending) setWelcome(pending);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!welcome) return null;

  return (
    <SchoolWelcomeDialog
      open
      schoolName={welcome.schoolName}
      joinCode={welcome.joinCode}
      adminUsername={welcome.adminUsername}
      onContinue={() => {
        const path = welcome.nextPath;
        clearPendingSchoolWelcome();
        setWelcome(null);
        if (path && window.location.pathname !== path) {
          router.push(path);
        }
      }}
    />
  );
}
