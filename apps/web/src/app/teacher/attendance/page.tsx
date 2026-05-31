"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AttendanceMarkPanel } from "@/components/attendance/attendance-mark-panel";
import { AttendanceScanner } from "@/components/attendance/attendance-scanner";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

type Tab = "scan" | "manual";

export default function TeacherAttendancePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("scan");

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (role !== "teacher" && role !== "admin") {
      router.replace(`/${role ?? "login"}`);
    }
  }, [router]);

  return (
    <DashboardPage
      role="teacher"
      title="Mark attendance"
      subtitle="Scan student ID cards or mark exceptions manually."
      eyebrow="Homeroom"
    >
      <nav className="att-tabs" aria-label="Attendance mode">
        <button
          type="button"
          className={`att-tab${tab === "scan" ? " att-tab--active" : ""}`}
          onClick={() => setTab("scan")}
        >
          Scan QR
        </button>
        <button
          type="button"
          className={`att-tab${tab === "manual" ? " att-tab--active" : ""}`}
          onClick={() => setTab("manual")}
        >
          Manual
        </button>
      </nav>

      {tab === "scan" ? <AttendanceScanner /> : <AttendanceMarkPanel />}

      <p className="cfg-hint no-print" style={{ marginTop: "0.5rem" }}>
        Need printed cards? Ask your admin to open{" "}
        <Link href="/admin/students/cards">Student ID cards</Link>.
      </p>
    </DashboardPage>
  );
}
