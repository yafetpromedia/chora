import { Suspense } from "react";
import { SubjectAssignmentContent } from "./assign-content";

export default function SubjectAssignmentPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Loading subject assignment…</p>}>
      <SubjectAssignmentContent />
    </Suspense>
  );
}
