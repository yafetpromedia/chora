"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { TeacherIdCardView } from "@/components/teacher/teacher-id-card";
import {
  backfillTeacherCards,
  listTeacherIdCards,
  type TeacherIdCard,
} from "@/lib/teacher-cards";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

const PREVIEW_LIMIT = 8;

export default function TeacherCardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<TeacherIdCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewBack, setPreviewBack] = useState(true);

  const preview = cards.slice(0, PREVIEW_LIMIT);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setCards(await listTeacherIdCards());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load cards");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void load();
  }, [router]);

  async function onBackfill() {
    setBusy(true);
    setMessage("");
    try {
      const r = await backfillTeacherCards();
      setMessage(
        `Updated ${r.idsUpdated} teacher IDs and ${r.cardsUpdated} card codes.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backfill failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPage role="admin" title="Teacher ID cards" eyebrow="Staff">
      <div className="idcards-page">
        {error ? <p className="att-toast att-toast--error">{error}</p> : null}
        {message ? <p className="att-toast">{message}</p> : null}

        <div className="idcards-toolbar">
          <Link href="/admin/teachers" className="att-btn att-btn--ghost">
            ← Teachers
          </Link>
          <button
            type="button"
            className="att-btn att-btn--ghost"
            disabled={busy}
            onClick={() => void onBackfill()}
          >
            Generate missing TCH IDs / cards
          </button>
          <button type="button" className="att-btn att-btn--ghost" onClick={() => void load()}>
            Refresh
          </button>
          <label className="sid-modal__toggle">
            <input
              type="checkbox"
              checked={previewBack}
              onChange={(e) => setPreviewBack(e.target.checked)}
            />
            Preview back
          </label>
          <Link
            href="/print/teacher-id-cards"
            className="att-btn att-btn--primary"
            target="_blank"
          >
            Print all…
          </Link>
        </div>

        {loading ? (
          <p className="setup-hint">Loading teacher cards…</p>
        ) : cards.length === 0 ? (
          <p className="setup-hint">
            No teacher cards yet. Add teachers, then run &quot;Generate missing TCH IDs /
            cards&quot;.
          </p>
        ) : (
          <>
            <p className="idcards-count-hint">
              <strong>{cards.length}</strong> faculty card{cards.length === 1 ? "" : "s"}.
              {cards.length > PREVIEW_LIMIT
                ? ` Showing ${PREVIEW_LIMIT} previews — use Print all for every card.`
                : null}
            </p>
            <div className="idcards-preview-grid">
              {preview.map((c) => (
                <TeacherIdCardView
                  key={c.userId}
                  card={c}
                  variant="standard"
                  showBack={previewBack}
                  className={previewBack ? "sid-wrap--print-duplex" : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardPage>
  );
}
