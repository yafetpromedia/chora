export type UserRole = "admin" | "teacher" | "student" | "parent";

export interface JwtUser {
  userId: string;
  schoolId: string;
  role: UserRole;
  email: string;
}
