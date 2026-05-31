"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { listGradesForAttendance } from "@/lib/attendance";
import type { GradeWithSections } from "@/lib/api";
import { scanStudentAttendance, type ScanAttendanceResult } from "@/lib/student-cards";

const SCANNER_ID = "attendance-qr-reader";

type Props = Record<string, never>;

export function AttendanceScanner(_props: Props) {
  const searchParams = useSearchParams();
  const initialGradeId = searchParams.get("gradeId") ?? "";
  const initialSectionId = searchParams.get("sectionId") ?? "";

  const today = new Date().toISOString().slice(0, 10);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(today);
  const [manualCode, setManualCode] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [scanned, setScanned] = useState<ScanAttendanceResult[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const selectedGrade = grades.find((g) => g.id === gradeId);

  useEffect(() => {
    void listGradesForAttendance()
      .then((g) => {
        setGrades(g);
        const preferred =
          initialGradeId && g.some((x) => x.id === initialGradeId)
            ? initialGradeId
            : g[0]?.id ?? "";
        setGradeId(preferred);
        if (
          initialSectionId &&
          g.find((x) => x.id === preferred)?.sections.some((s) => s.id === initialSectionId)
        ) {
          setSectionId(initialSectionId);
        }
      })
      .catch(() => undefined);
  }, [initialGradeId, initialSectionId]);

  const processCode = useCallback(
    async (raw: string) => {
      if (!gradeId || processingRef.current) return;
      processingRef.current = true;
      setBusy(true);
      setFlash(null);
      try {
        const result = await scanStudentAttendance({
          code: raw,
          date,
          gradeId,
          sectionId: sectionId || undefined,
          periodNumber: 0,
        });
        setScanned((prev) => {
          const without = prev.filter((p) => p.studentProfileId !== result.studentProfileId);
          return [result, ...without];
        });
        setFlash({ type: "ok", text: `✓ ${result.name} — marked present` });
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(80);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Scan failed";
        setFlash({ type: "err", text: msg });
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([60, 40, 60]);
        }
      } finally {
        setBusy(false);
        window.setTimeout(() => {
          processingRef.current = false;
        }, 600);
      }
    },
    [date, gradeId, sectionId],
  );

  async function startCamera() {
    if (scannerRef.current) return;
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;
    setCameraOn(true);
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decoded) => {
          void processCode(decoded);
        },
        () => undefined,
      );
    } catch {
      setCameraOn(false);
      scannerRef.current = null;
      setFlash({
        type: "err",
        text: "Camera not available. Type the code from the card below.",
      });
    }
  }

  async function stopCamera() {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.stop();
      await scannerRef.current.clear();
    } catch {
      /* ignore */
    }
    scannerRef.current = null;
    setCameraOn(false);
  }

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, []);

  return (
    <div className="att-page">
      <div className="att-mark-toolbar">
        <div className="att-field">
          <span>Homeroom grade</span>
          <select
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSectionId("");
              setScanned([]);
            }}
            disabled={grades.length === 0}
          >
            {grades.length === 0 ? (
              <option value="">No classes assigned</option>
            ) : null}
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="att-field">
          <span>Section</span>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All sections</option>
            {selectedGrade?.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="att-field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {flash ? (
        <p className={`scan-flash scan-flash--${flash.type}`} role="status">
          {flash.text}
        </p>
      ) : null}

      <div className="scan-layout">
        <div>
          <div className="scan-camera-wrap">
            <div id={SCANNER_ID} />
            {!cameraOn ? (
              <div
                style={{
                  padding: "3rem 1rem",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                }}
              >
                Camera preview appears here
              </div>
            ) : null}
          </div>
          <div className="scan-manual no-print">
            {!cameraOn ? (
              <button type="button" className="att-btn att-btn--primary" onClick={() => void startCamera()}>
                Start camera
              </button>
            ) : (
              <button type="button" className="att-btn att-btn--ghost" onClick={() => void stopCamera()}>
                Stop camera
              </button>
            )}
            <input
              placeholder="Or type card code…"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualCode.trim()) {
                  void processCode(manualCode.trim());
                  setManualCode("");
                }
              }}
            />
            <button
              type="button"
              className="att-btn att-btn--ghost"
              disabled={busy || !manualCode.trim()}
              onClick={() => {
                void processCode(manualCode.trim());
                setManualCode("");
              }}
            >
              Mark
            </button>
          </div>
          <p className="cfg-hint" style={{ marginTop: "0.5rem" }}>
            Point the camera at the student&apos;s QR code. Each scan marks them <strong>present</strong> for
            today.
          </p>
        </div>

        <aside className="scan-log">
          <h3 className="scan-log__title">
            Scanned today ({scanned.length})
          </h3>
          {scanned.length === 0 ? (
            <p className="scan-log__empty">No scans yet. Students appear here as you scan.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {scanned.map((s) => (
                <li key={s.studentProfileId} className="scan-log-item">
                  <span className="scan-log-item__check" aria-hidden>
                    ✓
                  </span>
                  <div>
                    <div className="scan-log-item__name">{s.name}</div>
                    <div className="scan-log-item__meta">
                      {s.grade}
                      {s.section ? ` · ${s.section}` : ""}
                      {s.cardCode ? ` · ${s.cardCode}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
