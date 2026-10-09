import { SetMetadata } from '@nestjs/common';

import { Resources } from '@libs/database/drizzle/enums';
import { RolePermissions } from '@libs/database/drizzle/types';

export const PERMISSION_CHECK_KEY = 'permission_check';

export type RequiredPermission = {
  resource: Resources;
  action: string;
};

/**
 * @param resource - The domain (e.g., Resources.Lien)
 * @param action - The specific action (e.g., 'View')
 */
export const Authorize = <T extends Resources>(
  resource: T,
  action: keyof RolePermissions[T],
) => SetMetadata(PERMISSION_CHECK_KEY, { resource, action });
