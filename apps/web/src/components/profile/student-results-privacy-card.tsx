"use client";

import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "@/lib/profile";
import { AppToast } from "@/components/ui/app-toast";

export function StudentResultsPrivacyCard() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void getMyProfile()
      .then((data) => {
        if (data.student) {
          setAllowed(data.student.parentsCanViewResults !== false);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load privacy setting"),
      )
      .finally(() => setLoading(false));
  }, []);

  async function onToggle(next: boolean) {
    setSaving(true);
    setError("");
    setToast(null);
    try {
      const updated = await updateMyProfile({ parentsCanViewResults: next });
      setAllowed(updated.student?.parentsCanViewResults !== false);
      setToast(
        next
          ? "Parents can view your results again."
          : "Parents can no longer see your results.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update privacy setting");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="profile-card">
        <p className="profile-card__sub">Loading privacy settings…</p>
      </section>
    );
  }

  return (
    <section className="profile-card" aria-label="Results privacy">
      <div className="profile-card__head">
        <div>
          <h3 className="profile-card__title">Results privacy</h3>
          <p className="profile-card__sub">
            Control whether linked parents can see your scores and report card
          </p>
        </div>
      </div>

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      <label className="profile-privacy-toggle">
        <input
          type="checkbox"
          checked={allowed}
          disabled={saving}
          onChange={(e) => void onToggle(e.target.checked)}
        />
        <span>
          <strong>Allow parents to see my results</strong>
          <small>
            {allowed
              ? "Parents can open Results and Report card for you."
              : "Parents are blocked from your results until you turn this back on."}
          </small>
        </span>
      </label>

      <AppToast message={toast ?? ""} tone="success" onDismiss={() => setToast(null)} />
    </section>
  );
}
