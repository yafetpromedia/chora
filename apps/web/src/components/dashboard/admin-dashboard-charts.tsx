"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { AdminAnalyticsOverview } from "@/lib/dashboard-analytics";

const W = 560;
const H = 200;
const PAD = { t: 16, r: 12, b: 8, l: 12 };

function chartPoints(trend: AdminAnalyticsOverview["attendanceTrend"]) {
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const n = trend.length;

  return trend.map((d, i) => {
    const x = PAD.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const rate = d.rate ?? 0;
    const y = PAD.t + innerH - (rate / 100) * innerH;
    return { x, y, rate, day: d };
  });
}

function linePath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function areaPath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return "";
  const bottom = H - PAD.b;
  const start = `M ${pts[0].x} ${bottom} L ${pts[0].x} ${pts[0].y}`;
  const line = pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
  const end = `L ${pts[pts.length - 1].x} ${bottom} Z`;
  return `${start} ${line} ${end}`;
}

export function AttendanceAreaChart({
  trend,
}: {
  trend: AdminAnalyticsOverview["attendanceTrend"];
}) {
  const { t } = useLocale();
  const hasData = trend.some((d) => d.marked > 0);
  const pts = chartPoints(trend);

  if (!hasData) {
    return (
      <div className="adm-chart-empty">
        <div className="adm-chart-empty__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <p>{t("adminDash.markToSeeTrends")}</p>
      </div>
    );
  }

  return (
    <div>
      <svg
        className="adm-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={t("adminDash.attendanceTrend7Aria")}
      >
        <defs>
          <linearGradient id="admChartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = PAD.t + (H - PAD.t - PAD.b) * (1 - pct / 100);
          return (
            <line
              key={pct}
              className="adm-chart__grid-line"
              x1={PAD.l}
              y1={y}
              x2={W - PAD.r}
              y2={y}
            />
          );
        })}
        <path className="adm-chart__area" d={areaPath(pts)} />
        <path className="adm-chart__line" d={linePath(pts)} />
        {pts.map((p) =>
          p.day.rate != null ? (
            <circle key={p.day.date} className="adm-chart__dot" cx={p.x} cy={p.y} r="5" />
          ) : null,
        )}
      </svg>
      <div className="adm-chart-labels">
        {trend.map((d) => (
          <span key={d.date}>
            {d.weekday}
            <strong>{d.rate != null ? `${d.rate}%` : "—"}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProgressRing({
  pct,
  size = 140,
  stroke = 10,
  label,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;

  return (
    <div className="adm-today__ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="admRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
        </defs>
        <circle
          className="adm-today__ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
        />
        <circle
          className="adm-today__ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="adm-today__center">
        <span className="adm-today__pct">{pct > 0 || label ? `${pct}%` : "—"}</span>
        {label ? <span className="adm-today__lbl">{label}</span> : null}
      </div>
    </div>
  );
}

export function FinanceDonut({
  collectedPct,
  size = 160,
}: {
  collectedPct: number;
  size?: number;
}) {
  const { t } = useLocale();
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (collectedPct / 100) * c;

  return (
    <div className="adm-finance__visual" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="admFinanceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#admFinanceGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="adm-finance__center">
        <span className="adm-finance__pct">{collectedPct}%</span>
        <span className="adm-today__lbl">{t("adminDash.collectedLabel")}</span>
      </div>
    </div>
  );
}