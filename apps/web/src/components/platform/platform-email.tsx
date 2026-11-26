"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import { handlePlatformAuthFailure } from "@/lib/platform-auth";
import {
  getEmailLogs,
  getEmailOverview,
  getEmailProvider,
  getEmailTemplates,
  previewEmailTemplate,
  sendTestEmail,
  type EmailLog,
  type EmailOverview,
  type EmailPreview,
  type EmailProvider,
  type EmailTemplateInfo,
  type SmtpConnectionState,
} from "@/lib/platform-email";

type Tab = "overview" | "logs" | "templates" | "provider";

export function PlatformEmail() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<EmailOverview | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logCursor, setLogCursor] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplateInfo[]>([]);
  const [provider, setProvider] = useState<EmailProvider | null>(null);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testMailbox, setTestMailbox] = useState("contact");
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const connectionLabel = useMemo(
    (): Record<SmtpConnectionState, string> => ({
      missing_credentials: t("platformUi.emailConnMissing"),
      disabled: t("platformUi.emailConnDisabled"),
      not_tested: t("platformUi.emailConnNotTested"),
      last_test_failed: t("platformUi.emailConnLastFail"),
      last_test_accepted: t("platformUi.emailConnLastOk"),
    }),
    [t],
  );

  function percent(value: number | null) {
    if (value === null) return t("platformUi.emailNotAvailable");
    return `${Math.round(value * 100)}%`;
  }

  function when(value: string | null) {
    if (!value) return t("platformUi.emDash");
    return new Date(value).toLocaleString(locale === "am" ? "am-ET" : undefined);
  }

  const load = useCallback(async () => {
    try {
      const [nextOverview, nextLogs, nextTemplates, nextProvider] = await Promise.all([
        getEmailOverview(),
        getEmailLogs(),
        getEmailTemplates(),
        getEmailProvider(),
      ]);
      setOverview(nextOverview);
      setLogs(nextLogs.items);
      setLogCursor(nextLogs.nextCursor);
      setTemplates(nextTemplates);
      setProvider(nextProvider);
      setError("");
    } catch (err) {
      if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) return;
      setError(err instanceof Error ? err.message : t("platformUi.emailErrLoad"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load the platform email dashboard on mount and when its loader changes.
    void load();
  }, [load]);

  async function onPreview(id: string) {
    setError("");
    try {
      setPreview(await previewEmailTemplate(id));
    } catch (err) {
      if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) return;
      setError(err instanceof Error ? err.message : t("platformUi.emailPreviewFail"));
    }
  }

  async function onTest(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const result = await sendTestEmail({
        to: testTo.trim(),
        mailboxId: testMailbox,
      });
      if (result.sent) {
        setToast(t("platformUi.emailTestAccepted", { to: testTo.trim() }));
      } else {
        setError(result.reason || t("platformUi.emailSmtpReject"));
      }
      await load();
    } catch (err) {
      if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) return;
      setError(err instanceof Error ? err.message : t("platformUi.emailTestFail"));
    } finally {
      setSending(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: t("platformUi.emailTabOverview") },
    { id: "logs", label: t("platformUi.emailTabLogs") },
    { id: "templates", label: t("platformUi.emailTabTemplates") },
    { id: "provider", label: t("platformUi.emailTabProvider") },
  ];

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-billing-v2">
      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="announcements" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">{t("platformUi.emailEyebrow")}</p>
            <h2 className="plat-subjects-v2__title">{t("platformUi.emailTitle")}</h2>
            <p className="plat-subjects-v2__sub">{t("platformUi.emailSub")}</p>
          </div>
        </div>
      </header>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast(null)} />

      <div className="plat-filter-tabs plat-subjects-v2__filters" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`plat-filter-tab${tab === item.id ? " plat-filter-tab--active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && !overview ? <p className="plat-table-sub">{t("platformUi.emailLoading")}</p> : null}
      {!loading && !overview && error ? (
        <p className="plat-table-sub">{t("platformUi.emailLoadFail")}</p>
      ) : null}

      {tab === "overview" && overview ? (
        <div className="plat-subjects-v2__kpis">
          <article className="plat-subjects-v2__kpi">
            <p>{t("platformUi.emailSent")}</p>
            <strong>{overview.totals.sent}</strong>
          </article>
          <article className="plat-subjects-v2__kpi">
            <p>{t("platformUi.emailFailed")}</p>
            <strong>{overview.totals.failed}</strong>
          </article>
          <article className="plat-subjects-v2__kpi">
            <p>{t("platformUi.emailPending")}</p>
            <strong>{overview.totals.pending}</strong>
          </article>
          <article className="plat-subjects-v2__kpi">
            <p>{t("platformUi.emailDeliveryRate")}</p>
            <strong>{percent(overview.rates.delivery)}</strong>
          </article>
          <article className="plat-subjects-v2__kpi">
            <p>{t("platformUi.emailBounceRate")}</p>
            <strong>{percent(overview.rates.bounce)}</strong>
          </article>
        </div>
      ) : null}

      {tab === "logs" ? (
        <div className="plat-table-wrap">
          <table className="plat-table">
            <thead>
              <tr>
                <th>{t("platformUi.emailColWhen")}</th>
                <th>{t("platformUi.emailColRecipient")}</th>
                <th>{t("platformUi.emailColSender")}</th>
                <th>{t("platformUi.emailColSubject")}</th>
                <th>{t("platformUi.emailColCategory")}</th>
                <th>{t("platformUi.emailColSchool")}</th>
                <th>{t("platformUi.emailColStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td className="plat-table-empty" colSpan={7}>
                    {t("platformUi.emailNoAttempts")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{when(log.createdAt)}</td>
                    <td>{log.recipient}</td>
                    <td>{log.sender}</td>
                    <td>{log.subject}</td>
                    <td>{log.category}</td>
                    <td>{log.schoolName ?? t("platformUi.emDash")}</td>
                    <td>
                      {log.status}
                      {log.error ? <div className="plat-table-sub">{log.error}</div> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {logCursor ? (
            <button
              type="button"
              className="plat-v2__btn"
              disabled={loadingMore}
              onClick={() => {
                setLoadingMore(true);
                void getEmailLogs(logCursor)
                  .then((page) => {
                    setLogs((current) => [...current, ...page.items]);
                    setLogCursor(page.nextCursor);
                  })
                  .catch((err: unknown) => {
                    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) return;
                    setError(err instanceof Error ? err.message : t("platformUi.emailErrMore"));
                  })
                  .finally(() => setLoadingMore(false));
              }}
            >
              {loadingMore ? t("common.loading") : t("platformUi.emailLoadMore")}
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === "templates" ? (
        <div className="plat-billing-v2__panel">
          <ul>
            {templates.map((template) => (
              <li key={template.id}>
                <button type="button" className="plat-v2__btn" onClick={() => void onPreview(template.id)}>
                  {template.label}
                </button>
                <span className="plat-table-sub">
                  {template.wired ? t("platformUi.emailInUse") : t("platformUi.emailTemplateOnly")} —{" "}
                  {template.description}
                </span>
              </li>
            ))}
          </ul>
          {preview ? (
            <div>
              <h3 className="plat-billing-v2__panel-title">{preview.subject}</h3>
              <iframe
                title={t("platformUi.emailPreviewTitle")}
                sandbox=""
                srcDoc={preview.html}
                style={{ width: "100%", minHeight: 420, border: "1px solid #d7e4e2", borderRadius: 12, background: "#fff" }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "provider" && provider ? (
        <div className="plat-billing-v2__panel">
          <p>
            {connectionLabel[provider.connection]} · {provider.host}:{provider.port} · {provider.encryption}
          </p>
          {provider.validationErrors.length > 0 ? (
            <p className="plat-table-sub">{provider.validationErrors.join(" ")}</p>
          ) : null}
          <ul>
            {provider.mailboxes.map((mailbox) => (
              <li key={mailbox.id}>
                {mailbox.address} —{" "}
                {mailbox.configured
                  ? t("platformUi.emailPasswordSet")
                  : t("platformUi.emailPasswordMissing")}
              </li>
            ))}
          </ul>
          <p className="plat-table-sub">
            {t("platformUi.emailLastTest")}:{" "}
            {provider.lastTest?.at ? when(provider.lastTest.at) : t("platformUi.emailNotRun")}{" "}
            {provider.lastTest?.ok === true
              ? `(${t("platformUi.emailAccepted")})`
              : provider.lastTest?.ok === false
                ? `(${t("platformUi.emailFailedParen")})`
                : ""}
            {provider.lastTest?.error ? ` — ${provider.lastTest.error}` : ""}
          </p>
          <p className="plat-table-sub">
            {t("platformUi.emailSpf")}:{" "}
            {provider.dns.spf ? t("platformUi.emailFound") : t("platformUi.emailNotFound")} ·{" "}
            {t("platformUi.emailDmarc")}:{" "}
            {provider.dns.dmarc ? t("platformUi.emailFound") : t("platformUi.emailNotFound")} ·{" "}
            {t("platformUi.emailDkim")}:{" "}
            {provider.dns.dkimSelectors.length > 0
              ? provider.dns.dkimSelectors.join(", ")
              : t("platformUi.emailNoSelectors")}
          </p>
          <form className="plat-invoice-form__grid" onSubmit={(event) => void onTest(event)}>
            <label className="plat-field">
              <span>{t("platformUi.emailTestRecipient")}</span>
              <input
                type="email"
                required
                value={testTo}
                onChange={(event) => setTestTo(event.target.value)}
                placeholder="you@awuddigitals.com"
              />
            </label>
            <label className="plat-field">
              <span>{t("platformUi.emailMailbox")}</span>
              <select className="plat-select" value={testMailbox} onChange={(event) => setTestMailbox(event.target.value)}>
                {provider.mailboxes.map((mailbox) => (
                  <option key={mailbox.id} value={mailbox.id}>
                    {mailbox.address}
                  </option>
                ))}
              </select>
            </label>
            <p className="plat-table-sub">{t("platformUi.emailTestHint")}</p>
            <button className="plat-v2__btn plat-v2__btn--primary" type="submit" disabled={sending}>
              {sending ? t("platformUi.sending") : t("platformUi.emailSendTest")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
