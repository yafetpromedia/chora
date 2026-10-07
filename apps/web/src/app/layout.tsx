import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { PlatformAdminShortcut } from "@/components/platform-admin-shortcut";
import "./globals.css";
import "../styles/landing.css";
import "../styles/auth.css";
import "../styles/register.css";
import "../styles/dashboard.css";
import "../styles/setup.css";
import "../styles/students.css";
import "../styles/student-records.css";
import "../styles/attendance.css";
import "../styles/staff-attendance.css";
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
import "../styles/admissions-admin.css";
import "../styles/support-admin.css";
import "../styles/toast.css";
import "../styles/confirm-dialog.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chora (ጮራ) — School management for admins, teachers & parents",
  description:
    "Run attendance, results, fees, and family communication on one platform. 14-day free trial. Plans in USD and ETB for Ethiopian and international schools.",
  icons: {
    icon: [
      { url: "/brand/chora-favicon.png?v=20260904", type: "image/png", sizes: "64x64" },
      { url: "/brand/favicon.png?v=20260904", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico?v=20260904", sizes: "any" },
    ],
    apple: [{ url: "/brand/favicon.png?v=20260904", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.ico?v=20260904",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className={`${figtree.className} antialiased`}>
        <PlatformAdminShortcut />
        {children}
      </body>
    </html>
  );
}
