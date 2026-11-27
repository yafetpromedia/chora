import type { Metadata, Viewport } from "next";
import { Figtree, Noto_Sans_Ethiopic } from "next/font/google";
import { ChoraPreloader } from "@/components/chora-preloader";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { PlatformAdminShortcut } from "@/components/platform-admin-shortcut";
import {
  absoluteUrl,
  getSiteUrl,
  SITE_DESCRIPTION_DEFAULT,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_NAME_FULL,
  SITE_OG_IMAGE,
  SITE_TITLE_DEFAULT,
} from "@/lib/site";
import "./globals.css";
import "../styles/i18n.css";
import "../styles/landing.css";
import "../styles/auth.css";
import "../styles/register.css";
import "../styles/dashboard.css";
import "../styles/setup.css";
import "../styles/students.css";
import "../styles/student-records.css";
import "../styles/attendance.css";
import "../styles/staff-attendance.css";
import "../styles/id-lookup.css";
import "../styles/my-students.css";
import "../styles/hr-payroll.css";
import "../styles/settings.css";
import "../styles/settings-admin.css";
import "../styles/student-cards.css";
import "../styles/classwork.css";
import "../styles/timetable.css";
import "../styles/exams.css";
import "../styles/teachers.css";
import "../styles/teacher-dashboard.css";
import "../styles/results.css";
import "../styles/reports-hub.css";
import "../styles/platform.css";
import "../styles/profile.css";
import "../styles/workspace.css";
import "../styles/upgrade.css";
import "../styles/billing.css";
import "../styles/library.css";
import "../styles/ai.css";
import "../styles/academics.css";
import "../styles/student-fees.css";
import "../styles/finance-admin.css";
import "../styles/announcements-admin.css";
import "../styles/student-dashboard.css";
import "../styles/student-portal.css";
import "../styles/parents.css";
import "../styles/parent-portal.css";
import "../styles/parent-attendance.css";
import "../styles/admissions-admin.css";
import "../styles/support-admin.css";
import "../styles/toast.css";
import "../styles/confirm-dialog.css";
import "../styles/chora-preloader.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const notoEthiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  variable: "--font-noto-ethiopic",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f766e" },
    { media: "(prefers-color-scheme: dark)", color: "#042f2e" },
  ],
  colorScheme: "light",
};

const siteUrl = getSiteUrl();
const ogImage = absoluteUrl(SITE_OG_IMAGE);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION_DEFAULT,
  applicationName: SITE_NAME,
  authors: [{ name: "Awud Digitals", url: "https://awuddigitals.com" }],
  creator: "Awud Digitals",
  publisher: "Awud Digitals",
  keywords: [...SITE_KEYWORDS],
  category: "education",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/brand/chora-favicon.png?v=20261116", type: "image/png", sizes: "64x64" },
      { url: "/brand/favicon.png?v=20261116", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico?v=20261116", sizes: "any" },
    ],
    apple: [{ url: "/brand/favicon.png?v=20261116", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.ico?v=20261116",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_ET",
    alternateLocale: ["am_ET"],
    url: siteUrl,
    siteName: SITE_NAME_FULL,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION_DEFAULT,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — school management for Ethiopian schools`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION_DEFAULT,
    images: [ogImage],
  },
  other: {
    "geo.region": "ET",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${notoEthiopic.variable}`}>
      <body className={`${figtree.className} antialiased locale-en`}>
        <LocaleProvider>
          <ChoraPreloader />
          <PlatformAdminShortcut />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
