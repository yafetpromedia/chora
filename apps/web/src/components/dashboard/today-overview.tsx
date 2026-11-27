"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { EtbAmount } from "@/components/billing/etb-amount";
import { formatEtbPlain } from "@/lib/currency";
import type { AdminDayOverview, ParentDayOverview } from "@/lib/dashboard-day";
import { DashIcon } from "@/components/dashboard/dash-icons";

function useAttendanceLabel() {
  const { t } = useLocale();
  return (status: string) => {
    if (status === "present" || status === "late" || status === "excused") {
      return { text: t("adminDash.present"), tone: "ok" as const };
    }
    if (status === "absent") return { text: t("adminDash.absent"), tone: "bad" as const };
    return { text: t("staffDash.notMarkedYet"), tone: "muted" as const };
  };
}

export function AdminTodayOverview({ day }: { day: AdminDayOverview }) {
  const { t, tn } = useLocale();

  return (
    <section className="dash-admin-today" aria-label={t("staffDash.todayOverviewAria")}>
      <div className="dash-admin-today__head">
        <h2 className="dash-admin-today__title">{t("staffDash.todayGlance")}</h2>
        <span className="dash-admin-today__date">{day.date}</span>
      </div>

      <div className="dash-admin-today__grid">
        <div className="dash-admin-today__stat">
          <span className="dash-admin-today__value">
            {day.attendance.rate != null ? `${day.attendance.rate}%` : "—"}
          </span>
          <span className="dash-admin-today__label">{t("dash.attendance")}</span>
        </div>
        <div className="dash-admin-today__stat">
          <span className="dash-admin-today__value">{day.finance.pendingPayments}</span>
          <span className="dash-admin-today__label">{t("staffDash.paymentsPending")}</span>
        </div>
        <div className="dash-admin-today__stat">
          <span className="dash-admin-today__value">{day.staff.classesMarkedToday}</span>
          <span className="dash-admin-today__label">{t("staffDash.classesMarked")}</span>
        </div>
        <div className="dash-admin-today__stat">
          <span className="dash-admin-today__value">{day.staff.teachersTotal}</span>
          <span className="dash-admin-today__label">{tn("Teachers")}</span>
        </div>
      </div>

      {day.finance.outstandingCents != null ? (
        <p className="dash-admin-today__note">
          {t("staffDash.outstandingFees")}{" "}
          <strong><EtbAmount cents={day.finance.outstandingCents} /></strong>
          {day.finance.unpaidStudents != null
            ? ` ${t("staffDash.studentsSuffix", { count: day.finance.unpaidStudents })}`
            : ""}
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
        <p className="dash-admin-today__note dash-admin-today__note--ok">
          {t("staffDash.noUrgentAlerts")}
        </p>
      )}

      <div className="dash-admin-today__actions">
        <Link href="/admin/attendance" className="dash-admin-chip-link">
          {t("dash.attendance")}
        </Link>
        <Link href="/admin/results" className="dash-admin-chip-link">
          {t("dash.results")}
        </Link>
        <Link href="/admin/finance" className="dash-admin-chip-link">
          {t("dash.fees")}
        </Link>
        <Link href="/admin/results/promotion" className="dash-admin-chip-link">
          {t("staffDash.yearPromotion")}
        </Link>
      </div>
    </section>
  );
}

export function ParentTodayOverview({ day }: { day: ParentDayOverview }) {
  const { t } = useLocale();
  const attendanceLabel = useAttendanceLabel();

  if (day.children.length === 0) {
    return (
      <section className="dash-panel dash-panel--flat">
        <p className="setup-hint">{t("staffDash.noChildrenLinked")}</p>
      </section>
    );
  }

  return (
    <section className="dash-panel dash-panel--flat dash-today" aria-label={t("staffDash.yourChildrenTodayAria")}>
      <div className="dash-panel-head">
        <h2 className="dash-panel-title">{t("staffDash.yourChildrenToday")}</h2>
        <span className="dash-panel-badge">{day.date}</span>
      </div>
      {day.totalDueCents > 0 ? (
        <p className="auth-alert" style={{ marginBottom: "0.75rem" }}>
          {t("staffDash.totalFeesDue")} <EtbAmount cents={day.totalDueCents} /> —{" "}
          <Link href="/parent/fees">{t("staffDash.payOrViewDetails")}</Link>
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
                  {t("staffDash.attendanceColon")} <strong>{att.text}</strong>
                  {child.performanceLabel
                    ? ` ${t("staffDash.performanceColon")} ${child.performanceLabel}${
                        child.overallAverage != null ? ` (${child.overallAverage}%)` : ""
                      }`
                    : ""}
                  {child.outstandingCents > 0
                    ? ` ${t("staffDash.feesDueAmount", {
                        amount: formatEtbPlain(child.outstandingCents),
                      })}`
                    : ` ${t("staffDash.feesUpToDate")}`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}