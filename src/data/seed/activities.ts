import type { ActivityItem } from '../types'

export const activities: ActivityItem[] = [
  { id: 'act-001', projectId: 'prj-001', type: 'schedule', title: 'Forecast end date moved to 20 Jan 2027', titleAr: 'تاريخ الإنجاز المتوقع أصبح 20 يناير 2027', actorId: 'p-pm1', at: '2026-11-02T16:00:00' },
  { id: 'act-002', projectId: 'prj-001', type: 'risk', title: 'Critical integration issue escalated', titleAr: 'تصعيد مشكلة تكامل حرجة', actorId: 'p-dev1', at: '2026-11-02T11:30:00' },
  { id: 'act-003', projectId: 'prj-001', type: 'approval', title: 'Baseline change submitted for approval', titleAr: 'تقديم طلب تعديل خط الأساس', actorId: 'p-pm1', at: '2026-11-01T10:00:00' },
  { id: 'act-004', projectId: 'prj-002', type: 'milestone', title: 'UAT cycle 2 at 75% completion', titleAr: 'دورة الاختبار الثانية عند 75%', actorId: 'p-qa1', at: '2026-11-02T09:00:00' },
  { id: 'act-005', projectId: 'prj-002', type: 'manager', title: 'Go-live readiness checklist published', titleAr: 'نشر قائمة جاهزية الإطلاق', actorId: 'p-pm2', at: '2026-10-28T15:00:00' },
  { id: 'act-006', projectId: 'prj-003', type: 'risk', title: 'Cadastral data quality issue opened', titleAr: 'فتح مشكلة جودة بيانات المساحة', actorId: 'p-pm3', at: '2026-10-30T13:00:00' },
  { id: 'act-007', projectId: 'prj-003', type: 'status', title: 'Health changed to Delayed', titleAr: 'تغير الحالة الصحية إلى متأخر', actorId: 'p-pm3', at: '2026-10-25T10:00:00' },
  { id: 'act-008', projectId: 'prj-004', type: 'milestone', title: 'Payments module completed early', titleAr: 'اكتمال وحدة المدفوعات مبكراً', actorId: 'p-pm4', at: '2026-10-14T17:00:00' },
  { id: 'act-009', projectId: 'prj-004', type: 'manager', title: 'Mid-phase governance review scheduled', titleAr: 'جدولة مراجعة حوكمة منتصف المرحلة', actorId: 'p-pm4', at: '2026-11-01T08:30:00' },
  { id: 'act-010', projectId: 'prj-007', type: 'approval', title: 'Project initiation pack submitted', titleAr: 'تقديم حزمة بدء المشروع', actorId: 'p-pm6', at: '2026-10-28T14:00:00' },
  { id: 'act-011', projectId: 'prj-005', type: 'approval', title: 'Initiation approval pending board', titleAr: 'اعتماد البدء بانتظار المجلس', actorId: 'p-pm5', at: '2026-11-02T08:00:00' },
  { id: 'act-012', projectId: 'prj-001', type: 'task', title: 'Identity gateway task marked Blocked', titleAr: 'مهمة بوابة الهوية أصبحت محظورة', actorId: 'p-dev1', at: '2026-10-29T12:00:00' },
  { id: 'act-013', projectId: 'prj-012', type: 'status', title: 'Ready for initiation – channel procurement closing', titleAr: 'جاهز للبدء – إغلاق مشتريات القنوات', actorId: 'p-pm8', at: '2026-11-01T11:00:00' },
  { id: 'act-014', projectId: 'prj-002', type: 'approval', title: 'Rules engine deliverable accepted', titleAr: 'قبول مخرج محرك القواعد', actorId: 'p-exec', at: '2026-06-29T16:00:00' },
  { id: 'act-015', projectId: 'prj-001', type: 'document', title: 'Baseline change request uploaded', titleAr: 'رفع طلب تعديل خط الأساس', actorId: 'p-pm1', at: '2026-11-01T10:05:00' },
]
