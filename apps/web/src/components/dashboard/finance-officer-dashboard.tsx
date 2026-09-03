"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
      loadingText="Loading finance analytics…"
      chips={
        finance ? (
          <div className="dash-admin-hero__chip dash-admin-hero__chip--muted">
            <DashIcon name="finance" className="dash-icon--sm" />
            <span>{collectionRate}% collected this term</span>
          </div>
        ) : null
      }
    >
      {finance ? (
        <>
          <StaffKpiGrid label="Finance metrics">
            <Link href="/admin/finance" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
                <DashIcon name="finance" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">Collected</p>
                <p className="dash-admin-kpi__value"><EtbAmount cents={finance.collectedCents} symbolSize={18} /></p>
                <p className="dash-admin-kpi__hint">Total fees received</p>
              </div>
            </Link>

            <Link href="/admin/finance" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
                <DashIcon name="finance" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">Outstanding</p>
                <p className="dash-admin-kpi__value"><EtbAmount cents={finance.outstandingCents} symbolSize={18} /></p>
                <p className="dash-admin-kpi__hint">Unpaid balances</p>
              </div>
            </Link>

            <article className="dash-admin-kpi dash-admin-kpi--modern">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
                <DashIcon name="students" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">Paid students</p>
                <p className="dash-admin-kpi__value">{finance.paidStudents}</p>
                <p className="dash-admin-kpi__hint">{finance.unpaidStudents} still owing</p>
              </div>
            </article>

            <article className="dash-admin-kpi dash-admin-kpi--modern">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--slate">
                <DashIcon name="announcements" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">Overdue fees</p>
                <p className="dash-admin-kpi__value">{finance.overdueFeesCount}</p>
                <p className="dash-admin-kpi__hint">Need follow-up</p>
              </div>
            </article>
          </StaffKpiGrid>

          <section className="da-analytics" aria-label="Finance analytics">
            <div className="da-analytics__grid">
              <article className="da-card da-card--span2">
                <header className="da-card__head">
                  <div>
                    <h2 className="da-card__title">Fee collection</h2>
                    <p className="da-card__sub">Collected vs outstanding</p>
                  </div>
                  <Link href="/admin/finance" className="da-card__link">
                    Finance <DashIcon name="chevron" className="dash-icon--xs" />
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
                    <h2 className="da-card__title">This month</h2>
                    <p className="da-card__sub">{finance.month}</p>
                  </div>
                </header>
                <ul className="da-finance__legend" style={{ marginTop: "0.5rem" }}>
                  <li className="da-finance__meta">
                    Collected <strong><EtbAmount cents={finance.collectedThisMonthCents} /></strong>
                  </li>
                  <li className="da-finance__meta">
                    Expected <strong><EtbAmount cents={finance.expectedRevenueCents} /></strong>
                  </li>
                </ul>
              </article>

              <article className="da-card da-card--span2">
                <header className="da-card__head">
                  <div>
                    <h2 className="da-card__title">Payment status</h2>
                    <p className="da-card__sub">{studentCount} students on roll</p>
                  </div>
                </header>
                <BarChart
                  rows={[
                    {
                      label: "Fully paid",
                      value: finance.paidStudents,
                      color: "var(--brand-teal-dark)",
                    },
                    {
                      label: "Outstanding",
                      value: finance.unpaidStudents,
                      color: "#f59e0b",
                    },
                    {
                      label: "Overdue fees",
                      value: finance.overdueFeesCount,
                      color: "#ef4444",
                    },
                  ]}
                  emptyText="No fee data yet."
                />
              </article>
            </div>
          </section>
        </>
      ) : (
        <div className="da-feed-empty">
          <p>Finance data is not available yet.</p>
        </div>
      )}
    </StaffDashboardShell>
  );
}
