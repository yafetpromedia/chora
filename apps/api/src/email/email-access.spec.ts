import 'reflect-metadata';
import { PLATFORM_OWNER_ONLY_KEY } from '../common/decorators/require-platform-permissions.decorator';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { EmailAdminController } from './email-admin.controller';
import { SchoolEmailPreferenceController } from './email-preferences.controller';

describe('email permissions', () => {
  it('keeps platform email routes owner-only', () => {
    expect(Reflect.getMetadata(PLATFORM_OWNER_ONLY_KEY, EmailAdminController)).toBe(
      true,
    );
  });

  it('keeps school email settings on the school admin role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, SchoolEmailPreferenceController)).toEqual([
      'admin',
    ]);
  });
});
