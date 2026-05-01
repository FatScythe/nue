import { SetMetadata } from '@nestjs/common';
import { Resources } from '@database/enums';

export const SCOPES_KEY = 'scopes_check';

// This allows: Resource, [Resource, Resource], or [[Resource, Resource], Resource]
export type ScopeCondition = Resources | Resources[] | any[];

export const Scopes = (...scopes: ScopeCondition[]) =>
  SetMetadata(SCOPES_KEY, scopes);
