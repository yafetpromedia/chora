import { GradePreset } from '@prisma/client';

/** Ethiopian early childhood — nursery through KG 2 before Grade 1 */
export const EARLY_CHILDHOOD_GRADES = ['Nursery', 'KG 1', 'KG 2'] as const;

export const GRADE_PRESET_OPTIONS: {
  key: GradePreset;
  label: string;
  description: string;
}[] = [
  {
    key: GradePreset.GRADES_1_8,
    label: 'Grades 1–8',
    description: 'Primary school (8 grades)',
  },
  {
    key: GradePreset.GRADES_9_12,
    label: 'Grades 9–12',
    description: 'Secondary / preparatory (4 grades)',
  },
  {
    key: GradePreset.KG_12,
    label: 'Nursery – Grade 12',
    description: 'Nursery, KG 1, KG 2, then Grade 1–12 (15 levels)',
  },
];

export function gradeNamesForPreset(preset: GradePreset): string[] {
  if (preset === GradePreset.GRADES_1_8) {
    return Array.from({ length: 8 }, (_, i) => `Grade ${i + 1}`);
  }
  if (preset === GradePreset.GRADES_9_12) {
    return Array.from({ length: 4 }, (_, i) => `Grade ${i + 9}`);
  }
  return [
    ...EARLY_CHILDHOOD_GRADES,
    ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
  ];
}

export function gradeNamesForRange(
  fromGrade: number,
  toGrade: number,
  includeEarlyChildhood = false,
  extraNames: string[] = [],
): string[] {
  const from = Math.trunc(fromGrade);
  const to = Math.trunc(toGrade);
  const numbered = Array.from({ length: to - from + 1 }, (_, i) => `Grade ${from + i}`);
  const extras = extraNames.map((n) => n.trim()).filter(Boolean);
  return [
    ...(includeEarlyChildhood ? [...EARLY_CHILDHOOD_GRADES] : []),
    ...numbered,
    ...extras,
  ];
}

export function presetForGradeNames(names: string[]): GradePreset | null {
  for (const preset of [
    GradePreset.GRADES_1_8,
    GradePreset.GRADES_9_12,
    GradePreset.KG_12,
  ]) {
    const expected = gradeNamesForPreset(preset);
    if (
      expected.length === names.length &&
      expected.every((name, i) => name === names[i])
    ) {
      return preset;
    }
  }
  return null;
}
