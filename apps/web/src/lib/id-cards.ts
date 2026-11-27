import { apiPost } from "@/lib/api";

export type IdCardLookupResult =
  | {
      kind: "student";
      cardCode: string;
      scanPayload: string;
      name: string;
      photoUrl: string | null;
      studentProfileId: string;
      studentId: string | null;
      grade: string;
      section: string | null;
      gender: string | null;
      phone: string | null;
    }
  | {
      kind: "staff";
      cardCode: string | null;
      scanPayload: string;
      name: string;
      photoUrl: string | null;
      userId: string;
      teacherId: string | null;
      roleLabel: string;
      credential: "teacher_card" | "staff_gate_qr";
      phone: string | null;
    };

export async function lookupIdCard(code: string) {
  return apiPost<IdCardLookupResult>("/id-cards/lookup", { code });
}
