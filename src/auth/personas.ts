import type { AppRole } from './permissions'

export interface Persona {
  id: string
  personId: string
  label: string
  labelAr: string
  role: AppRole
  description: string
}

/** Demo login personas (mock IdP). */
export const PERSONAS: Persona[] = [
  {
    id: 'director',
    personId: 'p-exec',
    label: 'Dr. Fahad Al-Mutairi',
    labelAr: 'د. فهد المطيري',
    role: 'Portfolio Director',
    description: 'Full access including approvals and administration',
  },
  {
    id: 'pm',
    personId: 'p-pm1',
    label: 'Noura Al-Harbi',
    labelAr: 'نورة الحربي',
    role: 'Project Manager',
    description: 'Manage projects, tasks, risks; cannot decide portfolio approvals',
  },
  {
    id: 'analyst',
    personId: 'p-ba1',
    label: 'Rania Al-Jabri',
    labelAr: 'رانيا الجابري',
    role: 'PMO Analyst',
    description: 'Read portfolio and export reports',
  },
  {
    id: 'viewer',
    personId: 'p-pm5',
    label: 'Layla Al-Otaibi (Viewer)',
    labelAr: 'ليلى العتيبي (عرض)',
    role: 'Executive Viewer',
    description: 'Executive and portfolio view only',
  },
]

export function personaById(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id)
}

export function personaByPersonId(personId: string): Persona | undefined {
  return PERSONAS.find((p) => p.personId === personId)
}
