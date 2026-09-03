export enum AccountProductStatus {
  Draft = 'draft',
  Active = 'active',
  Inactive = 'inactive',
  Deprecated = 'deprecated',
}

export enum AccountProductType {
  Savings = 'savings',
  Current = 'current',
  FixedDeposit = 'fixed_deposit', // can be structured as Mudarabah or Wakalah...
  Loan = 'loan',
  Financing = 'financing',
}

export enum ShariaContractType {
  Murabaha = 'murabaha', // cost-plus profit financing...
  Ijarah = 'ijarah', // leasing...
  Mudarabah = 'mudarabah', // profit-sharing investment...
  Musharakah = 'musharakah', // partnership / joint venture...
  QardHasan = 'qard_hasan', // benevolent (interest-free) loan...
  Wakalah = 'wakalah', // agency contract...
  Istisna = 'istisna', // manufacturing / construction financing...
}

export enum AccountTenorUnit {
  Days = 'days',
  Weeks = 'weeks',
  Months = 'months',
  Years = 'years',
}
