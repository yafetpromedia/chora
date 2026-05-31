import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { PlatformAdminShortcut } from "@/components/platform-admin-shortcut";
import "./globals.css";
import "../styles/landing.css";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/setup.css";
import "../styles/students.css";
import "../styles/attendance.css";
import "../styles/settings.css";
import "../styles/student-cards.css";
import "../styles/teachers.css";
import "../styles/results.css";
import "../styles/platform.css";
import "../styles/profile.css";
import "../styles/workspace.css";
import "../styles/upgrade.css";
import "../styles/billing.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CampusOne — School management for admins, teachers & parents",
  description:
    "Run attendance, results, fees, and family communication on one platform. 14-day free trial. Plans in USD and ETB for Ethiopian and international schools.",
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
