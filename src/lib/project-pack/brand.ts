/** Strategizeit / Awqaf PPM document branding (aligned with Action Items style). */
export const BRAND = {
  company: 'Strategizeit',
  product: 'Awqaf PPM',
  documentTitle: 'Project Pack — Project + Apps + Delivery Plans',
  documentTitleAr: 'حزمة المشروع — المشروع والتطبيقات وخطط التسليم',
  client: 'Ministry of Awqaf — Egypt',
  clientAr: 'وزارة الأوقاف — جمهورية مصر العربية',
  classification: 'CONFIDENTIAL',
  version: '1.0',
  status: 'Template',
  colors: {
    navy: '0B1F33',
    teal: '0F766E',
    green: '1F6B47',
    deepGreen: '14532D',
    cream: 'F7F3E8',
    creamDark: 'EFE8D8',
    grey: 'E8EDF2',
    white: 'FFFFFF',
    text: '1A2332',
    muted: '5B6573',
    border: 'C9D2DC',
    headerText: 'FFFFFF',
    accent: 'C4A35A',
  },
  fonts: {
    en: 'Calibri',
    ar: 'Calibri',
  },
} as const

export type BrandColors = typeof BRAND.colors
