import { SetMetadata } from '@nestjs/common';

// libs...
import { Resources } from '@database';

export const SCOPE_KEY = 'scopes_check';

/**
 * Defines the resource condition required for controller-level access.
 * Restricted strictly to a single Resources enum value.
 */
export type ScopeCondition = Resources;

/**
 * Decorator to enforce broad, module-level resource boundaries on controllers.
 *
 * Usage Example:
 * @Scopes(Resources.Account)
 */
export const Scope = (scope: ScopeCondition) => SetMetadata(SCOPE_KEY, [scope]);
