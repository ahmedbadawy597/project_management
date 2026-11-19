import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildEmptyTemplateWorkbook,
  buildSampleWorkbook,
  workbookToArrayBuffer,
} from '../src/lib/project-pack/branded-workbook'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'templates')
fs.mkdirSync(outDir, { recursive: true })

async function write(name: string, wbPromise: Promise<import('exceljs').Workbook>) {
  const buf = await workbookToArrayBuffer(await wbPromise)
  const out = path.join(outDir, name)
  fs.writeFileSync(out, Buffer.from(buf))
  console.log('Wrote', out)
}

await write('Awqaf_PPM_Project_Pack_Template.xlsx', buildEmptyTemplateWorkbook())
await write('Awqaf_PPM_Project_Pack_Sample.xlsx', buildSampleWorkbook())
