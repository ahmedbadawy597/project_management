/**
 * Writes branded Strategizeit Excel templates into public/templates.
 * Run: npm run templates:project-pack
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'public', 'templates')

// Build via vitest/vite is heavy; regenerate by importing compiled path is awkward.
// Instead shell into tsx if available, else duplicate thin exceljs generator here.
const ExcelJS = (await import('exceljs')).default
const timeline = JSON.parse(
  fs.readFileSync(path.join(root, 'src/lib/project-pack/timeline-sample-data.json'), 'utf8'),
)

const C = {
  navy: '0B1F33',
  teal: '0F766E',
  green: '1F6B47',
  cream: 'F7F3E8',
  grey: 'E8EDF2',
  text: '1A2332',
  muted: '5B6573',
  border: 'C9D2DC',
  headerText: 'FFFFFF',
  accent: 'C4A35A',
}

function fill(cell, argb) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${argb}` } }
}
function font(cell, opts = {}) {
  cell.font = {
    name: 'Calibri',
    size: opts.size ?? 11,
    bold: opts.bold,
    italic: opts.italic,
    color: { argb: `FF${opts.color ?? C.text}` },
  }
}
function border(cell) {
  const e = { style: 'thin', color: { argb: `FF${C.border}` } }
  cell.border = { top: e, left: e, bottom: e, right: e }
}

async function loadFromViteBundle() {
  // Prefer generating through the same TS module used by the website.
  // Use node --import tsx if present.
  try {
    const { register } = await import('node:module')
    void register
  } catch {
    /* ignore */
  }
}

void loadFromViteBundle
void require

async function writeViaDynamicImport() {
  // Spawn vitest/node with vite-node style is complex; call exceljs rebuild by
  // importing the built logic through a small inline that mirrors branded-workbook.
  // Simplest reliable path: use `npx vite-node` if available.
  const { spawnSync } = await import('node:child_process')
  const runner = path.join(root, 'scripts/write-templates-via-vite.mjs')
  if (fs.existsSync(runner)) {
    const r = spawnSync(process.execPath, [runner], { cwd: root, encoding: 'utf8' })
    if (r.status === 0) {
      console.log(r.stdout)
      return true
    }
  }
  return false
}

