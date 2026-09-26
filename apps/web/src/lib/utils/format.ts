/**
 * format.ts - Safe Formatting Utilities for AgentPay Control Tower
 * Guarantees zero NaN, Infinity, undefined%, or null% presentation.
 */

export function formatRate(
  value: number | string | null | undefined,
  options?: {
    decimals?: number;
    fallback?: string;
    isRatio?: boolean;
    emptyIfZero?: boolean;
    emptyText?: string;
  }
): string {
  const decimals = options?.decimals ?? 1;
  const fallback = options?.fallback ?? '—';
  const emptyText = options?.emptyText ?? 'No completed workflows';

  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'object') {
    return fallback;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return fallback;
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (isNaN(num) || !Number.isFinite(num)) {
    return fallback;
  }

  if (options?.emptyIfZero && num === 0) {
    return emptyText;
  }

  if (options?.isRatio !== false && num > 0 && num <= 1) {
    return `${(num * 100).toFixed(decimals)}%`;
  }

  return `${num.toFixed(decimals)}%`;
}

export function formatPercent(
  numerator: number | string | null | undefined,
  denominator: number | string | null | undefined,
  options?: {
    decimals?: number;
    fallback?: string;
    zeroDenominatorText?: string;
  }
): string {
  const decimals = options?.decimals ?? 1;
  const fallback = options?.fallback ?? '—';
  const zeroDenominatorText = options?.zeroDenominatorText ?? '—';

  if (
    denominator === null ||
    denominator === undefined ||
    typeof denominator === 'object' ||
    isNaN(Number(denominator)) ||
    !Number.isFinite(Number(denominator)) ||
    Number(denominator) === 0
  ) {
    return zeroDenominatorText;
  }

  if (
    numerator === null ||
    numerator === undefined ||
    typeof numerator === 'object' ||
    isNaN(Number(numerator)) ||
    !Number.isFinite(Number(numerator))
  ) {
    return fallback;
  }

  const numNum = Number(numerator);
  const denNum = Number(denominator);
  const pct = (numNum / denNum) * 100;
  if (isNaN(pct) || !Number.isFinite(pct)) {
    return fallback;
  }

  return `${pct.toFixed(decimals)}%`;
}

export function formatCurrency(
  val: number | string | null | undefined,
  options?: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
    fallback?: string;
    divideByMicro?: boolean;
  }
): string {
  const decimals = options?.decimals ?? 2;
  const prefix = options?.prefix ?? '$';
  const suffix = options?.suffix ?? '';
  const fallback = options?.fallback ?? '—';

  if (val === null || val === undefined || val === '' || typeof val === 'object') {
    return fallback;
  }

  let num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num) || !Number.isFinite(num)) {
    return fallback;
  }

  if (options?.divideByMicro) {
    num = num / 1e6;
  }

  return `${prefix}${num.toFixed(decimals)}${suffix ? ' ' + suffix : ''}`;
}

export function formatCount(
  val: number | string | null | undefined,
  fallback: string = '0'
): string {
  if (val === null || val === undefined || typeof val === 'object') return fallback;
  const num = typeof val === 'number' ? val : parseInt(String(val), 10);
  if (isNaN(num) || !Number.isFinite(num)) return fallback;
  return num.toLocaleString();
}
