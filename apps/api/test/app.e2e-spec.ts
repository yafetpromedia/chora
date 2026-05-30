import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

beforeAll(() => {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
});

type LoginResponse = { accessToken: string };
type MeResponse = { user: { role: string; schoolId: string } };
type AttendanceResponse = Array<{ status: string }>;
type ResultsResponse = Array<{ subject: string; score: number }>;

describe('School OS MVP flows (e2e)', () => {
  let app: INestApplication<App>;
  let teacherToken = '';
  let studentToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const teacherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'teacher@eduos.local',
        password: 'Passw0rd!',
      });
    teacherToken = (teacherLogin.body as LoginResponse).accessToken;

    const studentLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'student@eduos.local',
        password: 'Passw0rd!',
      });
    studentToken = (studentLogin.body as LoginResponse).accessToken;
  });

  it('logs in and returns current user', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    const me = response.body as MeResponse;
    expect(me.user.role).toBe('teacher');
    expect(me.user.schoolId).toBe('school-addis');
  });

  it('enforces RBAC for admin-only route', async () => {
    await request(app.getHttpServer())
      .get('/admin/overview')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(403);
  });

  it('allows teacher to mark attendance and student to read own data', async () => {
    await request(app.getHttpServer())
      .post('/attendance')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: '3', date: '2026-05-28', status: 'present' })
      .expect(201);

    const attendance = await request(app.getHttpServer())
      .get('/attendance/student?studentId=3')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    const rows = attendance.body as AttendanceResponse;
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('present');
  });

  it('allows teacher to submit results and student to view them', async () => {
    await request(app.getHttpServer())
      .post('/results')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: '3', subject: 'Math', score: 92 })
      .expect(201);

    const results = await request(app.getHttpServer())
      .get('/results/student?studentId=3')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    const rows = results.body as ResultsResponse;
    expect(rows).toHaveLength(1);
    expect(rows[0].subject).toBe('Math');
    expect(rows[0].score).toBe(92);
  });

  afterAll(async () => {
    await app.close();
  });
});
