import type { Metadata } from "next";
import { BackToTop } from "@/components/back-to-top";
import { LandingDemoSection } from "@/components/landing/landing-demo-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `See ${BRAND_NAME} in Action`,
  description:
    "Watch how Chora connects school administration, teaching, student learning, and parents in one platform.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: `See ${BRAND_NAME} in Action`,
    description:
      "Watch how Chora connects school administration, teaching, student learning, and parents in one platform.",
    url: "/demo",
  },
};

export default function DemoPage() {
  return (
    <div className="lp3">
      <LandingNav />
      <main>
        <div className="lp3-demo-page-top" aria-hidden />
        <LandingDemoSection variant="page" />
      </main>
      <LandingFooter />
      <BackToTop />
    </div>
  );
}
