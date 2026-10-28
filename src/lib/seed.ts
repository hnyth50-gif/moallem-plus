import type { ActivityDoc, AppData, CertificateDoc, PlanDoc, QuizDoc, ThinkingCard, WeekEntry } from './types'
import { makeId } from './id'
import { distributeMinutes } from './planEngine'

// ============ بيانات العرض التجريبية ============
// كل عنصر تحمل وسم demo:true ويظهر بلاوي «تجريبي» بوضوح،
// ويمكن حذف جميعها بضغطة واحدة من الإعدادات.

function demoTimestamps(daysAgo: number): { createdAt: number; updatedAt: number } {
  const now = Date.now()
  const t = now - daysAgo * 86_400_000
  return { createdAt: t, updatedAt: t }
}

export const DEMO_PREFIX = 'demo-0001-'

export function createDemoData(_profileName = '', _school = ''): {
  plans: PlanDoc[]
  activities: ActivityDoc[]
  quizzes: QuizDoc[]
  customCards: ThinkingCard[]
  weekEntries: WeekEntry[]
  certificates: CertificateDoc[]
} {
  const subject = 'العلوم'
  const grade = 'الصف الخامس'
  const planCreated = Date.now() - 2 * 86_400_000

  const plan: PlanDoc = {
    ...demoTimestamps(2),
    id: makeId(DEMO_PREFIX),
    kind: 'plan',
    demo: true,
    title: 'تجريبي: خطة درس صور التنفس في النبات',
    subject,
    grade,
    unit: 'وحدة الكائنات الحية',
    durationMinutes: 45,
    objectives: [
      'يُحدِّد الطالب عضوات التركيب الضوئي.',
      'يشرح تأثير الضوء في عمليات النبات.',
      'يصنع نموذجًا مصوّرًا لدورة التنفس.',
    ],
    resources: ['سبرانت مطوية', 'صور', 'شريط مضمّع'],
    sections: distributeMinutes(45).map((s, i) => ({
      phase: s.phase,
      minutes: s.minutes,
      description:
        i === 0
          ? 'سؤال رايع بالصورة لخلاصة جذب الطلاب.'
          : i === 1
            ? 'شرح العلاقة بين الضوء وعمليات النبات مع نموذج واضح.'
            : i === 2
              ? 'مجموعات تُبنى حول صور تطبيقية.'
              : i === 3
                ? 'بطاقة خروج سريعة مقابل الفهم.'
                : 'تلخيص مع الطلاب وتحديد خبر التعميق الليلة.',
    })),
    homework: 'رسمة لدورة التنفس في دفتر العلوم.',
    notes: 'التجربة السابقة تشوب ما يُرجى للحصة.',
    createdAt: planCreated,
    updatedAt: planCreated,
  }

  const activity: ActivityDoc = {
    ...demoTimestamps(1),
    id: makeId(DEMO_PREFIX),
    kind: 'activity',
    demo: true,
    title: 'تجريبي: نشاط فكّر – زاوج – شارك لخلص الدرس',
    subject,
    grade,
    goal: 'تنشيط المعرفة السابقة قبل درس التركيب الضوئي.',
    strategyId: 'builtin-01',
    materials: ['بطاقات أسئلة', 'ساعة توقيت'],
    steps: [
      { text: 'أعطي السؤال: ما الذي تحتاجه النبات لتبقى حية؟', minutes: 2 },
      { text: 'ثنائيات النقاش في دقائق ثلاث.', minutes: 3 },
      { text: 'يشارك الثنائيات أعلمها محددة وبالنسبة.', minutes: 3 },
    ],
    grouping: 'ثنائيات',
    assessment: 'ملاحظة شفهية لإجابات الطلاب.',
    outcome: 'معرفة خمسة أسئلة أساسية قبل الدرس.',
    notes: 'اختر الثنائيات عشوائيًا من قائمة الصف.',
  }

  const quiz: QuizDoc = {
    ...demoTimestamps(0),
    id: makeId(DEMO_PREFIX),
    kind: 'quiz',
    demo: true,
    title: 'تجريبي: اختبار سريع حول التركيب الضوئي',
    subject,
    grade,
    unit: 'وحدة الكائنات الحية',
    timeMinutes: 15,
    instructions: 'أجب عن جميع الأسئلة. لكل سؤال اختيار واحد صحيح.',
    questions: [
      {
        id: `${DEMO_PREFIX}q1`,
        kind: 'mcq',
        prompt: 'ما العملية التي تصنع فيها النبات غذاءه؟',
        options: ['التنفس الخلوي', 'التركيب الضوئي', 'النتح', 'الإخراج'],
        answerIdx: 1,
        tfAnswer: true,
        modelAnswer: '',
        points: 2,
        difficulty: 'easy',
        tag: 'مفاهيم أول',
      },
      {
        id: `${DEMO_PREFIX}q2`,
        kind: 'mcq',
        prompt: 'أي الغازات يستهلكها النبات أثناء التركيب الضوئي؟',
        options: ['بريق الهيدروجين', 'الأكسجين', 'ثاني أكسيد الكربون', 'النيتروجين'],
        answerIdx: 2,
        tfAnswer: true,
        modelAnswer: '',
        points: 2,
        difficulty: 'medium',
        tag: 'مفاهيم أول',
      },
      {
        id: `${DEMO_PREFIX}q3`,
        kind: 'tf',
        prompt: 'يستطيع التركيب الضوئي حدوثه في الظلام تمامًا.',
        options: [],
        answerIdx: 0,
        tfAnswer: false,
        modelAnswer: '',
        points: 1,
        difficulty: 'easy',
      },
      {
        id: `${DEMO_PREFIX}q4`,
        kind: 'short',
        prompt: 'ذكر=[مصدرَيْن] لطاقة يستخدمها النبات في التركيب الضوئي.',
        options: [],
        answerIdx: 0,
        tfAnswer: true,
        modelAnswer: 'الضوء (الشمس)، والماء، وثاني أكسيد الكربون.',
        points: 2,
        difficulty: 'medium',
      },
      {
        id: `${DEMO_PREFIX}q5`,
        kind: 'essay',
        prompt: 'اشرح علاقة النبات بالحياة على الأرض في خمسة عبارات.',
        options: [],
        answerIdx: 0,
        tfAnswer: true,
        modelAnswer:
          'صنعُ الغذاء وتنقية الهواء ومصدر الأكسجين وتغذية السلاسل الغذائية، وتمعدل التربة.',
        points: 3,
        difficulty: 'hard',
      },
    ],
    shuffle: true,
    mixOptions: true,
    twoVersions: false,
    createdAt: planCreated,
    updatedAt: Date.now() - 3_600_000,
  }

  const card: ThinkingCard = {
    ...demoTimestamps(1),
    id: makeId(DEMO_PREFIX),
    demo: true,
    title: 'تجريبي: بطاقة فصل الأدوار',
    category: 'cooperative',
    brief: 'بطاقة نموذجية أنشأها المعلم لتخصيص أدوار المتعلمين قبل النشاط.',
    steps: [
      'وزَّع أدوارًا دقيقة (قائد، مراقب، كاتب، عارض).',
      'طبّع لكل دور مهمة ووصفًا خطيًا.',
      'تدوّن الملاحظة بعد كل دورة.',
    ],
    timing: 'من 10 إلى 15 دقيقة',
    suitableFor: 'نشاطات التعاون الجماعي.',
    tips: 'غيّر الأدوار بالدورة كي يعيشها الجميع.',
  }

  const weekEntries: WeekEntry[] = [
    {
      ...demoTimestamps(1),
      id: makeId(DEMO_PREFIX),
      kind: 'plan',
      demo: true,
      day: 0,
      title: 'تجريبي: درس صور التنفس في النبات',
      period: 'الحصة الثالثة',
      refId: plan.id,
    },
    {
      ...demoTimestamps(1),
      id: makeId(DEMO_PREFIX),
      kind: 'activity',
      demo: true,
      day: 1,
      title: 'تجريبي: فكّر – زاوج – شارك',
      period: 'الحصة الرابعة',
      refId: activity.id,
    },
    {
      ...demoTimestamps(1),
      id: makeId(DEMO_PREFIX),
      kind: 'note',
      demo: true,
      day: 3,
      title: 'تجريبي: تحضير مواد مختبر الطابور',
      period: 'قبل الطابور',
    },
  ]

  const certificates: CertificateDoc[] = [
    {
      ...demoTimestamps(1),
      id: makeId(DEMO_PREFIX),
      demo: true,
      type: 'excellence',
      studentName: 'سارة عبدالله الأحمد',
      grade: 'الصف الخامس الابتدائي',
      reason: 'لتفوقها المتميز في مادة العلوم ومشاركتها الفعالة داخل الصف طوال الفصل الدراسي.',
      dateISO: new Date().toISOString().slice(0, 10),
    },
  ]

  return {
    plans: [plan],
    activities: [activity],
    quizzes: [quiz],
    customCards: [card],
    weekEntries,
    certificates,
  }
}

/** تُسهل الدخول في بيانات المعلم من الصفح العرض سيلًا (stamp: -1) */
export function applyDemoToData(base: AppData): AppData {
  const demo = createDemoData()
  const withDemo: AppData = {
    ...base,
    plans: [...demo.plans, ...base.plans],
    activities: [...demo.activities, ...base.activities],
    quizzes: [...demo.quizzes, ...base.quizzes],
    customCards: [...demo.customCards, ...base.customCards],
    weekEntries: [...demo.weekEntries, ...(base.weekEntries ?? [])],
    certificates: [...demo.certificates, ...(base.certificates ?? [])],
  }
  return withDemo
}
