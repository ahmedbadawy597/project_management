#!/usr/bin/env node
/**
 * Guard against physical CSS/Tailwind direction properties creeping back.
 * Prefer logical: ms/me/ps/pe/start/end/text-start/text-end/rounded-s/rounded-e
 * and CSS margin-inline / padding-inline / inset-inline / border-inline / text-align: start|end.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'src')

const PHYSICAL = [
  // Tailwind physical utilities (word-boundary style)
  /\b(?:ml|mr|pl|pr)-(?:\[|[0-9]|auto|px)/,
  /\b(?:left|right)-(?:\[|[0-9]|auto|full|1\/2)/,
  /\btext-(?:left|right)\b/,
  /\brounded-(?:l|r)(?:-\w+)?\b/,
  /\bfloat-(?:left|right)\b/,
  /\bflex-row-reverse\b/,
  // Raw CSS physical properties
  /(?:margin|padding)-(?:left|right)\s*:/,
  /border-(?:left|right)(?:-width|-style|-color)?\s*:/,
  /(?:^|[^\w-])(?:left|right)\s*:/,
  /text-align\s*:\s*(?:left|right)\b/,
]

/** Allowed exceptions: true geometric centering, charts, known OK files */
const ALLOW = [
  /dialog\.tsx$/, // modal uses left-1/2 + -translate-x-1/2 for viewport centering
  /index\.css$/, // keyframe translateX paired with rtl variant
  /ExecutivePage\.tsx$/, // Recharts YAxis orientation API is left|right
  /BudgetPanel\.tsx$/,
  /ResourcesPage\.tsx$/,
  /SlaPage\.tsx$/,
  /branded-workbook\.ts$/, // ExcelJS Border/Alignment APIs use left|right keys
]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      walk(p, out)
    } else if (/\.(tsx?|css)$/.test(name)) {
      out.push(p)
    }
  }
  return out
}

const files = walk(SRC)
const hits = []

for (const file of files) {
  if (ALLOW.some((re) => re.test(file))) continue
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return
    for (const re of PHYSICAL) {
      if (re.test(line)) {
        hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`)
        break
      }
    }
  })
}

if (hits.length) {
  console.error('Physical L/R CSS detected (use logical properties):\n')
  for (const h of hits.slice(0, 80)) console.error(`  ${h}`)
  if (hits.length > 80) console.error(`  … and ${hits.length - 80} more`)
  process.exit(1)
}

console.log('Logical CSS guard: OK')
