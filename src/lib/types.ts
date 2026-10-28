// ============ أنواع بيانات معلّم بلس ============
// كل البيانات تُخزَّن محليًا في المتصفح (localStorage) — لا خادم ولا حسابات.

export type ThemeMode = 'light' | 'dark' | 'system'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type QuestionKind = 'mcq' | 'tf' | 'short' | 'essay'

export type DocKind = 'plan' | 'activity' | 'quiz'

export interface Profile {
  name: string
  school: string
  semester: string
}

export interface Settings {
  profile: Profile
}

export interface QuizQuestion {
  id: string
  kind: QuestionKind
  prompt: string
  /** للخيار المتعدد فقط */
  options: string[]
  /** فهرس الإجابة الصحيحة في options */
  answerIdx: number
  /** صح/خطأ فقط */
  tfAnswer: boolean
  /** للإجابة القصيرة والمقالية: الإجابة النموذجية */
  modelAnswer: string
  points: number
  difficulty: Difficulty
  tag?: string
}

export interface PlanSection {
  phase: string
  minutes: number
  description: string
}

export interface PlanDoc {
  id: string
  kind: 'plan'
  demo?: boolean
  title: string
  subject: string
  grade: string
  unit?: string
  classDate?: string
  durationMinutes?: number
  objectives: string[]
  resources: string[]
  sections: PlanSection[]
  homework?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface ActivityStep {
  text: string
  minutes?: number
}

export interface ActivityDoc {
  id: string
  kind: 'activity'
  demo?: boolean
  title: string
  subject: string
  grade: string
  goal: string
  /** معرّف بطاقة استراتيجية من المكتبة أو من البطاقات المخصصة */
  strategyId?: string
  materials: string[]
  steps: ActivityStep[]
  grouping?: string
  assessment?: string
  outcome?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface QuizDoc {
  id: string
  kind: 'quiz'
  demo?: boolean
  title: string
  subject: string
  grade: string
  unit?: string
  timeMinutes?: number
  instructions?: string
  questions: QuizQuestion[]
  shuffle: boolean
  mixOptions: boolean
  twoVersions: boolean
  createdAt: number
  updatedAt: number
}

export type CardCategory =
  | 'cooperative'
  | 'metacognition'
  | 'problem-solving'
  | 'organizers'
  | 'creativity'
  | 'rapid'
export const CARD_CATEGORIES: CardCategory[] = [
  'cooperative',
  'metacognition',
  'problem-solving',
  'organizers',
  'creativity',
  'rapid',
]

export interface ThinkingCard {
  id: string
  builtin?: boolean
  demo?: boolean
  title: string
  category: CardCategory
  brief: string
  steps: string[]
  timing: string
  suitableFor: string
  tips: string
  updatedAt: number
}

export type WeekEntryKind = 'plan' | 'activity' | 'quiz' | 'note'

/** عنصر في المفكرة الأسبوعية: ربط يوم دراسي بمهمة أو بمستند جاهز (خطة/نشاط/اختبار) */
export interface WeekEntry {
  id: string
  kind: WeekEntryKind
  demo?: boolean
  /** فهرس اليوم الدراسي (0 = الأحد) ضمن أيام الأسبوع الدراسي المعروضة */
  day: number
  title: string
  /** وصف حر للحصة أو الوقت، مثل «الحصة الثالثة» */
  period?: string
  /** معرّف المستند المرتبط عند kind = plan/activity/quiz */
  refId?: string
  createdAt: number
  updatedAt: number
}

export interface AppData {
  version: number
  savedAt: number
  plans: PlanDoc[]
  activities: ActivityDoc[]
  quizzes: QuizDoc[]
  customCards: ThinkingCard[]
  weekEntries: WeekEntry[]
  settings: Settings
}
