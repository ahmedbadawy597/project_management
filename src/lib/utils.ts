import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInCalendarDays, isValid } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getUiLocale(): 'en' | 'ar' {
  return document.documentElement.lang === 'ar' ? 'ar' : 'en'
}

export function formatDate(value?: string | Date | null, pattern = 'dd MMM yyyy') {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return '—'
  const locale = getUiLocale() === 'ar' ? arSA : enUS
  return format(date, pattern, { locale })
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`
}

export function formatCurrency(value: number, currency = 'SAR', lang?: 'en' | 'ar') {
  const locale = (lang ?? getUiLocale()) === 'ar' ? 'ar-SA' : 'en-SA'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number, lang?: 'en' | 'ar') {
  const locale = (lang ?? getUiLocale()) === 'ar' ? 'ar-SA' : 'en-SA'
  return new Intl.NumberFormat(locale).format(value)
}

export function daysBetween(a: string, b: string) {
  return differenceInCalendarDays(parseISO(b), parseISO(a))
}

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join(
    '\n',
  )
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
