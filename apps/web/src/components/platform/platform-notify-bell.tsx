"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  canAccessPlatformSection,
  hasPlatformPermission,
} from "@/lib/platform-access";
import type { PlatformUser } from "@/lib/platform-auth";
import {
  getPlatformAttendanceConcernSummary,
  listPlatformPaymentProofs,
} from "@/lib/platform-billing";
import {
  listPlatformSupportTickets,
  type SupportTicket,
} from "@/lib/support-tickets";
import type { PlatformSection } from "./platform-types";

const DISMISS_KEY = "chora.platformNotify.dismissed";

type AlertKind = "support" | "payment" | "concern";

type AlertItem = {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  createdAt: string;
  section: PlatformSection;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { date?: string; ids?: string[] };
    if (parsed.date !== todayKey() || !Array.isArray(parsed.ids)) return new Set();
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>) {
  localStorage.setItem(
    DISMISS_KEY,
    JSON.stringify({ date: todayKey(), ids: [...ids] }),
  );
}

function ticketToAlert(ticket: SupportTicket): AlertItem {
  return {
    id: `support:${ticket.id}`,
    kind: "support",
    title: ticket.subject,
    body: `${ticket.school.name} · ${ticket.status.replace(/_/g, " ")}`,
    createdAt: ticket.createdAt,
    section: "support",
  };
}

type Props = {
  user: PlatformUser | null;
  onOpenSection: (section: PlatformSection) => void;
};

export function PlatformNotifyBell({ user, onOpenSection }: Props) {
  const { t, locale } = useLocale();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());

  const canSupport = canAccessPlatformSection(user, "support");
  const canBilling = canAccessPlatformSection(user, "invoices");
  const canSchools = hasPlatformPermission(user, "platform.schools.view");
  const canNotify = canSupport || canBilling || canSchools;

  const loadAlerts = useCallback(async () => {
    if (!canNotify) {
      setAlerts([]);
      return;
    }
    setLoading(true);
    try {
      const tasks: Promise<AlertItem[]>[] = [];

      if (canSupport) {
        tasks.push(
          Promise.all([
            listPlatformSupportTickets({ status: "OPEN" }),
            listPlatformSupportTickets({ status: "IN_PROGRESS" }),
          ]).then(([openTickets, inProgress]) => {
            const merged = new Map<string, SupportTicket>();
            for (const row of [...openTickets, ...inProgress]) {
              merged.set(row.id, row);
            }
            return [...merged.values()].map(ticketToAlert);
          }),
        );
      }

      if (canBilling) {
        tasks.push(
          listPlatformPaymentProofs("PENDING").then((rows) =>
            rows.map(
              (row): AlertItem => ({
                id: `payment:${row.id}`,
                kind: "payment",
                title: t("platformUi.notifyReceiptTitle", { invoice: row.invoiceNumber }),
                body: `${row.schoolName} · ${row.method.replace(/_/g, " ")} · ${row.transactionId}`,
                createdAt: row.createdAt,
                section: "invoices",
              }),
            ),
          ),
        );
      }

      if (canSchools) {
        tasks.push(
          getPlatformAttendanceConcernSummary().then((summary) =>
            summary.bySchool.map(
              (row): AlertItem => ({
                id: `concern-school:${row.schoolId}`,
                kind: "concern",
                title: t("platformUi.notifyConcernTitle", {
                  count: row.openCount,
                  s: row.openCount === 1 ? "" : "s",
                }),
                body: t("platformUi.notifyConcernBody", { school: row.schoolName }),
                createdAt: row.latestAt ?? new Date().toISOString(),
                section: "schools",
              }),
            ),
          ),
        );
      }

      const batches = await Promise.all(
        tasks.map((task) => task.catch(() => [] as AlertItem[])),
      );
      const next = batches
        .flat()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      setAlerts(next);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [canNotify, canSupport, canBilling, canSchools, t]);

  useEffect(() => {
    if (!user || !canNotify) return;
    queueMicrotask(() => void loadAlerts());
    const timer = window.setInterval(() => void loadAlerts(), 60_000);
    return () => window.clearInterval(timer);
  }, [user, canNotify, loadAlerts]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!canNotify) return null;

  const visible = alerts.filter((item) => !dismissed.has(item.id));
  const badgeCount = visible.length;
  const supportItems = visible.filter((i) => i.kind === "support");
  const paymentItems = visible.filter((i) => i.kind === "payment");
  const concernItems = visible.filter((i) => i.kind === "concern");

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setDismissed(readDismissed());
      await loadAlerts();
    }
  }

  function openAlert(item: AlertItem) {
    setOpen(false);
    onOpenSection(item.section);
  }

  function dismissAlert(item: AlertItem, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = new Set(dismissed);
    next.add(item.id);
    setDismissed(next);
    writeDismissed(next);
  }

  function dismissAll() {
    const next = new Set(dismissed);
    for (const item of alerts) next.add(item.id);
    setDismissed(next);
    writeDismissed(next);
  }

  function renderList(items: AlertItem[]) {
    return (
      <ul className="dash-notify-list dash-notify-list--actions">
        {items.map((item) => (
          <li key={item.id} className="dash-notify-row">
            <button
              type="button"
              className="dash-notify-item dash-notify-item--unread"
              onClick={() => openAlert(item)}
            >
              <p className="dash-notify-title">{item.title}</p>
              <p className="dash-notify-body">{item.body}</p>
              <p className="dash-notify-time">
                {t("shell.tapToOpenDot")}
                {new Date(item.createdAt).toLocaleString(locale === "am" ? "am-ET" : undefined)}
              </p>
            </button>
            <button
              type="button"
              className="dash-notify-dismiss"
              aria-label={t("shell.dismissAlert", { label: item.title })}
              title={t("shell.dismissForToday")}
              onClick={(e) => dismissAlert(item, e)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="dash-notify-wrap" ref={wrapRef}>
      <button
        type="button"
        className="dash-notify"
        title={
          badgeCount > 0
            ? badgeCount === 1
              ? t("shell.notificationCountOne")
              : t("shell.notificationsCount", { count: badgeCount })
            : t("common.notifications")
        }
        onClick={() => void toggle()}
      >
        <DashIcon name="alert" className="dash-icon--sm" />
        {badgeCount > 0 ? (
          <span className="dash-notify-badge">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <section className="dash-notify-panel" aria-label={t("common.notifications")}>
          <header className="dash-notify-head">
            <h2>{t("common.notifications")}</h2>
            <button
              type="button"
              className="dash-notify-mark-all"
              onClick={dismissAll}
              disabled={visible.length === 0}
            >
              {t("platformUi.notifyDismissAll")}
            </button>
          </header>
          {loading ? (
            <p className="dash-notify-empty">{t("common.loading")}</p>
          ) : visible.length === 0 ? (
            <p className="dash-notify-empty">{t("common.noNotifications")}</p>
          ) : (
            <>
              {paymentItems.length > 0 ? (
                <>
                  <p className="dash-notify-section">{t("platformUi.notifyPaymentReceipts")}</p>
                  {renderList(paymentItems)}
                </>
              ) : null}
              {supportItems.length > 0 ? (
                <>
                  <p className="dash-notify-section">{t("platformUi.notifySupportInbox")}</p>
                  {renderList(supportItems)}
                </>
              ) : null}
              {concernItems.length > 0 ? (
                <>
                  <p className="dash-notify-section">{t("platformUi.notifyAttendanceConcerns")}</p>
                  {renderList(concernItems)}
                  <p className="dash-notify-empty" style={{ paddingTop: 0 }}>
                    {t("platformUi.notifyConcernsHint")}
                  </p>
                </>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
