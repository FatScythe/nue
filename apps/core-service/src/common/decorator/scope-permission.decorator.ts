import { SetMetadata } from '@nestjs/common';
import { ApiScope } from '@database';

export const PERMISSION_KEY = 'scope_permissions_check';

// Allows single scopePermission, arrays of scopePermissions (AND), or nested arrays (OR)
export type PermissionCondition = ApiScope | ApiScope[] | PermissionCondition[];

/**
 * Decorator to enforce fine-grained scope permissions on endpoints.
 *
 * Usage Examples:
 * - Single Scope: @Permissions('customer:create')
 * - AND Condition: @Permissions(['customer:read', 'account:read'])
 * - OR Condition: @Permissions([['customer:create', 'customer:update']])
 */
export const Permissions = (...scopePermissions: PermissionCondition[]) =>
  SetMetadata(PERMISSION_KEY, scopePermissions);
