import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';

type LegacyConfig = {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
};

async function run() {
  const config: LegacyConfig = {
    host: process.env.LEGACY_DB_HOST ?? '127.0.0.1',
    user: process.env.LEGACY_DB_USER ?? 'root',
    password: process.env.LEGACY_DB_PASSWORD ?? '',
    database: process.env.LEGACY_DB_NAME ?? 'online-exam',
    port: Number(process.env.LEGACY_DB_PORT ?? '3306'),
  };

  const outputDir = path.resolve(process.cwd(), 'migration-output');
  await mkdir(outputDir, { recursive: true });

  const connection = await mysql.createConnection(config);

  try {
    const [students] = await connection.query('SELECT * FROM students LIMIT 5000');
    const [teachers] = await connection.query('SELECT * FROM teachers LIMIT 5000');
    const [users] = await connection.query('SELECT * FROM users LIMIT 5000');
    const [results] = await connection.query('SELECT * FROM results LIMIT 5000');
    const [subjects] = await connection.query('SELECT * FROM subjects LIMIT 5000');

    await writeFile(
      path.join(outputDir, 'students.json'),
      JSON.stringify(students, null, 2),
    );
    await writeFile(
      path.join(outputDir, 'teachers.json'),
      JSON.stringify(teachers, null, 2),
    );
    await writeFile(path.join(outputDir, 'users.json'), JSON.stringify(users, null, 2));
    await writeFile(
      path.join(outputDir, 'results.json'),
      JSON.stringify(results, null, 2),
    );
    await writeFile(
      path.join(outputDir, 'subjects.json'),
      JSON.stringify(subjects, null, 2),
    );

    console.log(
      JSON.stringify({
        event: 'legacy_migration_dry_run_complete',
        outputDir,
      }),
    );
  } finally {
    await connection.end();
  }
}

void run();
