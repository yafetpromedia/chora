import { SetMetadata } from '@nestjs/common';
import type { SchoolModuleKey } from '../../subscriptions/module-catalog';

export const SCHOOL_MODULE_KEY = 'school_module';

export const RequireSchoolModule = (module: SchoolModuleKey) =>
  SetMetadata(SCHOOL_MODULE_KEY, module);
