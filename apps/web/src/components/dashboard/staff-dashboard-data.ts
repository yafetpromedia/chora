import { apiFetch, type SchoolInfo } from "@/lib/api";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import { readSchoolBrand } from "@/lib/school-brand";
import { BRAND_NAME } from "@/lib/brand";

export async function loadStaffDashboardBase() {
  const [schoolRes, dashboardRes] = await Promise.all([
    apiFetch<{ school: SchoolInfo | null }>("/schools/me").catch(() => ({ school: null })),
    apiFetch<Record<string, unknown> & { day?: AdminDayOverview }>("/dashboards/me").catch(
      () => ({}),
    ),
  ]);

  return {
    schoolName: schoolRes.school?.name ?? readSchoolBrand().name ?? BRAND_NAME,
    adminDay: dashboardRes.day?.kind === "admin_day" ? dashboardRes.day : null,
  };
}
