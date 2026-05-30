export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface AuthUser {
  id: string;
  schoolId: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
}
