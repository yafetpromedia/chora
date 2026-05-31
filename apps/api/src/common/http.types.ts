import { Request } from 'express';
import { AuthUser, JwtPayload } from './auth.types';

export type AuthenticatedRequest = Request & {
  user?: JwtPayload;
  schoolId?: string;
};

export type SchoolAuthenticatedRequest = Request & {
  user: AuthUser;
  schoolId: string;
};
