import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '../src/app.module'
import { MessageExceptionFilter } from '../src/common/http-exception.filter'
import { SeedService } from '../src/demo/seed.service'
import { PrismaService } from '../src/prisma/prisma.service'
import { DEFAULT_TEMP_PASSWORD } from '../src/auth/password.util'

describe('Awqaf PPM API (e2e)', () => {
  let app: INestApplication<App>
  let adminToken: string
  let developerToken: string
  let pmToken: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: false,
      }),
    )
    app.useGlobalFilters(new MessageExceptionFilter())
    await app.init()

    const seed = app.get(SeedService)
    await seed.resetDatabase()

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'ahmed.badawy', password: DEFAULT_TEMP_PASSWORD })
      .expect(200)
    adminToken = adminLogin.body.token as string
    expect(adminLogin.body.user.mustChangePassword).toBe(true)

    const developerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'ahmed.gamal', password: DEFAULT_TEMP_PASSWORD })
      .expect(200)
    developerToken = developerLogin.body.token as string

    const pmLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'nouran.elsherif', password: DEFAULT_TEMP_PASSWORD })
      .expect(200)
    pmToken = pmLogin.body.token as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/health', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200)
    expect(res.body.status).toBe('ok')
  })

  it('rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'ahmed.badawy', password: 'wrong-password' })
      .expect(401)
  })

  it('returns capabilities on /auth/me', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
    expect(res.body.role).toBe('Portfolio Director')
    expect(res.body.capabilities).toContain('approvals:decide')
    expect(res.body.username).toBe('ahmed.badawy')
  })

  it('requires password change then clears the flag', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: DEFAULT_TEMP_PASSWORD, newPassword: 'SecureAdmin@2026' })
      .expect(200)
      .expect((res) => {
        expect(res.body.mustChangePassword).toBe(false)
      })

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'ahmed.badawy', password: DEFAULT_TEMP_PASSWORD })
      .expect(401)

    const relogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'ahmed.badawy', password: 'SecureAdmin@2026' })
      .expect(200)
    adminToken = relogin.body.token as string
    expect(relogin.body.user.mustChangePassword).toBe(false)
  })

  it('bootstrap returns official Awqaf portfolio', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/bootstrap')
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200)
    expect(res.body.people).toHaveLength(10)
    expect(res.body.projects).toHaveLength(1)
    expect(res.body.projects[0].id).toBe('prj-awqaf')
    expect(res.body.apps).toHaveLength(4)
    expect(res.body.wbs).toHaveLength(0)
    expect(res.body.milestones).toHaveLength(0)
    expect(res.body.risks).toHaveLength(0)
    expect(res.body.slas).toHaveLength(0)
  })

  it('developer cannot create projects', async () => {
    await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${developerToken}`)
      .send({
        code: 'X-1',
        name: 'Blocked',
        nameAr: 'محظور',
        managerId: 'p-pm1',
        plannedStart: '2026-01-01',
        plannedEnd: '2026-06-01',
      })
      .expect(403)
  })

  it('admin can create a project', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'AWQ-TEST-001',
        name: 'Test Project',
        nameAr: 'مشروع تجريبي',
        managerId: 'p-pm1',
        plannedStart: '2026-01-01',
        plannedEnd: '2026-06-01',
      })
      .expect(201)
    expect(res.body.code).toBe('AWQ-TEST-001')
    expect(res.body.status).toBe('Planned')
  })

  it('pm can create WBS and update status', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/wbs')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        projectId: 'prj-awqaf',
        name: 'Kickoff task',
        nameAr: 'مهمة الانطلاق',
        type: 'task',
        start: '2026-11-15',
        end: '2026-11-30',
        baselineStart: '2026-11-15',
        baselineEnd: '2026-11-30',
        progress: 0,
        dependencies: [],
        assigneeId: 'p-dev1',
        critical: false,
        status: 'Not Started',
        priority: 'Medium',
        estimatedHours: 8,
        actualHours: 0,
        description: 'Initial delivery task',
      })
      .expect(201)

    const res = await request(app.getHttpServer())
      .patch(`/api/wbs/${created.body.id}/status`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ status: 'In Progress' })
      .expect(200)
    expect(res.body.status).toBe('In Progress')
  })

  it('pm cannot decide approvals; admin can', async () => {
    const prismaSvc = app.get(PrismaService)
    await prismaSvc.approval.create({
      data: {
        id: 'apr-e2e-1',
        projectId: 'prj-awqaf',
        type: 'Scope',
        title: 'Scope change',
        titleAr: 'تغيير نطاق',
        requesterId: 'p-pm1',
        status: 'Pending',
        submittedAt: new Date().toISOString(),
      },
    })

    await request(app.getHttpServer())
      .post('/api/approvals/apr-e2e-1/decide')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ status: 'Approved' })
      .expect(403)

    const decided = await request(app.getHttpServer())
      .post('/api/approvals/apr-e2e-1/decide')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Approved', comment: 'Looks good' })
      .expect(200)
    expect(decided.body.status).toBe('Approved')
  })

  it('reject without comment fails', async () => {
    const prismaSvc = app.get(PrismaService)
    await prismaSvc.approval.create({
      data: {
        id: 'apr-e2e-2',
        projectId: 'prj-awqaf',
        type: 'Budget',
        title: 'Budget request',
        titleAr: 'طلب ميزانية',
        requesterId: 'p-admin',
        status: 'Pending',
        submittedAt: new Date().toISOString(),
      },
    })

    await request(app.getHttpServer())
      .post('/api/approvals/apr-e2e-2/decide')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Rejected' })
      .expect(400)
  })
})
