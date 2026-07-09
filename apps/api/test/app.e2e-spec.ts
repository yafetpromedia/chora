import { Test, TestingModule } from '@nestjs/testing';

import { INestApplication } from '@nestjs/common';

import request from 'supertest';

import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';



jest.setTimeout(45000);



beforeAll(() => {

  if (process.env.TEST_DATABASE_URL) {

    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  }

});



type LoginResponse = {

  accessToken: string;

  user: { role: string; schoolId: string; username?: string };

};

type MeResponse = { user: { role: string; schoolId: string; username?: string } };

type AttendanceResponse = Array<{ status: string }>;

type ResultsResponse = Array<{ subject: string; score: number }>;



async function schoolLogin(

  app: INestApplication<App>,

  username: string,

): Promise<string> {

  const res = await request(app.getHttpServer())

    .post('/auth/login')

    .send({

      schoolCode: 'BRIGHT1',

      username,

      password: 'Passw0rd!',

    })

    .expect(201);

  return (res.body as LoginResponse).accessToken;

}



describe('CampusOne critical paths (e2e)', () => {

  let app: INestApplication<App>;

  let adminToken = '';

  let teacherToken = '';

  let studentToken = '';



  beforeAll(async () => {

    const moduleFixture: TestingModule = await Test.createTestingModule({

      imports: [AppModule],

    }).compile();



    app = moduleFixture.createNestApplication();

    await app.init();



    adminToken = await schoolLogin(app, 'admin');

    teacherToken = await schoolLogin(app, 'teacher');

    studentToken = await schoolLogin(app, 'student');

  });



  it('API health check', async () => {

    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toMatchObject({ status: 'ok' });

  });



  it('logs in with username + school code and returns user in JWT payload', async () => {

    const res = await request(app.getHttpServer())

      .get('/auth/me')

      .set('Authorization', `Bearer ${adminToken}`)

      .expect(200);



    const me = res.body as MeResponse;

    expect(me.user.role).toBe('admin');

    expect(me.user.schoolId).toBe('school-addis');

    expect(me.user.username).toBe('admin');

  });



  it('lists academic years and terms for admin', async () => {

    const years = await request(app.getHttpServer())

      .get('/results/academic-years')

      .set('Authorization', `Bearer ${adminToken}`)

      .expect(200);

    expect(Array.isArray(years.body)).toBe(true);

    expect((years.body as unknown[]).length).toBeGreaterThan(0);



    const terms = await request(app.getHttpServer())

      .get('/results/terms')

      .set('Authorization', `Bearer ${adminToken}`)

      .expect(200);

    expect(Array.isArray(terms.body)).toBe(true);

  });



  it('lists students for admin', async () => {

    const res = await request(app.getHttpServer())

      .get('/schools/students')

      .set('Authorization', `Bearer ${adminToken}`)

      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);

  });



  it('enforces RBAC for admin-only route', async () => {

    await request(app.getHttpServer())

      .get('/admin/overview')

      .set('Authorization', `Bearer ${teacherToken}`)

      .expect(403);

  });



  it('allows teacher to mark attendance and student to read own data', async () => {

    const gradeList = await request(app.getHttpServer())

      .get('/schools/grades')

      .set('Authorization', `Bearer ${adminToken}`)

      .expect(200);

    const gradeId = (gradeList.body as Array<{ id: string }>)[0]?.id;

    expect(gradeId).toBeTruthy();



    const roster = await request(app.getHttpServer())

      .get(

        `/attendance/roster?gradeId=${gradeId}&date=2026-05-28&periodNumber=0`,

      )

      .set('Authorization', `Bearer ${teacherToken}`)

      .expect(200);

    const students = roster.body as Array<{ studentProfileId: string }>;

    expect(students.length).toBeGreaterThan(0);



    await request(app.getHttpServer())

      .post('/attendance/bulk')

      .set('Authorization', `Bearer ${teacherToken}`)

      .send({

        gradeId,

        date: '2026-05-28',

        periodNumber: 0,

        records: [

          {

            studentProfileId: students[0].studentProfileId,

            status: 'present',

          },

        ],

      })

      .expect(201);



    const attendance = await request(app.getHttpServer())

      .get('/attendance/student')

      .set('Authorization', `Bearer ${studentToken}`)

      .expect(200);



    const rows = attendance.body as AttendanceResponse;

    expect(rows.length).toBeGreaterThanOrEqual(1);

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



  it('returns HTML report card for print', async () => {

    const students = await request(app.getHttpServer())

      .get('/schools/students')

      .set('Authorization', `Bearer ${adminToken}`)

      .expect(200);

    const profileId = (students.body as Array<{ id: string }>)[0]?.id;

    expect(profileId).toBeTruthy();



    const terms = await request(app.getHttpServer())

      .get('/results/terms')

      .set('Authorization', `Bearer ${adminToken}`)

      .expect(200);

    const termId = (terms.body as Array<{ id: string }>)[0]?.id;

    expect(termId).toBeTruthy();



    const html = await request(app.getHttpServer())

      .get(

        `/results/report-card/html?studentProfileId=${profileId}&termId=${termId}`,

      )

      .set('Authorization', `Bearer ${adminToken}`)

      .expect(200);



    expect(String(html.text)).toContain('Student Report Card');

    expect(String(html.text)).toContain("Student's Information");

    expect(String(html.text)).toContain('A4 landscape');

  });



  afterAll(async () => {

    await app.close();

  });

});


