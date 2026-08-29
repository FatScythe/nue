import { GlCategory, GlNormalBalance } from '@database';

/**
 * helper to auto-assign the correct default normal balance based on GL category.
 */
export function getDefaultNormalBalance(category: GlCategory): GlNormalBalance {
  switch (category) {
    case GlCategory.Asset:
    case GlCategory.Expense:
      return GlNormalBalance.Debit;
    case GlCategory.Liability:
    case GlCategory.Equity:
    case GlCategory.Income:
      return GlNormalBalance.Credit;
  }
}
