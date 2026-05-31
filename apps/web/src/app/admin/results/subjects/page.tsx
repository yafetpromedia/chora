"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy path — subject assignment moved under Subjects. */
export default function LegacySubjectAssignmentRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/subjects/assign");
  }, [router]);
  return <p className="setup-hint">Redirecting to subject assignment…</p>;
}
