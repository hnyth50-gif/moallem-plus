// ============ أدوات بناء عناصر تجريبية للاختبارات ============
// معرّفات ثابتة وقيم حتمية كي تكون كل الاختبارات قابلة للتكرار.

import type {
  ActivityDoc,
  PlanDoc,
  QuizDoc,
  QuizQuestion,
  ThinkingCard,
} from '../src/lib/types'

export function makePlan(overrides: Partial<PlanDoc> = {}): PlanDoc {
  const t = 1_000
  return {
    id: 'plan-0001',
    kind: 'plan',
    title: 'خطة درس الأعداد النسبية',
    subject: 'الرياضيات',
    grade: 'الصف الثاني متوسط',
    unit: 'وحدة الأعداد والجبر',
    durationMinutes: 45,
    objectives: ['يحسب الطالب طرح الأعداد النسبية'],
    resources: ['السبورة', 'دفتر التمارين'],
    sections: [
      { phase: 'افتتاحية وتهيئة', minutes: 7, description: 'سؤال افتتاحي' },
      { phase: 'عرض وشرح', minutes: 18, description: 'الشرح والأمثلة' },
      { phase: 'ممارسة وتطبيق', minutes: 11, description: 'تمارين فردية' },
      { phase: 'تقييم', minutes: 5, description: 'بطاقة خروج' },
      { phase: 'ختام وتلخيص', minutes: 4, description: 'تلخيص' },
    ],
    homework: 'تمرين السادس صفحة 40',
    notes: '',
    createdAt: t,
    updatedAt: t,
    ...overrides,
  }
}

export function makeActivity(overrides: Partial<ActivityDoc> = {}): ActivityDoc {
  const t = 2_000
  return {
    id: 'activity-0001',
    kind: 'activity',
    title: 'نشاط فكر – زاوج – شارك',
    subject: 'العلوم',
    grade: 'الصف الخامس',
    goal: 'تنشيط المعرفة السابقة قبل الدرس',
    strategyId: 'builtin-01',
    materials: ['بطاقات أسئلة'],
    steps: [
      { text: 'طرح السؤال', minutes: 2 },
      { text: 'النقاش الثنائي', minutes: 3 },
    ],
    grouping: 'ثنائيات',
    assessment: 'ملاحظة شفهية',
    createdAt: t,
    updatedAt: t,
    ...overrides,
  }
}

export function makeQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: 'q-0001',
    kind: 'mcq',
    prompt: 'ما ناتج 5 + (-3)؟',
    options: ['2', '-2', '8', '-8'],
    answerIdx: 0,
    tfAnswer: true,
    modelAnswer: '2',
    points: 2,
    difficulty: 'easy',
    ...overrides,
  }
}

export function makeQuiz(overrides: Partial<QuizDoc> = {}): QuizDoc {
  const t = 3_000
  return {
    id: 'quiz-0001',
    kind: 'quiz',
    title: 'اختبار قصير: الأعداد النسبية',
    subject: 'الرياضيات',
    grade: 'الصف الثاني متوسط',
    timeMinutes: 20,
    instructions: 'أجب عن جميع الأسئلة',
    questions: [makeQuestion(), makeQuestion({ id: 'q-0002', kind: 'tf', options: [], points: 1 })],
    shuffle: false,
    mixOptions: false,
    twoVersions: false,
    createdAt: t,
    updatedAt: t,
    ...overrides,
  }
}

export function makeCard(overrides: Partial<ThinkingCard> = {}): ThinkingCard {
  return {
    id: 'card-0001',
    title: 'بطاقة مخصصة',
    category: 'cooperative',
    brief: 'بطاقة أنشأها المعلم',
    steps: ['الخطوة الأولى', 'الخطوة الثانية'],
    timing: '5 دقائق',
    suitableFor: 'افتتاح الدرس',
    tips: 'استخدمها مرة أسبوعيًا',
    updatedAt: 4_000,
    ...overrides,
  }
}
