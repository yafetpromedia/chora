"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME, BRAND_NAME_AM } from "@/lib/brand";
import { getApiBaseUrl } from "@/lib/api";
import { useLocale } from "@/components/i18n/locale-provider";

type Meta = {
  school: { name: string; logoUrl: string | null; joinCode: string };
  student: {
    displayName: string;
    grade: string;
    section: string | null;
    cardCode: string | null;
  };
};

type ScoreRow = {
  id: string;
  assessmentName: string;
  subject: string;
  classLabel: string;
  score: number;
  maxScore: number;
  percentage: number;
  termId: string;
  termName: string;
  academicYear: string;
};

type UnlockResult = {
  school: { name: string; logoUrl: string | null; joinCode: string };
  student: {
    name: string;
    studentId: string | null;
    grade: string;
    section: string | null;
    cardCode: string | null;
    photoUrl: string | null;
  };
  terms: { termId: string; termName: string; academicYear: string }[];
  scores: ScoreRow[];
  unlockedAt: string;
};

function CardResultsInner() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const initialSchool = (searchParams.get("s") ?? "").trim();
  const initialCard = (searchParams.get("c") ?? "").trim().toUpperCase();

  const [schoolCode, setSchoolCode] = useState(initialSchool);
  const [cardCode, setCardCode] = useState(initialCard);
  const [password, setPassword] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaError, setMetaError] = useState("");
  const [metaLoading, setMetaLoading] = useState(Boolean(initialSchool && initialCard));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<UnlockResult | null>(null);
  const [termFilter, setTermFilter] = useState<string>("all");

  useEffect(() => {
    if (!initialSchool || !initialCard) {
      setMetaLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setMetaLoading(true);
      setMetaError("");
      try {
        const res = await fetch(
          `${getApiBaseUrl()}/public/student-results/meta?s=${encodeURIComponent(initialSchool)}&c=${encodeURIComponent(initialCard)}`,
        );
        if (!res.ok) throw new Error("not found");
        const json = (await res.json()) as Meta;
        if (cancelled) return;
        setMeta(json);
        setSchoolCode(json.school.joinCode);
        setCardCode(json.student.cardCode ?? initialCard);
      } catch {
        if (!cancelled) {
          setMetaError(t("publicQrResultsUi.invalidLink"));
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSchool, initialCard]);

  async function onUnlock(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/public/student-results/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: schoolCode.trim(),
          cardCode: cardCode.trim(),
          password,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string | string[];
      };
      if (!res.ok) {
        const msg = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message;
        throw new Error(msg || t("publicQrResultsUi.unlockFailed"));
      }
      const json = body as unknown as UnlockResult;
      setData(json);
      setTermFilter("all");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("publicQrResultsUi.unlockFailed"));
    } finally {
      setBusy(false);
    }
  }

  const visibleScores = useMemo(() => {
    if (!data) return [];
    if (termFilter === "all") return data.scores;
    return data.scores.filter((s) => s.termId === termFilter);
  }, [data, termFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ScoreRow[]>();
    for (const row of visibleScores) {
      const key = row.subject;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [visibleScores]);

  return (
    <main className="src-page">
      <style>{`
        .src-page {
          min-height: 100vh;
          margin: 0;
          padding: 1.25rem 1rem 2.5rem;
          background:
            radial-gradient(circle at top left, rgba(20,125,118,0.14), transparent 42%),
            linear-gradient(180deg, #e8f3f2 0%, #f7fafb 48%, #fff 100%);
          font-family: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
          color: #152028;
        }
        .src-shell {
          max-width: 28rem;
          margin: 0 auto;
        }
        .src-brand {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1rem;
          color: #0f5f5a;
        }
        .src-brand strong { display: block; letter-spacing: 0.12em; font-size: 0.9rem; }
        .src-brand span { display: block; font-size: 0.8rem; opacity: 0.85; }
        .src-card {
          background: #fff;
          border: 1px solid #c9dbd9;
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(20, 125, 118, 0.12);
          overflow: hidden;
        }
        .src-card__head {
          display: flex;
          gap: 0.85rem;
          align-items: center;
          padding: 1.1rem 1.15rem;
          background: #147d76;
          color: #fff;
        }
        .src-card__logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #fff;
          object-fit: contain;
          flex-shrink: 0;
        }
        .src-card__logo--text {
          display: grid;
          place-items: center;
          font-weight: 800;
          color: #147d76;
          font-size: 0.85rem;
        }
        .src-card__head h1 {
          margin: 0;
          font-size: 1.05rem;
          line-height: 1.25;
        }
        .src-card__head p {
          margin: 0.2rem 0 0;
          opacity: 0.9;
          font-size: 0.85rem;
        }
        .src-card__body { padding: 1.15rem 1.15rem 1.35rem; }
        .src-note {
          margin: 0 0 1rem;
          color: #3d5553;
          font-size: 0.92rem;
          line-height: 1.45;
        }
        .src-field { display: grid; gap: 0.3rem; margin-bottom: 0.75rem; }
        .src-field span {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #5a7270;
        }
        .src-field input {
          border: 1px solid #c9dbd9;
          border-radius: 10px;
          padding: 0.7rem 0.8rem;
          font: inherit;
          font-size: 1rem;
        }
        .src-field input:focus {
          outline: 2px solid rgba(20,125,118,0.35);
          border-color: #147d76;
        }
        .src-btn {
          width: 100%;
          margin-top: 0.35rem;
          border: 0;
          border-radius: 10px;
          padding: 0.8rem 1rem;
          background: #147d76;
          color: #fff;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }
        .src-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .src-err {
          margin: 0 0 0.85rem;
          padding: 0.65rem 0.75rem;
          border-radius: 10px;
          background: #fdecec;
          color: #8a1f1f;
          font-size: 0.9rem;
        }
        .src-loading { padding: 2rem 1rem; text-align: center; color: #3d5553; }
        .src-student {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 1rem;
        }
        .src-avatar {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          overflow: hidden;
          background: #e8f5f4;
          display: grid;
          place-items: center;
          font-weight: 800;
          color: #0f5f5a;
          flex-shrink: 0;
        }
        .src-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .src-student h2 { margin: 0; font-size: 1.15rem; }
        .src-student p { margin: 0.15rem 0 0; color: #3d5553; font-size: 0.9rem; }
        .src-select {
          width: 100%;
          margin-bottom: 0.9rem;
          border: 1px solid #c9dbd9;
          border-radius: 10px;
          padding: 0.55rem 0.7rem;
          font: inherit;
          background: #fff;
        }
        .src-subject { margin-bottom: 0.85rem; }
        .src-subject h3 {
          margin: 0 0 0.4rem;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #5a7270;
        }
        .src-row {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.55rem 0.65rem;
          border-radius: 10px;
          background: #f4faf9;
          margin-bottom: 0.35rem;
        }
        .src-row strong { font-size: 0.92rem; }
        .src-row span { color: #3d5553; font-size: 0.82rem; }
        .src-score {
          font-weight: 800;
          color: #0f5f5a;
          white-space: nowrap;
        }
        .src-empty {
          padding: 1rem;
          text-align: center;
          color: #3d5553;
          background: #f4faf9;
          border-radius: 12px;
        }
        .src-foot {
          margin-top: 1rem;
          text-align: center;
          font-size: 0.85rem;
          color: #5a7270;
        }
        .src-foot a { color: #147d76; font-weight: 700; }
        .src-lockout {
          margin-top: 0.75rem;
          width: 100%;
          border: 1px solid #c9dbd9;
          background: #fff;
          border-radius: 10px;
          padding: 0.55rem;
          font: inherit;
          color: #0f5f5a;
          font-weight: 650;
          cursor: pointer;
        }
      `}</style>

      <div className="src-shell">
        <div className="src-brand">
          <BrandMark className="brand-mark" />
          <div>
            <strong>{BRAND_NAME}</strong>
            <span lang="am">
              {t("publicQrResultsUi.brandSub", { brandAm: BRAND_NAME_AM })}
            </span>
          </div>
        </div>

        <section className="src-card">
          {metaLoading ? (
            <div className="src-loading">{t("publicQrResultsUi.loadingCard")}</div>
          ) : data ? (
            <>
              <header className="src-card__head">
                {data.school.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="src-card__logo"
                    src={data.school.logoUrl}
                    alt=""
                  />
                ) : (
                  <span className="src-card__logo src-card__logo--text" aria-hidden>
                    {data.school.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div>
                  <h1>{data.school.name}</h1>
                  <p>{t("publicQrResultsUi.publishedResults")}</p>
                </div>
              </header>
              <div className="src-card__body">
                <div className="src-student">
                  <div className="src-avatar">
                    {data.student.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.student.photoUrl} alt="" />
                    ) : (
                      <span aria-hidden>
                        {data.student.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2>{data.student.name}</h2>
                    <p>
                      {data.student.grade}
                      {data.student.section ? ` · ${data.student.section}` : ""}
                      {data.student.studentId
                        ? ` · ${data.student.studentId}`
                        : ""}
                    </p>
                  </div>
                </div>

                {data.terms.length > 1 ? (
                  <select
                    className="src-select"
                    value={termFilter}
                    onChange={(e) => setTermFilter(e.target.value)}
                  >
                    <option value="all">{t("publicQrResultsUi.allTerms")}</option>
                    {data.terms.map((t) => (
                      <option key={t.termId} value={t.termId}>
                        {t.academicYear} · {t.termName}
                      </option>
                    ))}
                  </select>
                ) : null}

                {grouped.length === 0 ? (
                  <div className="src-empty">
                    {t("publicQrResultsUi.emptyScores")}
                  </div>
                ) : (
                  grouped.map(([subject, rows]) => (
                    <div key={subject} className="src-subject">
                      <h3>{subject}</h3>
                      {rows.map((row) => (
                        <div key={row.id} className="src-row">
                          <div>
                            <strong>{row.assessmentName}</strong>
                            <div>
                              <span>
                                {row.academicYear} · {row.termName}
                              </span>
                            </div>
                          </div>
                          <div className="src-score">
                            {row.score}/{row.maxScore}
                            <div>
                              <span>{row.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}

                <button
                  type="button"
                  className="src-lockout"
                  onClick={() => setData(null)}
                >
                  {t("publicQrResultsUi.lockSignOut")}
                </button>
              </div>
            </>
          ) : (
            <>
              <header className="src-card__head">
                {meta?.school.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="src-card__logo"
                    src={meta.school.logoUrl}
                    alt=""
                  />
                ) : (
                  <span className="src-card__logo src-card__logo--text" aria-hidden>
                    {(meta?.school.name ?? "ID").slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div>
                  <h1>
                    {meta?.school.name ?? t("publicQrResultsUi.studentResults")}
                  </h1>
                  <p>
                    {meta
                      ? `${meta.student.displayName} · ${meta.student.grade}${
                          meta.student.section
                            ? ` · ${meta.student.section}`
                            : ""
                        }`
                      : t("publicQrResultsUi.scanThenPassword")}
                  </p>
                </div>
              </header>
              <div className="src-card__body">
                {metaError ? <p className="src-err">{metaError}</p> : null}
                {error ? <p className="src-err">{error}</p> : null}
                <p className="src-note">
                  {t("publicQrResultsUi.note")}
                </p>
                <form onSubmit={onUnlock}>
                  {!initialSchool ? (
                    <label className="src-field">
                      <span>{t("publicQrResultsUi.schoolCode")}</span>
                      <input
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value)}
                        autoComplete="organization"
                        required
                      />
                    </label>
                  ) : null}
                  {!initialCard ? (
                    <label className="src-field">
                      <span>{t("publicQrResultsUi.cardCode")}</span>
                      <input
                        value={cardCode}
                        onChange={(e) =>
                          setCardCode(e.target.value.toUpperCase())
                        }
                        autoComplete="off"
                        required
                      />
                    </label>
                  ) : null}
                  <label className="src-field">
                    <span>{t("publicQrResultsUi.password")}</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      minLength={8}
                      required
                    />
                  </label>
                  <button type="submit" className="src-btn" disabled={busy}>
                    {busy ? t("publicQrResultsUi.unlocking") : t("publicQrResultsUi.viewResults")}
                  </button>
                </form>
              </div>
            </>
          )}
        </section>

        <p className="src-foot">
          {t("publicQrResultsUi.fullPortal")}{" "}
          <Link href="/login">
            {t("publicQrResultsUi.signInBrand", { brand: BRAND_NAME })}
          </Link>
        </p>
      </div>
    </main>
  );
}

function CardResultsFallback() {
  const { t } = useLocale();
  return (
    <main style={{ padding: "2rem" }}>{t("publicQrResultsUi.suspenseLoading")}</main>
  );
}

export default function StudentCardResultsPage() {
  return (
    <Suspense fallback={<CardResultsFallback />}>
      <CardResultsInner />
    </Suspense>
  );
}
