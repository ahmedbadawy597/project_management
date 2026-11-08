import type { BudgetTransaction } from '../types'

export const transactions: BudgetTransaction[] = [
  { id: 'tx-001', projectId: 'prj-001', date: '2026-03-10', category: 'Professional Services', description: 'Discovery partner kickoff', amount: 320000, type: 'expense' },
  { id: 'tx-002', projectId: 'prj-001', date: '2026-05-20', category: 'Licenses', description: 'Identity SDK annual', amount: 180000, type: 'expense' },
  { id: 'tx-003', projectId: 'prj-001', date: '2026-07-15', category: 'Development', description: 'Sprint delivery Jul', amount: 450000, type: 'expense' },
  { id: 'tx-004', projectId: 'prj-001', date: '2026-09-15', category: 'Development', description: 'Sprint delivery Sep', amount: 480000, type: 'expense' },
  { id: 'tx-005', projectId: 'prj-001', date: '2026-10-20', category: 'Infrastructure', description: 'UAT environments', amount: 220000, type: 'expense' },
  { id: 'tx-006', projectId: 'prj-001', date: '2026-03-01', category: 'Allocation', description: 'Q1 allocation', amount: 1500000, type: 'allocation' },
  { id: 'tx-007', projectId: 'prj-001', date: '2026-06-01', category: 'Allocation', description: 'Q2-Q3 allocation', amount: 2300000, type: 'allocation' },
  { id: 'tx-008', projectId: 'prj-002', date: '2026-04-10', category: 'Professional Services', description: 'Case workflow design', amount: 210000, type: 'expense' },
  { id: 'tx-009', projectId: 'prj-002', date: '2026-07-01', category: 'Development', description: 'Build phase Jul', amount: 390000, type: 'expense' },
  { id: 'tx-010', projectId: 'prj-002', date: '2026-09-01', category: 'Development', description: 'Build phase Sep', amount: 410000, type: 'expense' },
  { id: 'tx-011', projectId: 'prj-002', date: '2026-10-15', category: 'QA', description: 'UAT support', amount: 170000, type: 'expense' },
  { id: 'tx-012', projectId: 'prj-003', date: '2026-05-25', category: 'Professional Services', description: 'Property data assessment', amount: 280000, type: 'expense' },
  { id: 'tx-013', projectId: 'prj-003', date: '2026-08-10', category: 'Licenses', description: 'GIS platform', amount: 520000, type: 'expense' },
  { id: 'tx-014', projectId: 'prj-003', date: '2026-10-01', category: 'Development', description: 'Lease module build', amount: 420000, type: 'expense' },
  { id: 'tx-015', projectId: 'prj-004', date: '2026-06-10', category: 'Professional Services', description: 'Finance process redesign', amount: 250000, type: 'expense' },
  { id: 'tx-016', projectId: 'prj-004', date: '2026-08-20', category: 'Development', description: 'Ledger build', amount: 560000, type: 'expense' },
  { id: 'tx-017', projectId: 'prj-004', date: '2026-10-10', category: 'Development', description: 'Payments build', amount: 440000, type: 'expense' },
  { id: 'tx-018', projectId: 'prj-005', date: '2026-09-01', category: 'Professional Services', description: 'Initiation advisory', amount: 120000, type: 'expense' },
  { id: 'tx-019', projectId: 'prj-007', date: '2026-10-05', category: 'Architecture', description: 'Gateway PoC', amount: 180000, type: 'expense' },
  { id: 'tx-020', projectId: 'prj-001', date: '2026-10-28', category: 'Contingency', description: 'Integration overtime', amount: 500000, type: 'adjustment' },
]
