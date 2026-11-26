import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { JsonLd } from "@/components/seo/json-ld";
import {
  absoluteUrl,
  organizationJsonLd,
  SITE_DESCRIPTION_DEFAULT,
  SITE_TITLE_DEFAULT,
} from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE_DEFAULT },
  description: SITE_DESCRIPTION_DEFAULT,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION_DEFAULT,
    url: absoluteUrl("/"),
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <LandingPage />
    </>
  );
}
