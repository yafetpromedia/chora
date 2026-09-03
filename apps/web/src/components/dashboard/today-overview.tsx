"use client";

import Link from "next/link";
import { EtbAmount } from "@/components/billing/etb-amount";
import { formatEtbPlain } from "@/lib/currency";
import type { AdminDayOverview, ParentDayOverview } from "@/lib/dashboard-day";
import { DashIcon } from "@/components/dashboard/dash-icons";

function attendanceLabel(status: string) {
  if (status === "present" || status === "late" || status === "excused") {
    return { text: "Present", tone: "ok" as const };
  }
  if (status === "absent") return { text: "Absent", tone: "bad" as const };
  return { text: "Not marked yet", tone: "muted" as const };
}

export function AdminTodayOverview({ day }: { day: AdminDayOverview }) {
  return (
    <section className="dash-admin-today" aria-label="Today overview">
      <div className="dash-admin-today__head">
        <h2 className="dash-admin-today__title">Today at a glance</h2>
        <span className="dash-admin-today__date">{day.date}</span>
      </div>

      <div className="dash-admin-today__grid">
        <div className="dash-admin-today__stat">
          <span className="dash-admin-today__value">
            {day.attendance.rate != null ? `${day.attendance.rate}%` : "—"}
          </span>
          <span className="dash-admin-today__label">Attendance</span>
        </div>
        <div className="dash-admin-today__stat">
          <span className="dash-admin-today__value">{day.finance.pendingPayments}</span>
          <span className="dash-admin-today__label">Payments pending</span>
        </div>
        <div className="dash-admin-today__stat">
          <span className="dash-admin-today__value">{day.staff.classesMarkedToday}</span>
          <span className="dash-admin-today__label">Classes marked</span>
        </div>
        <div className="dash-admin-today__stat">
          <span className="dash-admin-today__value">{day.staff.teachersTotal}</span>
          <span className="dash-admin-today__label">Teachers</span>
        </div>
      </div>

      {day.finance.outstandingCents != null ? (
        <p className="dash-admin-today__note">
          Outstanding fees: <strong><EtbAmount cents={day.finance.outstandingCents} /></strong>
          {day.finance.unpaidStudents != null ? ` · ${day.finance.unpaidStudents} students` : ""}
        </p>
      ) : null}

      {day.alerts.items.length > 0 ? (
        <ul className="dash-admin-alerts">
          {day.alerts.items.map((a) => (
            <li key={a.type}>
              <Link href={a.href} className="dash-admin-alert">
                <span className="dash-admin-alert__count">{a.count}</span>
                <span>{a.label}</span>
                <DashIcon name="chevron" className="dash-icon--xs" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dash-admin-today__note dash-admin-today__note--ok">No urgent alerts for today.</p>
      )}

      <div className="dash-admin-today__actions">
        <Link href="/admin/attendance" className="dash-admin-chip-link">
          Attendance
        </Link>
        <Link href="/admin/results" className="dash-admin-chip-link">
          Results
        </Link>
        <Link href="/admin/finance" className="dash-admin-chip-link">
          Finance
        </Link>
        <Link href="/admin/results/promotion" className="dash-admin-chip-link">
          Year promotion
        </Link>
      </div>
    </section>
  );
}

export function ParentTodayOverview({ day }: { day: ParentDayOverview }) {
  if (day.children.length === 0) {
    return (
      <section className="dash-panel dash-panel--flat">
        <p className="setup-hint">No children linked to your account.</p>
      </section>
    );
  }

  return (
    <section className="dash-panel dash-panel--flat dash-today" aria-label="Your children today">
      <div className="dash-panel-head">
        <h2 className="dash-panel-title">Your children today</h2>
        <span className="dash-panel-badge">{day.date}</span>
      </div>
      {day.totalDueCents > 0 ? (
        <p className="auth-alert" style={{ marginBottom: "0.75rem" }}>
          Total fees due: <EtbAmount cents={day.totalDueCents} /> —{" "}
          <Link href="/parent/fees">Pay or view details</Link>
        </p>
      ) : null}
      <ul className="dash-list">
        {day.children.map((child) => {
          const att = attendanceLabel(child.attendanceToday);
          return (
            <li key={child.profileId} className="dash-list-item dash-list-item--stack">
              <div>
                <p className="dash-list-title">{child.name}</p>
                <p className="dash-list-meta">
                  {child.grade}
                  {child.section ? ` · ${child.section}` : ""}
                </p>
                <p className="setup-hint">
                  Attendance: <strong>{att.text}</strong>
                  {child.performanceLabel
                    ? ` · Performance: ${child.performanceLabel}${
                        child.overallAverage != null ? ` (${child.overallAverage}%)` : ""
                      }`
                    : ""}
                  {child.outstandingCents > 0
                    ? ` · Fees: ${formatEtbPlain(child.outstandingCents)} due`
                    : " · Fees: up to date"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
