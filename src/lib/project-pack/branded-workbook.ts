import ExcelJS from 'exceljs'
import {
  APP_COLUMNS,
  APP_STATUSES,
  MILESTONE_STATUSES,
  PHASE_SKELETON,
  PLAN_COLUMNS,
  PLAN_SECTIONS,
  PROJECT_COLUMNS,
  PROJECT_STATUSES,
  RISK_SEVERITIES,
  RISK_STATUSES,
  RISK_TYPES,
  SCHEDULE_TYPES,
  SHEETS,
  TEAM_COLUMNS,
  TEAM_ROLES,
} from './constants'
import { BRAND } from './brand'
import { planSheetName } from './ids'
import timelineSample from './timeline-sample-data.json'
import type { ExportPackInput } from './workbook-types'

const C = BRAND.colors

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${argb}` } }
}

function font(
  cell: ExcelJS.Cell,
  opts: Partial<ExcelJS.Font> & { color?: string } = {},
) {
  cell.font = {
    name: BRAND.fonts.en,
    size: opts.size ?? 11,
    bold: opts.bold,
    italic: opts.italic,
    color: { argb: `FF${opts.color ?? C.text}` },
  }
}

function borderThin(cell: ExcelJS.Cell) {
  const edge: ExcelJS.Border = { style: 'thin', color: { argb: `FF${C.border}` } }
  cell.border = { top: edge, left: edge, bottom: edge, right: edge }
}

function styleHeaderRow(row: ExcelJS.Row, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c)
    fill(cell, C.teal)
    font(cell, { bold: true, color: C.headerText, size: 11 })
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    borderThin(cell)
  }
  row.height = 28
}

function styleCreamRow(row: ExcelJS.Row, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c)
    fill(cell, C.cream)
    font(cell, { size: 11 })
    cell.alignment = { vertical: 'middle', wrapText: true }
    borderThin(cell)
  }
}

function styleLabel(cell: ExcelJS.Cell) {
  fill(cell, C.navy)
  font(cell, { bold: true, color: C.headerText, size: 11 })
  cell.alignment = { vertical: 'middle' }
  borderThin(cell)
}

function styleValue(cell: ExcelJS.Cell) {
  fill(cell, C.cream)
  font(cell, { size: 11 })
  cell.alignment = { vertical: 'middle', wrapText: true }
  borderThin(cell)
}

function addBanner(ws: ExcelJS.Worksheet, title: string, subtitle?: string) {
  ws.mergeCells('A1', 'H1')
  const t = ws.getCell('A1')
  t.value = title
  fill(t, C.navy)
  font(t, { bold: true, size: 16, color: C.headerText })
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(1).height = 32

  ws.mergeCells('A2', 'H2')
  const s = ws.getCell('A2')
  s.value = subtitle ?? `${BRAND.company}  ·  ${BRAND.product}  ·  ${BRAND.classification}`
  fill(s, C.green)
  font(s, { size: 10, color: C.headerText })
  s.alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(2).height = 22
}

function setCols(ws: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })
}

function buildCover(wb: ExcelJS.Workbook, kind: 'template' | 'sample' | 'export', meta?: { projectCode?: string; projectName?: string }) {
  const ws = wb.addWorksheet('Cover', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 18 },
  })
  setCols(ws, [3, 18, 18, 18, 18, 18, 18, 14])

  for (let r = 1; r <= 6; r++) {
    ws.mergeCells(`A${r}`, `H${r}`)
    fill(ws.getCell(`A${r}`), C.navy)
  }
  ws.getCell('A2').value = BRAND.company.toUpperCase()
  font(ws.getCell('A2'), { bold: true, size: 12, color: C.accent })
  ws.getCell('A2').alignment = { horizontal: 'center' }

  ws.getCell('A3').value = BRAND.documentTitle
  font(ws.getCell('A3'), { bold: true, size: 22, color: C.headerText })
  ws.getCell('A3').alignment = { horizontal: 'center', wrapText: true }
  ws.getRow(3).height = 36

  ws.getCell('A4').value = BRAND.documentTitleAr
  font(ws.getCell('A4'), { size: 14, color: C.cream })
  ws.getCell('A4').alignment = { horizontal: 'center', wrapText: true }

  ws.getCell('A5').value =
    kind === 'sample'
      ? 'SAMPLE — Phase 1 GIS (from Awqaf Timeline)  |  نموذج — المرحلة الأولى GIS'
      : kind === 'export'
        ? `EXPORT — ${meta?.projectCode ?? ''}  |  تصدير`
        : 'OFFICIAL TEMPLATE — fill cream cells, then import in Awqaf PPM'
  font(ws.getCell('A5'), { size: 10, color: C.headerText })
  ws.getCell('A5').alignment = { horizontal: 'center' }

  const fields: Array<[string, string]> = [
    ['Project / المشروع', meta?.projectName || (kind === 'sample' ? timelineSample.project.name_en : '[Enter in 01_Project]')],
    ['Client / الجهة', `${BRAND.client} / ${BRAND.clientAr}`],
    ['Document ID', kind === 'sample' ? 'AWQAF-PPM-PACK-SAMPLE' : kind === 'export' ? `AWQAF-PPM-PACK-${meta?.projectCode ?? 'EXPORT'}` : 'AWQAF-PPM-PACK-TEMPLATE'],
    ['Document Title', BRAND.documentTitle],
    ['Version', BRAND.version],
    ['Status', kind === 'export' ? 'Exported' : BRAND.status],
    ['Date', new Date().toISOString().slice(0, 10)],
    ['Owner', 'Project Manager'],
    ['Prepared By', `[Name] — ${BRAND.company}`],
    ['Classification', BRAND.classification],
  ]

  let row = 9
  ws.getCell(`B${row}`).value = 'Document identity'
  font(ws.getCell(`B${row}`), { bold: true, size: 12, color: C.navy })
  row += 1
  for (const [label, value] of fields) {
    ws.mergeCells(`B${row}`, `C${row}`)
    ws.mergeCells(`D${row}`, `G${row}`)
    styleLabel(ws.getCell(`B${row}`))
    ws.getCell(`B${row}`).value = label
    styleValue(ws.getCell(`D${row}`))
    ws.getCell(`D${row}`).value = value
    ws.getRow(row).height = 22
    row += 1
  }

  row += 1
  ws.mergeCells(`B${row}`, `G${row}`)
  ws.getCell(`B${row}`).value =
    'How to use: Cover → Document Control → How_to_Fill → 01_Project → 02_Apps → 03_Team → copy Plan_TEMPLATE to Plan_<APP_CODE> for each app → Import from Manage.'
  font(ws.getCell(`B${row}`), { size: 10, color: C.muted })
  ws.getCell(`B${row}`).alignment = { wrapText: true }
  ws.getRow(row).height = 40

  row += 2
  ws.mergeCells(`B${row}`, `G${row}`)
  fill(ws.getCell(`B${row}`), C.grey)
  ws.getCell(`B${row}`).value =
    'Cream cells = editable by PM  ·  Teal headers = do not rename  ·  One person can join many apps (repeat email rows in 03_Team)'
  font(ws.getCell(`B${row}`), { size: 10, color: C.text })
  ws.getCell(`B${row}`).alignment = { wrapText: true, vertical: 'middle', indent: 1 }
  ws.getRow(row).height = 28

  row += 2
  ws.mergeCells(`B${row}`, `G${row}`)
  ws.getCell(`B${row}`).value = `© ${BRAND.company}  ·  ${BRAND.product} Project Control Document`
  font(ws.getCell(`B${row}`), { size: 9, color: C.muted, italic: true })
}

function buildDocumentControl(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet('Document Control', { views: [{ showGridLines: false }] })
  setCols(ws, [3, 28, 55, 18, 18])
  addBanner(ws, 'Document Control', 'Edit cream fields. Navy labels are fixed. Keep codes stable after first import.')

  const rows: Array<[string, string]> = [
    ['Project', 'Fill in sheet 01_Project'],
    ['Client', BRAND.client],
    ['Document ID', 'AWQAF-PPM-PACK-001'],
    ['Document Title', BRAND.documentTitle],
    ['Version', BRAND.version],
    ['Status', BRAND.status],
    ['Owner', 'Project Manager'],
    ['Prepared By', `[Name] — ${BRAND.company}`],
    ['Reviewed By', 'TBD — PMO / Technical Lead'],
    ['Approved By', 'TBD'],
    ['Classification', BRAND.classification],
    ['Source timeline', 'Awqaf_Timeline_Phase1_05.xlsx (official Phase 1 schedule)'],
    ['Traceability', 'Project → Apps → Team (multi-app) → Plan_<APP_CODE> (schedule / milestones / risks)'],
    ['Usage note', 'Action: create project + apps + plans offline, then Import project pack in Awqaf PPM Manage hub.'],
  ]

  let r = 4
  for (const [label, value] of rows) {
    styleLabel(ws.getCell(`B${r}`))
    ws.getCell(`B${r}`).value = label
    ws.mergeCells(`C${r}`, `E${r}`)
    styleValue(ws.getCell(`C${r}`))
    ws.getCell(`C${r}`).value = value
    ws.getRow(r).height = 22
    r += 1
  }

  r += 1
  ws.getCell(`B${r}`).value = 'Revision History'
  font(ws.getCell(`B${r}`), { bold: true, size: 12, color: C.navy })
  r += 1
  const hist = ws.getRow(r)
  ;['Version', 'Date', 'Author', 'Description'].forEach((h, i) => {
    hist.getCell(i + 2).value = h
  })
  styleHeaderRow(hist, 4)
  // shift: we used cols B-E = 2-5
  for (let c = 2; c <= 5; c++) {
    const cell = hist.getCell(c)
    fill(cell, C.teal)
    font(cell, { bold: true, color: C.headerText })
    borderThin(cell)
  }
  r += 1
  const rev = ws.getRow(r)
  rev.getCell(2).value = '1.0'
  rev.getCell(3).value = new Date().toISOString().slice(0, 10)
  rev.getCell(4).value = BRAND.company
  rev.getCell(5).value = 'Professional Project Pack template (Strategizeit branding)'
  styleCreamRow(rev, 5)
}

function buildHowToFill(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet('How_to_Fill', { views: [{ showGridLines: false }] })
  setCols(ws, [3, 88])
  addBanner(ws, 'How to Fill / طريقة التعبئة', 'Project Manager guide — bilingual')

  const lines = [
    'EN — Steps',
    '1) Open 01_Project and fill ONE project row (cream cells).',
    '2) Open 02_Apps — one row per application under that project.',
    '3) Open 03_Team — assign people by email + role. To put the SAME person on MANY apps, add one row per app (same email, different app_code). See sample rows.',
    '4) Copy sheet Plan_TEMPLATE once per app. Rename to Plan_<APP_CODE> (example: Plan_GIS-UNIT). Sheet name must match app_code in 02_Apps.',
    '5) In each Plan_* sheet: section=schedule for phases/tasks, section=milestone for acceptance points, section=risk for risks/issues.',
    '6) Dates must be YYYY-MM-DD (map “month 1” from old Gantt to a real calendar date).',
    '7) Import from Awqaf PPM → Manage → Import pack. Keep codes stable after first import.',
    '8) Dashboard: type=phase (+ weight_pct) drives progress bars. Leave progress blank to auto-fill from dates (past=done, active=calendar %, future=0). Child tasks roll up to the phase.',
    '',
    'AR — الخطوات',
    '1) عبّئ 01_Project بصف واحد للمشروع.',
    '2) عبّئ 02_Apps: صف لكل تطبيق.',
    '3) عبّئ 03_Team: نفس الشخص يمكن إضافته لأكثر من تطبيق — صف لكل تطبيق بنفس البريد مع app_code مختلف.',
    '4) انسخ Plan_TEMPLATE لكل تطبيق وأعد التسمية Plan_<كود_التطبيق>.',
    '5) في كل خطة: schedule للمراحل/المهام، milestone لنقاط الاعتماد، risk للمخاطر.',
    '6) التواريخ YYYY-MM-DD فقط.',
    '7) الاستيراد من إدارة المشاريع في النظام.',
    '8) لوحة التطبيق: type=phase مع weight_pct لأشرطة التقدم. اترك progress فارغاً ليُحسب من التواريخ (الماضي مكتمل، الجاري حسب التقويم). المهام الفرعية تُحدّث المرحلة.',
    '',
    'Multi-app membership example (see 03_Team):',
    '  aya.hassin@awqaf.gov.sa + GIS-UNIT + Developer',
    '  aya.hassin@awqaf.gov.sa + GEO-GOV + Developer',
    '  aya.hassin@awqaf.gov.sa + SPATIAL-RESPONSE + Developer',
    '→ one developer assigned to three apps.',
  ]
  let r = 4
  for (const line of lines) {
    ws.mergeCells(`B${r}`, `B${r}`)
    const cell = ws.getCell(`B${r}`)
    cell.value = line
    if (line.startsWith('EN') || line.startsWith('AR') || line.startsWith('Multi')) {
      font(cell, { bold: true, size: 12, color: C.navy })
    } else {
      font(cell, { size: 11, color: C.text })
    }
    ws.getRow(r).height = line ? 18 : 10
    r += 1
  }
}

function writeTable(
  ws: ExcelJS.Worksheet,
  startRow: number,
  headers: readonly string[],
  data: (string | number)[][],
  note?: string,
) {
  let r = startRow
  if (note) {
    ws.mergeCells(r, 1, r, headers.length)
    const n = ws.getCell(r, 1)
    n.value = note
    fill(n, C.grey)
    font(n, { size: 10, color: C.muted, italic: true })
    ws.getRow(r).height = 22
    r += 1
  }
  const header = ws.getRow(r)
  headers.forEach((h, i) => {
    header.getCell(i + 1).value = h
  })
  styleHeaderRow(header, headers.length)
  r += 1
  for (const rowData of data) {
    const row = ws.getRow(r)
    rowData.forEach((v, i) => {
      row.getCell(i + 1).value = v
    })
    styleCreamRow(row, headers.length)
    r += 1
  }
  return r
}

function emptyPlanMatrix(): (string | number)[][] {
  const rows: (string | number)[][] = []
  for (const ph of PHASE_SKELETON) {
    rows.push([
      'schedule',
      ph.item_code,
      ph.parent_code,
      ph.type,
      ph.name_ar,
      ph.name_en,
      '',
      '',
      0,
      ph.weight_pct,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ])
  }
  rows.push([
    'schedule',
    'TK-EXAMPLE-1',
    'PH-BUILD-R1',
    'task',
    'مهمة مثال تحت الإصدار 1',
    'Example task under Release 1',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'مخرج قابل للتسليم',
  ])
  rows.push([
    'milestone',
    'MS-UAT',
    '',
    '',
    'اعتماد اختبار القبول',
    'UAT accepted',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Upcoming',
    '',
    'تقرير UAT; محضر اعتماد',
    '',
  ])
  rows.push([
    'milestone',
    'MS-GO-LIVE',
    '',
    '',
    'الإطلاق الإنتاجي',
    'Go-Live',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Upcoming',
    '',
    'تشغيل الإنتاج',
    '',
  ])
  rows.push([
    'risk',
    'RSK-01',
    '',
    'risk',
    'تأخر اعتماد المتطلبات',
    'Requirements approval delay',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Open',
    'Medium',
    '',
    '',
  ])
  return rows
}

function writePlanSheet(wb: ExcelJS.Workbook, name: string, rows: (string | number)[][], note: string) {
  const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 4 }] })
  setCols(
    ws,
    PLAN_COLUMNS.map((c) => Math.min(22, Math.max(12, c.length + 4))),
  )
  addBanner(ws, `App Delivery Plan — ${name}`, note)
  writeTable(ws, 4, PLAN_COLUMNS, rows, 'section = schedule | milestone | risk   ·   Cream = edit   ·   Do not rename headers')
}

function writeLists(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet(SHEETS.lists, { views: [{ state: 'frozen', ySplit: 3 }] })
  setCols(ws, [16, 14, 14, 14, 14, 16, 12, 14, 14, 14])
  addBanner(ws, 'Reference Lists', 'Use these values in dropdowns / validation. Extend carefully.')
  const headers = [
    'project_status',
    'app_status',
    'team_role',
    'plan_section',
    'schedule_type',
    'milestone_status',
    'risk_type',
    'risk_severity',
    'risk_status',
    'date_format',
  ]
  const max = Math.max(
    PROJECT_STATUSES.length,
    APP_STATUSES.length,
    TEAM_ROLES.length,
    PLAN_SECTIONS.length,
    SCHEDULE_TYPES.length,
    MILESTONE_STATUSES.length,
    RISK_TYPES.length,
    RISK_SEVERITIES.length,
    RISK_STATUSES.length,
  )
  const data: (string | number)[][] = []
  for (let i = 0; i < max; i++) {
    data.push([
      PROJECT_STATUSES[i] ?? '',
      APP_STATUSES[i] ?? '',
      TEAM_ROLES[i] ?? '',
      PLAN_SECTIONS[i] ?? '',
      SCHEDULE_TYPES[i] ?? '',
      MILESTONE_STATUSES[i] ?? '',
      RISK_TYPES[i] ?? '',
      RISK_SEVERITIES[i] ?? '',
      RISK_STATUSES[i] ?? '',
      i === 0 ? 'YYYY-MM-DD' : '',
    ])
  }
  writeTable(ws, 4, headers, data)
}

async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<ArrayBuffer> {
  const buf = await wb.xlsx.writeBuffer()
  if (buf instanceof ArrayBuffer) return buf
  if (ArrayBuffer.isView(buf)) {
    const view = buf as ArrayBufferView
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
  }
  // ExcelJS typings vary by environment; coerce unknown buffer-like values.
  const unknownBuf = buf as unknown
  if (unknownBuf && typeof unknownBuf === 'object' && 'buffer' in (unknownBuf as object)) {
    const view = unknownBuf as ArrayBufferView
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
  }
  throw new Error('Unable to serialize workbook buffer')
}

function sampleTeamRows(): (string | number)[][] {
  // Demonstrates one person on multiple apps + roles
  return [
    ['AWQAF-GIS-P1', '', 'nouran.elsherif@awqaf.gov.sa', 'AppManager'],
    ['AWQAF-GIS-P1', 'GIS-UNIT', 'ahmed.gamal@awqaf.gov.sa', 'AppManager'],
    ['AWQAF-GIS-P1', 'GIS-UNIT', 'aya.hassin@awqaf.gov.sa', 'Developer'],
    ['AWQAF-GIS-P1', 'GIS-UNIT', 'belal.abbas@awqaf.gov.sa', 'Developer'],
    // same developer on 2nd app
    ['AWQAF-GIS-P1', 'GEO-GOV', 'mohammed.elkasry@awqaf.gov.sa', 'AppManager'],
    ['AWQAF-GIS-P1', 'GEO-GOV', 'aya.hassin@awqaf.gov.sa', 'Developer'],
    ['AWQAF-GIS-P1', 'GEO-GOV', 'tasnim.ahmed@awqaf.gov.sa', 'Developer'],
    ['AWQAF-GIS-P1', 'GEO-GOV', 'ahmed.gamal@awqaf.gov.sa', 'Contributor'],
    // same people on 3rd app
    ['AWQAF-GIS-P1', 'SPATIAL-RESPONSE', 'belal.abbas@awqaf.gov.sa', 'AppManager'],
    ['AWQAF-GIS-P1', 'SPATIAL-RESPONSE', 'aya.hassin@awqaf.gov.sa', 'Developer'],
    ['AWQAF-GIS-P1', 'SPATIAL-RESPONSE', 'mahmoud.bassuin@awqaf.gov.sa', 'Developer'],
    ['AWQAF-GIS-P1', 'SPATIAL-RESPONSE', 'ahmed.gamal@awqaf.gov.sa', 'Developer'],
  ]
}

function planMatrixFromSample(appCode: string): (string | number)[][] {
  const plan = timelineSample.plans.find((p) => p.app_code === appCode)
  if (!plan) return emptyPlanMatrix()
  return plan.rows.map((r) => {
    const row = r as Record<string, string | number | undefined>
    return PLAN_COLUMNS.map((col) => {
      const v = row[col]
      return v == null ? '' : v
    })
  })
}

export async function buildEmptyTemplateWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  wb.creator = BRAND.company
  wb.lastModifiedBy = BRAND.product
  wb.created = new Date()
  wb.title = BRAND.documentTitle

  buildCover(wb, 'template')
  buildDocumentControl(wb)
  buildHowToFill(wb)

  const project = wb.addWorksheet(SHEETS.project, { views: [{ state: 'frozen', ySplit: 4 }] })
  setCols(project, PROJECT_COLUMNS.map(() => 18))
  addBanner(project, '01 — Project', 'One row only. Cream = edit.')
  writeTable(project, 4, PROJECT_COLUMNS, [
    [
      'AWQAF-NEW',
      'اسم المشروع',
      'Project name',
      'nouran.elsherif@awqaf.gov.sa',
      'Planned',
      '2026-10-01',
      '2027-09-30',
      'Initiation',
      '',
      '',
    ],
  ])

  const apps = wb.addWorksheet(SHEETS.apps, { views: [{ state: 'frozen', ySplit: 4 }] })
  setCols(apps, APP_COLUMNS.map(() => 16))
  addBanner(apps, '02 — Applications', 'One row per app under the project.')
  writeTable(apps, 4, APP_COLUMNS, [
    ['AWQAF-NEW', 'APP-01', 'تطبيق ١', 'Application 1', 'ahmed.gamal@awqaf.gov.sa', 'Planned', '2026-10-01', '2027-03-31', ''],
    ['AWQAF-NEW', 'APP-02', 'تطبيق ٢', 'Application 2', 'mohammed.elkasry@awqaf.gov.sa', 'Planned', '2026-11-01', '2027-06-30', ''],
    ['AWQAF-NEW', 'APP-03', 'تطبيق ٣', 'Application 3', 'belal.abbas@awqaf.gov.sa', 'Planned', '2027-01-01', '2027-09-30', ''],
  ])

  const team = wb.addWorksheet(SHEETS.team, { views: [{ state: 'frozen', ySplit: 4 }] })
  setCols(team, [16, 18, 34, 14])
  addBanner(
    team,
    '03 — Team (multi-app ready)',
    'Repeat the same email on multiple rows to assign one person to many apps. Leave app_code blank for project-level membership.',
  )
  writeTable(
    team,
    4,
    TEAM_COLUMNS,
    [
      ['AWQAF-NEW', '', 'nouran.elsherif@awqaf.gov.sa', 'AppManager'],
      ['AWQAF-NEW', 'APP-01', 'ahmed.gamal@awqaf.gov.sa', 'AppManager'],
      ['AWQAF-NEW', 'APP-01', 'aya.hassin@awqaf.gov.sa', 'Developer'],
      ['AWQAF-NEW', 'APP-02', 'mohammed.elkasry@awqaf.gov.sa', 'AppManager'],
      ['AWQAF-NEW', 'APP-02', 'aya.hassin@awqaf.gov.sa', 'Developer'],
      ['AWQAF-NEW', 'APP-03', 'belal.abbas@awqaf.gov.sa', 'AppManager'],
      ['AWQAF-NEW', 'APP-03', 'aya.hassin@awqaf.gov.sa', 'Developer'],
      ['AWQAF-NEW', 'APP-03', 'ahmed.gamal@awqaf.gov.sa', 'Contributor'],
    ],
    'EXAMPLE: aya.hassin is Developer on APP-01 + APP-02 + APP-03. ahmed.gamal is AppManager on APP-01 and Contributor on APP-03.',
  )

  writePlanSheet(
    wb,
    SHEETS.planTemplate,
    emptyPlanMatrix(),
    'Copy this sheet → rename to Plan_<APP_CODE> for each app in 02_Apps',
  )
  writeLists(wb)
  return wb
}

export async function buildSampleWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  wb.creator = BRAND.company
  wb.lastModifiedBy = BRAND.product
  wb.created = new Date()
  wb.title = `${BRAND.documentTitle} — Sample Phase 1`

  const p = timelineSample.project
  buildCover(wb, 'sample', { projectCode: p.project_code, projectName: p.name_en })
  buildDocumentControl(wb)
  buildHowToFill(wb)

  const project = wb.addWorksheet(SHEETS.project, { views: [{ state: 'frozen', ySplit: 4 }] })
  setCols(project, PROJECT_COLUMNS.map(() => 18))
  addBanner(project, '01 — Project', 'Sample from Awqaf Timeline Phase 1')
  writeTable(project, 4, PROJECT_COLUMNS, [
    [
      p.project_code,
      p.name_ar,
      p.name_en,
      p.manager_email,
      p.status,
      p.planned_start,
      p.planned_end,
      p.phase,
      p.description_ar,
      p.description_en,
    ],
  ])

  const apps = wb.addWorksheet(SHEETS.apps, { views: [{ state: 'frozen', ySplit: 4 }] })
  setCols(apps, APP_COLUMNS.map(() => 16))
  addBanner(apps, '02 — Applications', 'Three apps from Phase 1 timeline')
  writeTable(
    apps,
    4,
    APP_COLUMNS,
    timelineSample.apps.map((a) => [
      a.project_code,
      a.app_code,
      a.name_ar,
      a.name_en,
      a.owner_email,
      a.status,
      a.planned_start,
      a.planned_end,
      a.description_ar,
    ]),
  )

  const team = wb.addWorksheet(SHEETS.team, { views: [{ state: 'frozen', ySplit: 4 }] })
  setCols(team, [16, 18, 34, 14])
  addBanner(
    team,
    '03 — Team (multi-app example)',
    'aya.hassin → 3 apps as Developer · ahmed.gamal → GIS-UNIT (AppManager) + GEO-GOV (Contributor) + SPATIAL-RESPONSE (Developer)',
  )
  writeTable(
    team,
    4,
    TEAM_COLUMNS,
    sampleTeamRows(),
    'Same person on multiple apps = multiple rows with the same person_email and different app_code.',
  )

  writePlanSheet(
    wb,
    SHEETS.planTemplate,
    emptyPlanMatrix(),
    'Blank skeleton — copy for new apps',
  )

  for (const app of timelineSample.apps) {
    writePlanSheet(
      wb,
      planSheetName(app.app_code),
      planMatrixFromSample(app.app_code),
      `Schedule sourced from Awqaf_Timeline_Phase1_05.xlsx — ${app.name_en}`,
    )
  }

  writeLists(wb)
  return wb
}

export async function buildExportWorkbook(input: ExportPackInput): Promise<ExcelJS.Workbook> {
  const { project, apps, people, projectMemberIds, appMembers, wbs, milestones, risks } = input
  const wb = new ExcelJS.Workbook()
  wb.creator = BRAND.company
  wb.title = `${BRAND.documentTitle} — ${project.code}`

  buildCover(wb, 'export', { projectCode: project.code, projectName: project.name })
  buildDocumentControl(wb)
  buildHowToFill(wb)

  const emailOf = (id?: string) => (id ? people.find((p) => p.id === id)?.email ?? '' : '')

  const projectWs = wb.addWorksheet(SHEETS.project, { views: [{ state: 'frozen', ySplit: 4 }] })
  setCols(projectWs, PROJECT_COLUMNS.map(() => 18))
  addBanner(projectWs, '01 — Project', `Export of ${project.code}`)
  writeTable(projectWs, 4, PROJECT_COLUMNS, [
    [
      project.code,
      project.nameAr,
      project.name,
      emailOf(project.managerId),
      project.status,
      project.plannedStart,
      project.plannedEnd,
      project.phase,
      project.descriptionAr,
      project.description,
    ],
  ])

  const appsWs = wb.addWorksheet(SHEETS.apps, { views: [{ state: 'frozen', ySplit: 4 }] })
  setCols(appsWs, APP_COLUMNS.map(() => 16))
  addBanner(appsWs, '02 — Applications', '')
  writeTable(
    appsWs,
    4,
    APP_COLUMNS,
    apps.map((a) => [
      project.code,
      a.code,
      a.nameAr,
      a.name,
      emailOf(a.ownerId),
      a.status,
      a.plannedStart,
      a.plannedEnd,
      a.descriptionAr,
    ]),
  )

  const teamRows: (string | number)[][] = []
  for (const pid of projectMemberIds) {
    const person = people.find((p) => p.id === pid)
    if (!person) continue
    teamRows.push([project.code, '', person.email, 'Contributor'])
  }
  for (const app of apps) {
    for (const m of appMembers[app.id] ?? []) {
      const person = people.find((p) => p.id === m.personId)
      if (!person) continue
      teamRows.push([project.code, app.code, person.email, m.role])
    }
  }
  const teamWs = wb.addWorksheet(SHEETS.team, { views: [{ state: 'frozen', ySplit: 4 }] })
  setCols(teamWs, [16, 18, 34, 14])
  addBanner(teamWs, '03 — Team', 'Exported membership (person may appear on multiple apps)')
  writeTable(teamWs, 4, TEAM_COLUMNS, teamRows)

  writePlanSheet(wb, SHEETS.planTemplate, emptyPlanMatrix(), 'Template skeleton')

  for (const app of apps) {
    const rows: (string | number)[][] = []
    const appWbs = wbs.filter((w) => w.appId === app.id || (!w.appId && apps.length === 1))
    const byId = new Map(appWbs.map((w) => [w.id, w]))
    for (const item of appWbs.filter((w) => w.type === 'phase' || w.type === 'task')) {
      const parent = item.parentId ? byId.get(item.parentId) : undefined
      rows.push([
        'schedule',
        item.code || item.id,
        parent?.code || '',
        item.type,
        item.nameAr,
        item.name,
        item.start,
        item.end,
        item.progress,
        item.weightPct ?? '',
        emailOf(item.assigneeId),
        '',
        item.dependencies.map((d) => byId.get(d)?.code || d).join(';'),
        '',
        '',
        '',
        '',
        '',
        item.description ?? '',
      ])
    }
    for (const m of milestones.filter((x) => x.appId === app.id || (!x.appId && apps.length === 1))) {
      rows.push([
        'milestone',
        m.code || m.id,
        '',
        '',
        m.nameAr,
        m.name,
        '',
        '',
        '',
        '',
        '',
        emailOf(m.ownerId),
        '',
        m.baselineDate,
        m.forecastDate,
        m.status,
        '',
        (m.deliverablesAr.length ? m.deliverablesAr : m.deliverables).join(';'),
        '',
      ])
    }
    for (const r of risks.filter((x) => x.appId === app.id || (!x.appId && apps.length === 1))) {
      rows.push([
        'risk',
        r.code || r.id,
        '',
        r.type,
        r.titleAr,
        r.title,
        '',
        r.targetDate,
        '',
        '',
        '',
        emailOf(r.ownerId),
        '',
        '',
        '',
        r.status,
        r.severity,
        '',
        '',
      ])
    }
    writePlanSheet(
      wb,
      planSheetName(app.code),
      rows.length ? rows : emptyPlanMatrix(),
      `Exported plan for ${app.code}`,
    )
  }

  writeLists(wb)
  return wb
}

export async function workbookToArrayBuffer(wb: ExcelJS.Workbook): Promise<ArrayBuffer> {
  return workbookToBuffer(wb)
}

export async function downloadWorkbook(wb: ExcelJS.Workbook, fileName: string) {
  const data = await workbookToArrayBuffer(wb)
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
