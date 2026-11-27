import { GradePreset, LibraryResourceType, SchoolType } from '@prisma/client';

export const DEFAULT_CURRICULUM_PACKAGE_KEY = 'ETHIOPIAN_PRIVATE';

export type PackageSubjectDef = {
  code: string;
  name: string;
  level?: 'PRIMARY' | 'SECONDARY' | 'ALL';
};

export type PackageLibraryDef = {
  title: string;
  description?: string;
  resourceType: LibraryResourceType;
  categorySlug: string;
  subject?: string;
  gradeLabel?: string;
};

export type PackageTemplateDef = {
  key: string;
  name: string;
  channel: 'SMS' | 'EMAIL' | 'TEACHER';
  body: string;
};

export type CurriculumPackageDef = {
  key: string;
  label: string;
  description: string;
  gradePreset?: GradePreset;
  schoolType?: SchoolType;
  isBlank?: boolean;
  sortOrder: number;
  subjects: PackageSubjectDef[];
  departments: string[];
  libraryItems: PackageLibraryDef[];
  templates: PackageTemplateDef[];
};

const PRIMARY_SUBJECTS: PackageSubjectDef[] = [
  { code: 'MATH', name: 'Mathematics', level: 'PRIMARY' },
  { code: 'ENG', name: 'English', level: 'PRIMARY' },
  { code: 'SCI', name: 'Science', level: 'PRIMARY' },
  { code: 'SOC', name: 'Social Studies', level: 'PRIMARY' },
  { code: 'ICT', name: 'ICT', level: 'ALL' },
  { code: 'ART', name: 'Art', level: 'PRIMARY' },
  { code: 'PE', name: 'Physical Education', level: 'ALL' },
];

const SECONDARY_SUBJECTS: PackageSubjectDef[] = [
  { code: 'MATH', name: 'Mathematics', level: 'SECONDARY' },
  { code: 'ENG', name: 'English', level: 'SECONDARY' },
  { code: 'BIO', name: 'Biology', level: 'SECONDARY' },
  { code: 'CHEM', name: 'Chemistry', level: 'SECONDARY' },
  { code: 'PHY', name: 'Physics', level: 'SECONDARY' },
  { code: 'ICT', name: 'ICT', level: 'ALL' },
  { code: 'GEO', name: 'Geography', level: 'SECONDARY' },
  { code: 'HIST', name: 'History', level: 'SECONDARY' },
  { code: 'ECON', name: 'Economics', level: 'SECONDARY' },
  { code: 'CIV', name: 'Civics', level: 'SECONDARY' },
  { code: 'PE', name: 'Physical Education', level: 'ALL' },
];

const ETHIOPIAN_SUBJECTS = [...PRIMARY_SUBJECTS, ...SECONDARY_SUBJECTS].filter(
  (s, i, arr) => arr.findIndex((x) => x.code === s.code) === i,
);

const COMMUNICATION_TEMPLATES: PackageTemplateDef[] = [
  {
    key: 'attendance_alert',
    name: 'Attendance alert',
    channel: 'SMS',
    body: `Dear Parent,

Your child was absent today.

Thank you.`,
  },
  {
    key: 'exam_result_notification',
    name: 'Exam result notification',
    channel: 'SMS',
    body: `Dear Parent,

The exam results are now available in the parent portal.

Thank you.`,
  },
];

const TEACHER_TEMPLATES: PackageTemplateDef[] = [
  {
    key: 'lesson_plan',
    name: 'Lesson plan',
    channel: 'TEACHER',
    body: `Lesson title:
Grade / Section:
Duration:

Objectives:
1.
2.

Materials:
-

Procedure:
-

Assessment:`,
  },
  {
    key: 'exam_paper',
    name: 'Exam paper',
    channel: 'TEACHER',
    body: `Subject:
Grade:
Time allowed:
Total marks:

Section A — Multiple choice
Section B — Short answer
Section C — Problem solving`,
  },
  {
    key: 'report_card_comments',
    name: 'Report card comments',
    channel: 'TEACHER',
    body: `Strengths:

Areas for improvement:

Recommendation:`,
  },
  {
    key: 'assignment_template',
    name: 'Assignment',
    channel: 'TEACHER',
    body: `Title:
Due date:
Instructions:

Submission format:`,
  },
  {
    key: 'project_template',
    name: 'Project',
    channel: 'TEACHER',
    body: `Project title:
Group size:
Timeline:

Rubric criteria:
- Research
- Presentation
- Teamwork`,
  },
];

