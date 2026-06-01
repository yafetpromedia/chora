import { LibraryResourceType } from '@prisma/client';

export const DEFAULT_LIBRARY_CATEGORIES = [
  { slug: 'books', name: 'Books', icon: '📚', sortOrder: 0 },
  { slug: 'notes', name: 'Notes & lessons', icon: '🎓', sortOrder: 1 },
  { slug: 'exams', name: 'Exams', icon: '📝', sortOrder: 2 },
  { slug: 'videos', name: 'Videos', icon: '🎥', sortOrder: 3 },
  { slug: 'audio', name: 'Audiobooks', icon: '🎧', sortOrder: 4 },
  { slug: 'research', name: 'Research', icon: '📄', sortOrder: 5 },
] as const;

export const LIBRARY_TYPE_LABELS: Record<LibraryResourceType, string> = {
  BOOK_PDF: 'PDF book',
  EPUB: 'EPUB book',
  DOCUMENT: 'Document',
  NOTES: 'Teacher notes',
  ASSIGNMENT: 'Assignment',
  LAB_MANUAL: 'Lab manual',
  EXAM: 'Exam paper',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  RESEARCH: 'Research',
  OTHER: 'Resource',
};
