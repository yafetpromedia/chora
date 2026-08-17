"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { listGradesForAttendance } from "@/lib/attendance";
import type { GradeWithSections } from "@/lib/api";
import { getMyTeacherProfile } from "@/lib/teachers";
import { scanStudentAttendance, type ScanAttendanceResult } from "@/lib/student-cards";
import { AppToast } from "@/components/ui/app-toast";

const SCANNER_ID = "attendance-qr-reader";

type Props = Record<string, never>;

export function AttendanceScanner(_props: Props) {
  return (
    <Suspense fallback={<p className="tch-meta">Loading scanner…</p>}>
      <AttendanceScannerInner />
    </Suspense>
  );
}

function AttendanceScannerInner() {
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
  const [flash, setFlash] = useState<{ type: "ok" | "dup" | "err"; text: string } | null>(null);
  const [scanned, setScanned] = useState<ScanAttendanceResult[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const selectedGrade = grades.find((g) => g.id === gradeId);

  useEffect(() => {
    void Promise.all([
      listGradesForAttendance(),
      getMyTeacherProfile().catch(() => null),
    ])
      .then(([g, profile]) => {
        setGrades(g);
        const homeroom = profile?.homeroom;
        const preferred =
          initialGradeId && g.some((x) => x.id === initialGradeId)
            ? initialGradeId
            : homeroom?.gradeId && g.some((x) => x.id === homeroom.gradeId)
              ? homeroom.gradeId
              : g[0]?.id ?? "";
        setGradeId(preferred);
        const grade = g.find((x) => x.id === preferred);
        const sectionPreferred =
          initialSectionId && grade?.sections.some((s) => s.id === initialSectionId)
            ? initialSectionId
            : homeroom?.sectionId && grade?.sections.some((s) => s.id === homeroom.sectionId)
              ? homeroom.sectionId
              : "";
        setSectionId(sectionPreferred);
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
        setFlash({
          type: result.alreadyMarked ? "dup" : "ok",
          text: result.alreadyMarked
            ? `✓ ${result.name} — already marked present`
            : `✓ ${result.name} — marked present`,
        });
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(result.alreadyMarked ? [40, 30, 40] : 80);
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
        { fps: 10, qrbox: { width: 200, height: 200 } },
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

  const classLabel = selectedGrade
    ? `${selectedGrade.name}${sectionId ? ` · ${selectedGrade.sections.find((s) => s.id === sectionId)?.name ?? ""}` : ""}`
    : "Select class";

  return (
    <div className="att-v4__workspace">
      <section className="att-v4__filters">
        <div className="att-v4__field">
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
        <div className="att-v4__field">
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
        <div className="att-v4__field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="att-v4__filter-meta">
          <span className="att-v4__filter-class">{classLabel}</span>
          <span className="att-v4__filter-count">{scanned.length} scanned</span>
        </div>
      </section>

      <AppToast
        message={flash?.type === "ok" ? flash.text : ""}
        tone="success"
        onDismiss={() => setFlash(null)}
      />
      <AppToast
        message={flash?.type === "dup" ? flash.text : ""}
        tone="warn"
        onDismiss={() => setFlash(null)}
      />
      <AppToast
        message={flash?.type === "err" ? flash.text : ""}
        tone="error"
        onDismiss={() => setFlash(null)}
      />

      <div className="att-v4__scan-layout">
        <section className="att-v4__scan-main">
          <div className={`att-v4__camera${cameraOn ? " att-v4__camera--live" : ""}`}>
            <div className="att-v4__camera-frame" aria-hidden />
            <div id={SCANNER_ID} className="att-v4__camera-reader" />
            {!cameraOn ? (
              <div className="att-v4__camera-idle">
                <span className="att-v4__camera-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                    <path d="M7 7h10v10H7z" />
                    <path d="M9 9h2v2H9zM13 9h2v2h-2zM9 13h2v2H9zM13 13h2v2h-2z" />
                  </svg>
                </span>
                <p className="att-v4__camera-title">Ready to scan</p>
                <p className="att-v4__camera-hint">Start the camera and point it at a student QR code</p>
              </div>
            ) : null}
          </div>

          <div className="att-v4__manual no-print">
            {!cameraOn ? (
              <button
                type="button"
                className="att-v4__btn att-v4__btn--primary"
                onClick={() => void startCamera()}
              >
                Start camera
              </button>
            ) : (
              <button
                type="button"
                className="att-v4__btn att-v4__btn--ghost"
                onClick={() => void stopCamera()}
              >
                Stop camera
              </button>
            )}
            <label className="att-v4__code-input">
              <span className="sr-only">Card code</span>
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
            </label>
            <button
              type="button"
              className="att-v4__btn att-v4__btn--ghost"
              disabled={busy || !manualCode.trim()}
              onClick={() => {
                void processCode(manualCode.trim());
                setManualCode("");
              }}
            >
              Mark
            </button>
          </div>
          <p className="att-v4__hint">
            Each successful scan marks the student <strong>present</strong> for the selected date.
          </p>
        </section>

        <aside className="att-v4__log">
          <header className="att-v4__log-head">
            <h2 className="att-v4__log-title">Scanned today</h2>
            <span className="att-v4__log-badge">{scanned.length}</span>
          </header>
          {scanned.length === 0 ? (
            <div className="att-v4__log-empty">
              <span className="att-v4__log-empty-icon" aria-hidden>◎</span>
              <p>No scans yet</p>
              <span>Students appear here as you scan their cards</span>
            </div>
          ) : (
            <ul className="att-v4__log-list">
              {scanned.map((s) => (
                <li key={s.studentProfileId} className="att-v4__log-item">
                  <span className="att-v4__log-check" aria-hidden>
                    ✓
                  </span>
                  <div className="att-v4__log-body">
                    <p className="att-v4__log-name">{s.name}</p>
                    <p className="att-v4__log-meta">
                      {s.grade}
                      {s.section ? ` · ${s.section}` : ""}
                      {s.cardCode ? ` · ${s.cardCode}` : ""}
                    </p>
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
