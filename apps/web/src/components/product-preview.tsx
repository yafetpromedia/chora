"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, type CSSProperties } from "react";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import { BrandMark } from "@/components/brand-mark";
import { BirrSymbol } from "@/components/billing/birr-symbol";
import { useLocale } from "@/components/i18n/locale-provider";

const NAV: { msgKey: string; icon: DashIconName; active?: boolean }[] = [
  { msgKey: "productPreviewUi.overview", icon: "overview", active: true },
  { msgKey: "productPreviewUi.students", icon: "students" },
  { msgKey: "productPreviewUi.attendance", icon: "attendance" },
  { msgKey: "productPreviewUi.results", icon: "results" },
  { msgKey: "productPreviewUi.finance", icon: "finance" },
];

const COMMUNITY_KEYS = [
  { msgKey: "productPreviewUi.students", tone: "teal", value: 486 },
  { msgKey: "productPreviewUi.parents", tone: "blue", value: 412 },
  { msgKey: "productPreviewUi.teachers", tone: "amber", value: 38 },
] as const;

export function ProductPreview() {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="lp3-preview lp3-preview--real"
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={inView || reduce ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="lp3-preview__chrome">
        <div className="lp3-preview__dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <span className="lp3-preview__url">{t("productPreviewUi.adminUrl")}</span>
        <span className="lp3-preview__notify" aria-hidden>
          2
        </span>
      </div>

      <div className="lp3-preview__body">
        <aside className="lp3-preview__side" aria-hidden>
          <div className="lp3-preview__side-brand">
            <BrandMark />
            <div>
              <strong>{t("productPreviewUi.schoolName")}</strong>
              <em>{t("productPreviewUi.adminWorkspace")}</em>
            </div>
          </div>
          <ul>
            {NAV.map((item) => (
              <li key={item.msgKey} className={item.active ? "is-active" : ""}>
                <DashIcon name={item.icon} className="lp3-preview__nav-icon" />
                {t(item.msgKey)}
              </li>
            ))}
          </ul>
        </aside>

        <div className="lp3-preview__main">
          <div className="lp3-preview__dash-hero">
            <div>
              <p>{t("productPreviewUi.demoDate")}</p>
              <h3>{t("productPreviewUi.academyName")}</h3>
            </div>
            <div className="lp3-preview__hero-chips">
              <span>{t("productPreviewUi.termLive")}</span>
              <span className="lp3-preview__live">{t("productPreviewUi.live")}</span>
            </div>
          </div>

          <div className="lp3-preview__kpis">
            <article>
              <span className="lp3-preview__kpi-icon lp3-preview__kpi-icon--att">
                <DashIcon name="attendance" className="lp3-preview__kpi-svg" />
              </span>
              <div>
                <span>{t("productPreviewUi.attendanceToday")}</span>
                <strong>94%</strong>
                <em>{t("productPreviewUi.markedAbsent")}</em>
              </div>
            </article>
            <article>
              <span className="lp3-preview__kpi-icon lp3-preview__kpi-icon--fin">
                <DashIcon name="finance" className="lp3-preview__kpi-svg" />
              </span>
              <div>
                <span>{t("productPreviewUi.collected")}</span>
                <strong>
                  1.2M <BirrSymbol size={12} />
                </strong>
                <em>{t("productPreviewUi.percentExpected")}</em>
              </div>
            </article>
            <article>
              <span className="lp3-preview__kpi-icon lp3-preview__kpi-icon--stu">
                <DashIcon name="students" className="lp3-preview__kpi-svg" />
              </span>
              <div>
                <span>{t("productPreviewUi.enrolled")}</span>
                <strong>486</strong>
                <em>{t("productPreviewUi.acrossSections")}</em>
              </div>
            </article>
          </div>

          <div className="lp3-preview__widgets">
            <article className="lp3-preview__widget">
              <div className="lp3-preview__widget-head">
                <strong>{t("productPreviewUi.feeCollection")}</strong>
                <span>{t("productPreviewUi.financeLink")}</span>
              </div>
              <div className="lp3-preview__ring-wrap">
                <div className="lp3-preview__ring" style={{ "--pct": "78" } as CSSProperties}>
                  <span>78%</span>
                </div>
                <ul>
                  <li>
                    <span>{t("productPreviewUi.collected")}</span>
                    <strong>
                      940K <BirrSymbol size={11} />
                    </strong>
                  </li>
                  <li>
                    <span>{t("productPreviewUi.outstanding")}</span>
                    <strong>
                      260K <BirrSymbol size={11} />
                    </strong>
                  </li>
                </ul>
              </div>
            </article>

            <article className="lp3-preview__widget">
              <div className="lp3-preview__widget-head">
                <strong>{t("productPreviewUi.community")}</strong>
                <span>{t("productPreviewUi.parentsLink")}</span>
              </div>
              <ul className="lp3-preview__community">
                {COMMUNITY_KEYS.map((row) => (
                  <li key={row.msgKey} className={`lp3-preview__community-row--${row.tone}`}>
                    <span>{t(row.msgKey)}</span>
                    <div className="lp3-preview__community-bar">
                      <motion.i
                        initial={{ width: 0 }}
                        animate={
                          inView ? { width: `${Math.min(100, (row.value / 486) * 100)}%` } : { width: 0 }
                        }
                        transition={{ duration: 0.7, delay: 0.2 }}
                      />
                    </div>
                    <strong>{row.value}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </div>
    </motion.div>
  );
}