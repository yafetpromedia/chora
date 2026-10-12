"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME, BRAND_NAME_AM } from "@/lib/brand";
import { getApiBaseUrl } from "@/lib/api";

type VerifyResult = {
  valid: boolean;
  reportType?: string;
  school: { name: string; logoUrl: string | null };
  student: {
    name: string;
    grade: string;
    section: string | null;
  };
  academicYear: string;
  issued?: boolean;
  verifiedAt: string;
  platform: { name: string; nameAm: string };
};

function VerifyInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") ?? "";
  const [data, setData] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("This verification link is incomplete.");
      setLoading(false);
      return;
    }
    void fetch(
      `${getApiBaseUrl()}/public/report-cards/verify?t=${encodeURIComponent(token)}`,
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("invalid");
        return (await res.json()) as VerifyResult;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError("This report card could not be verified. The link may be invalid.");
        setLoading(false);
      });
  }, [token]);

  return (
    <main className="rc-verify-page">
      <style>{`
        .rc-verify-page {
          min-height: 100vh;
          margin: 0;
          padding: 2rem 1.25rem 3rem;
          background:
            radial-gradient(circle at top left, rgba(20,125,118,0.12), transparent 40%),
            linear-gradient(180deg, #eef5f4 0%, #f7fafb 45%, #ffffff 100%);
          font-family: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
          color: #152028;
        }
        .rc-verify-card {
          max-width: 32rem;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #c9dbd9;
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(20, 125, 118, 0.12);
          overflow: hidden;
        }
        .rc-verify-card__head {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.1rem 1.25rem;
          background: #147d76;
          color: #fff;
        }
        .rc-verify-card__head strong {
          display: block;
          letter-spacing: 0.14em;
          font-size: 0.95rem;
        }
        .rc-verify-card__head span {
          display: block;
          opacity: 0.9;
          font-size: 0.85rem;
        }
        .rc-verify-mark .brand-mark {
          width: 36px;
          height: 36px;
          display: block;
          object-fit: contain;
          background: #fff;
          border-radius: 999px;
          padding: 2px;
        }
        .rc-verify-card__body { padding: 1.35rem 1.25rem 1.5rem; }
        .rc-verify-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          background: #e8f5f4;
          color: #0f5f5a;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .rc-verify-card h1 {
          margin: 0.85rem 0 0.35rem;
          font-size: 1.45rem;
          line-height: 1.2;
        }
        .rc-verify-card .school {
          margin: 0 0 1.1rem;
          color: #5b6770;
          font-weight: 600;
        }
        .rc-verify-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .rc-verify-grid div {
          border: 1px solid #dce6e8;
          border-radius: 10px;
          padding: 0.7rem 0.8rem;
          background: #f7fbfb;
        }
        .rc-verify-grid em {
          display: block;
          font-style: normal;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #147d76;
        }
        .rc-verify-grid strong {
          display: block;
          margin-top: 0.25rem;
          font-size: 1rem;
        }
        .rc-verify-foot {
          margin-top: 1.1rem;
          font-size: 0.82rem;
          color: #64748b;
          text-align: center;
        }
        .rc-verify-error, .rc-verify-loading {
          max-width: 32rem;
          margin: 4rem auto;
          text-align: center;
          color: #475569;
        }
        .rc-verify-error { color: #b91c1c; font-weight: 600; }
        @media (max-width: 520px) {
          .rc-verify-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {loading ? (
        <p className="rc-verify-loading">Verifying report card…</p>
      ) : error ? (
        <div className="rc-verify-card">
          <div className="rc-verify-card__head">
            <BrandMark className="rc-verify-mark" />
            <div>
              <strong>{BRAND_NAME.toUpperCase()}</strong>
              <span>{BRAND_NAME_AM}</span>
            </div>
          </div>
          <div className="rc-verify-card__body">
            <p className="rc-verify-error">{error}</p>
          </div>
        </div>
      ) : data ? (
        <div className="rc-verify-card">
          <div className="rc-verify-card__head">
            <BrandMark className="rc-verify-mark" />
            <div>
              <strong>{BRAND_NAME.toUpperCase()}</strong>
              <span>{BRAND_NAME_AM}</span>
            </div>
          </div>
          <div className="rc-verify-card__body">
            <span className="rc-verify-badge">✓ Official report verified</span>
            <h1>{data.student.name}</h1>
            <p className="school">{data.school.name}</p>
            <div className="rc-verify-grid">
              <div>
                <em>Report type</em>
                <strong>
                  {data.reportType === "yearly" ? "Yearly report card" : "Report card"}
                </strong>
              </div>
              <div>
                <em>Grade</em>
                <strong>
                  {data.student.grade}
                  {data.student.section ? ` · ${data.student.section}` : ""}
                </strong>
              </div>
              <div>
                <em>Academic Year</em>
                <strong>{data.academicYear}</strong>
              </div>
              <div>
                <em>Status</em>
                <strong>{data.issued ? "Valid" : "Valid"}</strong>
              </div>
            </div>
            <p className="rc-verify-foot">
              Verified {new Date(data.verifiedAt).toLocaleString()} · Powered by{" "}
              {data.platform.name} ({data.platform.nameAm}). Marks and private details are not
              shown on this public page.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function VerifyReportCardPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem", textAlign: "center" }}>Loading…</p>}>
      <VerifyInner />
    </Suspense>
  );
}
