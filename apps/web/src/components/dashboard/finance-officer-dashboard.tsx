"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { listStudents } from "@/lib/school-setup";
import { getFinanceAnalytics, type FinanceAnalytics } from "@/lib/finance";
import { EtbAmount } from "@/components/billing/etb-amount";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import {
  BarChart,
  FinanceRing,
  StaffDashboardShell,
  StaffKpiGrid,
} from "@/components/dashboard/staff-dashboard-shared";
import { loadStaffDashboardBase } from "@/components/dashboard/staff-dashboard-data";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { getStaffWorkspaceLabel, getStaffWorkspaceSubtitle } from "@/lib/staff-workspace";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  error: string;
};

export function FinanceOfficerDashboard({ error }: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState(BRAND_NAME);
  const [adminDay, setAdminDay] = useState<AdminDayOverview | null>(null);
  const [finance, setFinance] = useState<FinanceAnalytics | null>(null);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const base = await loadStaffDashboardBase();
        setSchoolName(base.schoolName);
        setAdminDay(base.adminDay);

        const [financeData, students] = await Promise.all([
          getFinanceAnalytics().catch(() => null),
          listStudents().catch(() => []),
        ]);
        if (financeData) setFinance(financeData);
        setStudentCount(students.length);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const collectionRate =
    finance && finance.collectedCents + finance.outstandingCents > 0
      ? Math.round(
          (finance.collectedCents /
            (finance.collectedCents + finance.outstandingCents)) *
            100,
        )
      : 0;

  return (
    <StaffDashboardShell
      roleLabel={getStaffWorkspaceLabel()}
      schoolName={schoolName}
      subtitle={getStaffWorkspaceSubtitle()}
      adminDay={adminDay}
      error={error}
      loading={loading}
      loadingText={t("staffDash.loadingFinance")}
      chips={
        finance ? (
          <div className="dash-admin-hero__chip dash-admin-hero__chip--muted">
            <DashIcon name="finance" className="dash-icon--sm" />
            <span>{t("staffDash.collectedThisTerm", { rate: collectionRate })}</span>
          </div>
        ) : null
      }
    >
      {finance ? (
        <>
          <StaffKpiGrid label={t("staffDash.financeMetrics")}>
            <Link href="/admin/finance" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
                <DashIcon name="finance" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">{t("adminDash.collected")}</p>
                <p className="dash-admin-kpi__value"><EtbAmount cents={finance.collectedCents} symbolSize={18} /></p>
                <p className="dash-admin-kpi__hint">{t("staffDash.totalFeesReceived")}</p>
              </div>
            </Link>

            <Link href="/admin/finance" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
                <DashIcon name="finance" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">{t("adminDash.outstanding")}</p>
                <p className="dash-admin-kpi__value"><EtbAmount cents={finance.outstandingCents} symbolSize={18} /></p>
                <p className="dash-admin-kpi__hint">{t("staffDash.unpaidBalances")}</p>
              </div>
            </Link>

            <article className="dash-admin-kpi dash-admin-kpi--modern">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
                <DashIcon name="students" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">{t("staffDash.paidStudents")}</p>
                <p className="dash-admin-kpi__value">{finance.paidStudents}</p>
                <p className="dash-admin-kpi__hint">{t("staffDash.stillOwing", { count: finance.unpaidStudents })}</p>
              </div>
            </article>

            <article className="dash-admin-kpi dash-admin-kpi--modern">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--slate">
                <DashIcon name="announcements" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">{t("staffDash.overdueFees")}</p>
                <p className="dash-admin-kpi__value">{finance.overdueFeesCount}</p>
                <p className="dash-admin-kpi__hint">{t("staffDash.needFollowUp")}</p>
              </div>
            </article>
          </StaffKpiGrid>

          <section className="da-analytics" aria-label={t("staffDash.financeAnalyticsAria")}>
            <div className="da-analytics__grid">
              <article className="da-card da-card--span2">
                <header className="da-card__head">
                  <div>
                    <h2 className="da-card__title">{t("adminDash.feeCollection")}</h2>
                    <p className="da-card__sub">{t("staffDash.collectedVsOutstanding")}</p>
                  </div>
                  <Link href="/admin/finance" className="da-card__link">
                    {t("staffDash.financeLink")} <DashIcon name="chevron" className="dash-icon--xs" />
                  </Link>
                </header>
                <FinanceRing
                  collectedCents={finance.collectedCents}
                  outstandingCents={finance.outstandingCents}
                />
              </article>

              <article className="da-card">
                <header className="da-card__head">
                  <div>
                    <h2 className="da-card__title">{t("staffDash.thisMonth")}</h2>
                    <p className="da-card__sub">{finance.month}</p>
                  </div>
                </header>
                <ul className="da-finance__legend" style={{ marginTop: "0.5rem" }}>
                  <li className="da-finance__meta">
                    {t("adminDash.collected")}{" "}
                    <strong><EtbAmount cents={finance.collectedThisMonthCents} /></strong>
                  </li>
                  <li className="da-finance__meta">
                    {t("staffDash.expected")}{" "}
                    <strong><EtbAmount cents={finance.expectedRevenueCents} /></strong>
                  </li>
                </ul>
              </article>

              <article className="da-card da-card--span2">
                <header className="da-card__head">
                  <div>
                    <h2 className="da-card__title">{t("staffDash.paymentStatus")}</h2>
                    <p className="da-card__sub">{t("staffDash.studentsOnRoll", { count: studentCount })}</p>
                  </div>
                </header>
                <BarChart
                  rows={[
                    {
                      label: t("staffDash.fullyPaid"),
                      value: finance.paidStudents,
                      color: "var(--brand-teal-dark)",
                    },
                    {
                      label: t("adminDash.outstanding"),
                      value: finance.unpaidStudents,
                      color: "#f59e0b",
                    },
                    {
                      label: t("staffDash.overdueFees"),
                      value: finance.overdueFeesCount,
                      color: "#ef4444",
                    },
                  ]}
                  emptyText={t("staffDash.noFeeData")}
                />
              </article>
            </div>
          </section>
        </>
      ) : (
        <div className="da-feed-empty">
          <p>{t("staffDash.financeUnavailable")}</p>
        </div>
      )}
    </StaffDashboardShell>
  );
}