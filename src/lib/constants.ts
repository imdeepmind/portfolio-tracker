export const CURRENCY = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
};

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency: CURRENCY.code,
    minimumFractionDigits: 2,
    notation: 'compact',
  }).format(amount);

export const formatCurrencyNoDecimal = (amount: number): string =>
  new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency: CURRENCY.code,
    notation: 'compact',
  }).format(amount);

export const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString(CURRENCY.locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const formatDateTime = (date: string): string =>
  new Date(date).toLocaleDateString(CURRENCY.locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Rent & Housing',
  'Utilities & Bills',
  'Shopping',
  'Transportation',
  'Entertainment & Leisure',
  'Health & Medical',
  'Investment & Savings',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_SOURCES = [
  'Bank Account',
  'Credit Card',
  'Debit Card',
  'UPI / Digital Wallet',
  'Cash',
  'Other',
] as const;

export type ExpenseSource = (typeof EXPENSE_SOURCES)[number];