// Fallback lightweight writer (same branding) — kept so npm script always works.
async function writeFallback() {
  fs.mkdirSync(outDir, { recursive: true })
  for (const [file, kind] of [
    ['Awqaf_PPM_Project_Pack_Template.xlsx', 'template'],
    ['Awqaf_PPM_Project_Pack_Sample.xlsx', 'sample'],
  ]) {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Strategizeit'
    const cover = wb.addWorksheet('Cover')
    cover.getCell('A1').value = 'STRATEGIZEIT'
    fill(cover.getCell('A1'), C.navy)
    font(cover.getCell('A1'), { bold: true, color: C.accent, size: 14 })
    cover.getCell('A3').value = 'Awqaf PPM — Project Pack'
    fill(cover.getCell('A3'), C.navy)
    font(cover.getCell('A3'), { bold: true, color: C.headerText, size: 20 })
    cover.getCell('A5').value =
      kind === 'sample' ? 'SAMPLE from Awqaf Timeline Phase 1' : 'OFFICIAL TEMPLATE'
    font(cover.getCell('A5'), { color: C.muted })

    const how = wb.addWorksheet('How_to_Fill')
    how.getCell('A1').value = 'Same person on many apps: repeat email rows in 03_Team with different app_code.'

    const project = wb.addWorksheet('01_Project')
    const headers = [
      'project_code',
      'name_ar',
      'name_en',
      'manager_email',
      'status',
      'planned_start',
      'planned_end',
      'phase',
      'description_ar',
      'description_en',
    ]
    headers.forEach((h, i) => {
      const cell = project.getRow(1).getCell(i + 1)
      cell.value = h
      fill(cell, C.teal)
      font(cell, { bold: true, color: C.headerText })
      border(cell)
    })
    const p = kind === 'sample' ? timeline.project : {
      project_code: 'AWQAF-NEW',
      name_ar: 'اسم المشروع',
      name_en: 'Project name',
      manager_email: 'nouran.elsherif@awqaf.gov.sa',
      status: 'Planned',
      planned_start: '2026-10-01',
      planned_end: '2027-09-30',
      phase: 'Initiation',
      description_ar: '',
      description_en: '',
    }
    headers.forEach((h, i) => {
      const cell = project.getRow(2).getCell(i + 1)
      cell.value = p[h] ?? ''
      fill(cell, C.cream)
      border(cell)
    })

    const apps = wb.addWorksheet('02_Apps')
    const appHeaders = [
      'project_code',
      'app_code',
      'name_ar',
      'name_en',
      'owner_email',
      'status',
      'planned_start',
      'planned_end',
      'description_ar',
    ]
    appHeaders.forEach((h, i) => {
      const cell = apps.getRow(1).getCell(i + 1)
      cell.value = h
      fill(cell, C.teal)
      font(cell, { bold: true, color: C.headerText })
      border(cell)
    })
    const appRows =
      kind === 'sample'
        ? timeline.apps
        : [
            {
              project_code: 'AWQAF-NEW',
              app_code: 'APP-01',
              name_ar: 'تطبيق ١',
              name_en: 'Application 1',
              owner_email: 'ahmed.gamal@awqaf.gov.sa',
              status: 'Planned',
              planned_start: '2026-10-01',
              planned_end: '2027-03-31',
              description_ar: '',
            },
          ]
    appRows.forEach((a, ri) => {
      appHeaders.forEach((h, i) => {
        const cell = apps.getRow(ri + 2).getCell(i + 1)
        cell.value = a[h] ?? ''
        fill(cell, C.cream)
        border(cell)
      })
    })

    const team = wb.addWorksheet('03_Team')
    ;['project_code', 'app_code', 'person_email', 'role'].forEach((h, i) => {
      const cell = team.getRow(1).getCell(i + 1)
      cell.value = h
      fill(cell, C.teal)
      font(cell, { bold: true, color: C.headerText })
      border(cell)
    })
    const teamRows =
      kind === 'sample'
        ? [
            ['AWQAF-GIS-P1', '', 'nouran.elsherif@awqaf.gov.sa', 'AppManager'],
            ['AWQAF-GIS-P1', 'GIS-UNIT', 'ahmed.gamal@awqaf.gov.sa', 'AppManager'],
            ['AWQAF-GIS-P1', 'GIS-UNIT', 'aya.hassin@awqaf.gov.sa', 'Developer'],
            ['AWQAF-GIS-P1', 'GEO-GOV', 'mohammed.elkasry@awqaf.gov.sa', 'AppManager'],
            ['AWQAF-GIS-P1', 'GEO-GOV', 'aya.hassin@awqaf.gov.sa', 'Developer'],
            ['AWQAF-GIS-P1', 'SPATIAL-RESPONSE', 'belal.abbas@awqaf.gov.sa', 'AppManager'],
            ['AWQAF-GIS-P1', 'SPATIAL-RESPONSE', 'aya.hassin@awqaf.gov.sa', 'Developer'],
            ['AWQAF-GIS-P1', 'SPATIAL-RESPONSE', 'ahmed.gamal@awqaf.gov.sa', 'Developer'],
          ]
        : [
            ['AWQAF-NEW', '', 'nouran.elsherif@awqaf.gov.sa', 'AppManager'],
            ['AWQAF-NEW', 'APP-01', 'ahmed.gamal@awqaf.gov.sa', 'AppManager'],
            ['AWQAF-NEW', 'APP-01', 'aya.hassin@awqaf.gov.sa', 'Developer'],
          ]
    teamRows.forEach((row, ri) => {
      row.forEach((v, i) => {
        const cell = team.getRow(ri + 2).getCell(i + 1)
        cell.value = v
        fill(cell, C.cream)
        border(cell)
      })
    })

    const planCols = [
      'section',
      'item_code',
      'parent_code',
      'type',
      'name_ar',
      'name_en',
      'start',
      'end',
      'progress',
      'weight_pct',
      'assignee_email',
      'owner_email',
      'depends_on',
      'baseline_date',
      'forecast_date',
      'status',
      'severity',
      'deliverables_ar',
      'deliverable_ar',
    ]
    function addPlan(name, rows) {
      const ws = wb.addWorksheet(name.slice(0, 31))
      planCols.forEach((h, i) => {
        const cell = ws.getRow(1).getCell(i + 1)
        cell.value = h
        fill(cell, C.teal)
        font(cell, { bold: true, color: C.headerText })
        border(cell)
      })
      rows.forEach((r, ri) => {
        planCols.forEach((h, i) => {
          const cell = ws.getRow(ri + 2).getCell(i + 1)
          cell.value = r[h] ?? ''
          fill(cell, C.cream)
          border(cell)
        })
      })
    }
    addPlan('Plan_TEMPLATE', [{ section: 'schedule', item_code: 'PH-ANALYSIS', type: 'phase', name_ar: 'التحليل', name_en: 'Analysis' }])
    if (kind === 'sample') {
      for (const plan of timeline.plans) {
        addPlan(`Plan_${plan.app_code}`, plan.rows)
      }
    }

    const out = path.join(outDir, file)
    await wb.xlsx.writeFile(out)
    console.log('Wrote', pathToFileURL(out).href)
  }
}

const usedVite = await writeViaDynamicImport()
if (!usedVite) await writeFallback()
