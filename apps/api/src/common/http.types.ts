import { Request } from 'express';
import { AuthUser } from './auth.types';

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
  schoolId?: string;
};
