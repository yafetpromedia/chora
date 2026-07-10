import { listStudents } from "@/lib/school-setup";
import { listTeachers } from "@/lib/teachers";
import { listParents } from "@/lib/parents";

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: string[][]) {
  const body = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export async function downloadStudentsReport() {
  const students = await listStudents();
  const rows: string[][] = [
    [
      "Name",
      "Student ID",
      "Grade",
      "Section",
      "Email",
      "Phone",
      "Gender",
      "Parent",
      "Parent phone",
    ],
  ];

  for (const student of students) {
    const parent = student.parents[0]?.parent;
    rows.push([
      `${student.user.firstName} ${student.user.lastName}`.trim(),
      student.user.externalRef ?? student.id,
      student.grade.name,
      student.section?.name ?? "",
      student.user.email,
      student.phone ?? "",
      student.gender ?? "",
      parent ? `${parent.firstName} ${parent.lastName}`.trim() : "",
      parent?.phone ?? "",
    ]);
  }

  downloadCsv(`students-roster-${todayStamp()}.csv`, rows);
}

export async function downloadTeachersReport() {
  const teachers = await listTeachers();
  const rows: string[][] = [
    ["Name", "Email", "Role", "Homeroom", "Teaching assignments"],
  ];

  for (const teacher of teachers) {
    const homeroom = teacher.homeroom
      ? `${teacher.homeroom.gradeName}${teacher.homeroom.sectionName ? ` · ${teacher.homeroom.sectionName}` : ""}`
      : "";
    const assignments =
      teacher.teachingSlots.length > 0
        ? teacher.teachingSlots
            .map(
              (slot) =>
                `${slot.gradeName}${slot.sectionName ? ` ${slot.sectionName}` : ""} — ${slot.subjectName}`,
            )
            .join("; ")
        : teacher.assignments
            .map(
              (a) =>
                `${a.gradeName}${a.sectionName ? ` ${a.sectionName}` : ""}${a.subjectName ? ` — ${a.subjectName}` : ""}`,
            )
            .join("; ");

    rows.push([
      teacher.name,
      teacher.email,
      teacher.roleTemplateName ?? teacher.portalRole,
      homeroom,
      assignments,
    ]);
  }

  downloadCsv(`teachers-roster-${todayStamp()}.csv`, rows);
}

export async function downloadParentsReport() {
  const parents = await listParents();
  const rows: string[][] = [
    ["Name", "Username", "Email", "Phone", "Linked children"],
  ];

  for (const parent of parents) {
    const children =
      parent.children.length > 0
        ? parent.children
            .map(
              (child) =>
                `${child.name} (${child.gradeName}${child.sectionName ? ` ${child.sectionName}` : ""})`,
            )
            .join("; ")
        : "";

    rows.push([parent.name, parent.username, parent.email, parent.phone ?? "", children]);
  }

  downloadCsv(`parents-roster-${todayStamp()}.csv`, rows);
}
