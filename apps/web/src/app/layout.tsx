import type { Metadata } from "next";
import { Figtree } from "next/font/google";
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

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CampusOne — Multi-School Education Platform",
  description:
    "Register your school, invite your campus, and run attendance, grades, and family communication in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className={`${figtree.className} antialiased`}>{children}</body>
    </html>
  );
}
