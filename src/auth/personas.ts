import type { AppRole } from './permissions'

export interface Persona {
  id: string
  personId: string
  label: string
  labelAr: string
  role: AppRole
  description: string
}

/** Login personas mapped to official Ministry of Awqaf accounts. */
export const PERSONAS: Persona[] = [
  {
    id: 'admin',
    personId: 'p-admin',
    label: 'Ahmed Badawy',
    labelAr: 'أحمد بدوي',
    role: 'Portfolio Director',
    description: 'System administrator — full platform management',
  },
  {
    id: 'pm-nouran',
    personId: 'p-pm1',
    label: 'Nouran Elsherif',
    labelAr: 'نوران الشريف',
    role: 'Project Manager',
    description: 'Project manager — assigned applications and delivery',
  },
  {
    id: 'pm-nabil',
    personId: 'p-pm2',
    label: 'Nabil Samir',
    labelAr: 'نبيل سمير',
    role: 'Project Manager',
    description: 'Project manager — assigned applications and delivery',
  },
  {
    id: 'pm-yassmin',
    personId: 'p-pm3',
    label: 'Yassmin Elshafia',
    labelAr: 'ياسمين الشافية',
    role: 'Project Manager',
    description: 'Project manager — assigned applications and delivery',
  },
  {
    id: 'dev-ahmed',
    personId: 'p-dev1',
    label: 'Ahmed Gamal',
    labelAr: 'أحمد جمال',
    role: 'Developer',
    description: 'Developer — assigned tasks and applications',
  },
  {
    id: 'dev-mohammed',
    personId: 'p-dev2',
    label: 'Mohammed Elkasry',
    labelAr: 'محمد القصري',
    role: 'Developer',
    description: 'Developer — assigned tasks and applications',
  },
  {
    id: 'dev-belal',
    personId: 'p-dev3',
    label: 'Belal Abbas',
    labelAr: 'بلال عباس',
    role: 'Developer',
    description: 'Developer — assigned tasks and applications',
  },
  {
    id: 'dev-aya',
    personId: 'p-dev4',
    label: 'Aya Hassin',
    labelAr: 'آية حسين',
    role: 'Developer',
    description: 'Developer — assigned tasks and applications',
  },
  {
    id: 'dev-tasnim',
    personId: 'p-dev5',
    label: 'Tasnim Ahmed',
    labelAr: 'تسنيم أحمد',
    role: 'Developer',
    description: 'Developer — assigned tasks and applications',
  },
  {
    id: 'dev-mahmoud',
    personId: 'p-dev6',
    label: 'Mahmoud Bassuin',
    labelAr: 'محمود بسيوني',
    role: 'Developer',
    description: 'Developer — assigned tasks and applications',
  },
]

export function personaById(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id)
}

export function personaByPersonId(personId: string): Persona | undefined {
  return PERSONAS.find((p) => p.personId === personId)
}
