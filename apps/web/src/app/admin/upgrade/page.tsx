"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getSchoolSubscription,
  listPlans,
  type PlanOption,
  type PlanType,
  type SubscriptionStatus,
  upgradeSchoolPlan,
} from "@/lib/api";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { useRouter } from "next/navigation";

const PLAN_FEATURES: Record<Exclude<PlanType, "TRIAL">, string[]> = {
  STARTER: [
    "Up to 500 students",
    "Up to 50 teachers",
    "Parent portal",
    "Attendance, results & announcements",
  ],
  PROFESSIONAL: [
    "Up to 2,000 students",
    "Unlimited teachers",
    "Analytics & notifications",
    "Mobile app access",
  ],
  ENTERPRISE: [
    "Unlimited students",
    "Multi-campus support",
    "Advanced analytics & API",
    "Dedicated support",
  ],
};

export default function UpgradePage() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<PlanType | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (!token || role !== "admin") {
      router.replace("/login");
      return;
    }

    void Promise.all([getSchoolSubscription(), listPlans()])
      .then(([sub, planList]) => {
        setSubscription(sub);
        setPlans(planList);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load plans");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function onUpgrade(plan: Exclude<PlanType, "TRIAL">) {
    setUpgrading(plan);
    setError("");
    setSuccess("");
    try {
      const updated = await upgradeSchoolPlan(plan);
      setSubscription(updated);
      setSuccess(`You're now on the ${updated.planLabel} plan.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setUpgrading(null);
    }
  }

  if (loading) {
    return (
      <div className="upgrade-scene">
        <p className="upgrade-loading">Loading plans…</p>
      </div>
    );
  }

  return (
    <div className="upgrade-scene">
      <header className="upgrade-header">
        <Link href="/admin" className="upgrade-back">
          ← Back to dashboard
        </Link>
        <h1 className="upgrade-title">Choose your CampusOne plan</h1>
        <p className="upgrade-subtitle">
          {subscription?.expired
            ? "Your trial has ended. Pick a plan to keep your school running on CampusOne."
            : "Upgrade anytime — payment integration coming soon. Select a plan to activate for your school."}
        </p>
      </header>

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      {success ? <p className="upgrade-success">{success}</p> : null}

      <div className="upgrade-grid">
        {plans.map((plan) => {
          const key = plan.plan as Exclude<PlanType, "TRIAL">;
          const features = PLAN_FEATURES[key];
          const isCurrent = subscription?.plan === plan.plan;

          return (
            <article
              key={plan.plan}
              className={`upgrade-card${plan.plan === "PROFESSIONAL" ? " upgrade-card--featured" : ""}`}
            >
              {plan.plan === "PROFESSIONAL" ? (
                <span className="upgrade-card-badge">Popular</span>
              ) : null}
              <h2 className="upgrade-card-name">{plan.label}</h2>
              <p className="upgrade-card-desc">{plan.description}</p>
              <ul className="upgrade-card-features">
                {features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                type="button"
                className="upgrade-card-btn"
                disabled={isCurrent || upgrading !== null}
                onClick={() => void onUpgrade(key)}
              >
                {isCurrent
                  ? "Current plan"
                  : upgrading === plan.plan
                    ? "Activating…"
                    : "Select plan"}
              </button>
            </article>
          );
        })}
      </div>

      <p className="upgrade-note">
        No credit card required during trial. Contact us for Enterprise pricing and multi-campus
        setups.
      </p>
    </div>
  );
}
