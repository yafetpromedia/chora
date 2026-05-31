import { apiPost } from "@/lib/api";

export type FayedaSendCodeResult = {
  sessionId: string;
  maskedPhone: string;
  identifierType: "FAN" | "FCN";
};

export type FayedaVerifiedProfile = {
  verificationToken: string;
  fan: string;
  fcn: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  nationality: string;
  phone: string | null;
  region: string | null;
  zone: string | null;
  woreda: string | null;
  photoUrl: string;
};

export async function sendFayedaCode(identifier: string) {
  return apiPost<FayedaSendCodeResult>("/schools/fayeda/send-code", { identifier });
}

export async function verifyFayedaCode(sessionId: string, code: string) {
  return apiPost<FayedaVerifiedProfile>("/schools/fayeda/verify", { sessionId, code });
}
