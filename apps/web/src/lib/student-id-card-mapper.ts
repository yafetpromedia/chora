import type { StudentRecord } from "@/lib/api";
import type { StudentIdCard } from "@/lib/student-cards";
import { AUTH_SCHOOL_JOIN_CODE_KEY, AUTH_SCHOOL_NAME_KEY } from "@/lib/auth";

function ageFromDob(iso: string | null) {
  if (!iso) return null;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

/** Build a preview card from a student row (fetch API for final card + QR code). */
export function mapStudentRecordToIdCard(
  student: StudentRecord,
  partial?: Partial<StudentIdCard>,
): StudentIdCard {
  const schoolName =
    partial?.schoolName ??
    (typeof window !== "undefined" ? localStorage.getItem(AUTH_SCHOOL_NAME_KEY) : null) ??
    "CampusOne";
  const schoolJoinCode =
    partial?.schoolJoinCode ??
    (typeof window !== "undefined" ? localStorage.getItem(AUTH_SCHOOL_JOIN_CODE_KEY) : null) ??
    "";

  const name = [student.user.firstName, student.middleName, student.user.lastName]
    .filter(Boolean)
    .join(" ");

  const year = new Date().getFullYear();
  const cardCode = partial?.cardCode ?? "PENDING";
  const scanPayload = partial?.scanPayload ?? `CAMPUS1:${cardCode}`;

  const father = student.parents[0]?.parent;
  const mother = student.parents[1]?.parent;
  const fatherName = father ? `${father.firstName} ${father.lastName}`.trim() : null;
  const motherName = mother ? `${mother.firstName} ${mother.lastName}`.trim() : null;

  return {
    studentProfileId: student.id,
    cardCode,
    scanPayload,
    name,
    firstName: student.user.firstName,
    lastName: student.user.lastName,
    middleName: student.middleName,
    photoUrl: student.photoUrl,
    grade: student.grade.name,
    section: student.section?.name ?? null,
    studentId: student.user.externalRef,
    fan: student.fan?.trim() || student.fcn?.trim() || null,
    address: [student.woreda, student.zone, student.region]
      .map((p) => p?.trim())
      .filter(Boolean)
      .join(", ") || null,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
    age: ageFromDob(student.dateOfBirth),
    phone: student.phone,
    schoolName,
    schoolLogoUrl: partial?.schoolLogoUrl ?? null,
    schoolJoinCode,
    schoolPhone: partial?.schoolPhone ?? null,
    schoolAddress: partial?.schoolAddress ?? null,
    schoolEmail: partial?.schoolEmail ?? null,
    validThrough: `${year}–${year + 1}`,
    academicYear: partial?.academicYear ?? String(year),
    issuedAt: partial?.issuedAt ?? new Date().toISOString(),
    fatherName,
    fatherPhone: father?.phone ?? null,
    motherName,
    motherPhone: mother?.phone ?? null,
    emergencyContactName: fatherName ?? motherName,
    emergencyContactPhone: father?.phone ?? mother?.phone ?? null,
    ...partial,
  };
}