const STARTER_LIBRARY: PackageLibraryDef[] = [
  {
    title: 'Chora Primary Mathematics Guide',
    description: 'Starter reference for Grades 1–8 mathematics.',
    resourceType: LibraryResourceType.BOOK_PDF,
    categorySlug: 'books',
    subject: 'Mathematics',
    gradeLabel: 'Grade 5',
  },
  {
    title: 'English Language Reader — Sample',
    description: 'Sample reader for primary English.',
    resourceType: LibraryResourceType.BOOK_PDF,
    categorySlug: 'books',
    subject: 'English',
    gradeLabel: 'Grade 4',
  },
  {
    title: 'National Exam Sample — Grade 12',
    description: 'Past national exam sample paper.',
    resourceType: LibraryResourceType.EXAM,
    categorySlug: 'exams',
    subject: 'Mathematics',
    gradeLabel: 'Grade 12',
  },
  {
    title: 'Biology Lab Manual — Sample',
    description: 'Laboratory activities for secondary biology.',
    resourceType: LibraryResourceType.LAB_MANUAL,
    categorySlug: 'notes',
    subject: 'Biology',
    gradeLabel: 'Grade 11',
  },
  {
    title: 'Teacher Lesson Plan Pack',
    description: 'Editable lesson plan outlines.',
    resourceType: LibraryResourceType.NOTES,
    categorySlug: 'notes',
  },
  {
    title: 'Revision Worksheet — Physics',
    description: 'Grade 11 physics revision sheet.',
    resourceType: LibraryResourceType.ASSIGNMENT,
    categorySlug: 'notes',
    subject: 'Physics',
    gradeLabel: 'Grade 11',
  },
  {
    title: 'Study Guide — Civics',
    description: 'Exam preparation guide.',
    resourceType: LibraryResourceType.DOCUMENT,
    categorySlug: 'research',
    subject: 'Civics',
    gradeLabel: 'Grade 10',
  },
];

export const CURRICULUM_PACKAGE_DEFINITIONS: CurriculumPackageDef[] = [
  {
    key: 'ETHIOPIAN_PRIVATE',
    label: 'Ethiopian private school',
    description:
      'Ethiopian curriculum subjects, departments, grading, eLibrary starters, and communication templates.',
    gradePreset: GradePreset.KG_12,
    schoolType: SchoolType.MIXED,
    sortOrder: 0,
    subjects: ETHIOPIAN_SUBJECTS,
    departments: ['Science', 'Social Science', 'Languages', 'ICT'],
    libraryItems: STARTER_LIBRARY,
    templates: [...COMMUNICATION_TEMPLATES, ...TEACHER_TEMPLATES],
  },
  {
    key: 'CAMBRIDGE',
    label: 'Cambridge / IGCSE',
    description: 'IGCSE-style subjects and secondary structure.',
    gradePreset: GradePreset.GRADES_9_12,
    schoolType: SchoolType.SECONDARY,
    sortOrder: 1,
    subjects: [
      { code: 'MATH', name: 'Mathematics' },
      { code: 'ENG', name: 'English' },
      { code: 'ICT', name: 'ICT' },
      { code: 'BUS', name: 'Business Studies' },
      { code: 'SCI', name: 'Combined Science' },
      { code: 'PHY', name: 'Physics' },
      { code: 'CHEM', name: 'Chemistry' },
      { code: 'BIO', name: 'Biology' },
    ],
    departments: ['Sciences', 'Languages', 'Humanities', 'ICT'],
    libraryItems: STARTER_LIBRARY.slice(0, 4),
    templates: [...COMMUNICATION_TEMPLATES, ...TEACHER_TEMPLATES],
  },
  {
    key: 'AMERICAN',
    label: 'American curriculum',
    description: 'US-style K–12 subjects and grading bands.',
    gradePreset: GradePreset.KG_12,
    schoolType: SchoolType.MIXED,
    sortOrder: 2,
    subjects: [
      { code: 'MATH', name: 'Mathematics', level: 'ALL' },
      { code: 'ENG', name: 'English Language Arts', level: 'ALL' },
      { code: 'SCI', name: 'Science', level: 'ALL' },
      { code: 'SOC', name: 'Social Studies', level: 'ALL' },
      { code: 'ART', name: 'Art', level: 'ALL' },
      { code: 'PE', name: 'Physical Education', level: 'ALL' },
      { code: 'ICT', name: 'Computer Science', level: 'ALL' },
    ],
    departments: ['STEM', 'Humanities', 'Arts', 'Athletics'],
    libraryItems: STARTER_LIBRARY.slice(0, 3),
    templates: [...COMMUNICATION_TEMPLATES, ...TEACHER_TEMPLATES],
  },
  {
    key: 'BLANK',
    label: 'Blank school',
    description: 'No subjects or content — configure everything manually.',
    isBlank: true,
    sortOrder: 99,
    subjects: [],
    departments: [],
    libraryItems: [],
    templates: [],
  },
];
