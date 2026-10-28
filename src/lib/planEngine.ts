import type { PlanSection } from './types'

// ============ محرك خطة الدرس ============

/** مراحل الخطة المقترحة (تظهر كاقتراحات datalist) */
export const PLAN_PHASES = [
  'افتتاحية وتهيئة',
  'عرض وشرح',
  'ممارسة وتطبيق',
  'نشاط تعاوني',
  'تقييم',
  'ختام وتلخيص',
  'إثراء وتعالج فروقًا',
] as const

export interface PhaseTemplateItem {
  phase: string
  weight: number // نسبة من الزمن الإجمالي
  hint: string
}

/** قالب مراحل (5E مبسّط مع أوزان زمنية) */
export const PHASE_TEMPLATES: PhaseTemplateItem[] = [
  { phase: 'افتتاحية وتهيئة', weight: 0.15, hint: 'تذكير، سؤال رايع، ربط بالحياة' },
  { phase: 'عرض وشرح', weight: 0.4, hint: 'الشرح والنمذجة والأمثلة' },
  { phase: 'ممارسة وتطبيق', weight: 0.25, hint: 'أعمال فردية وإرشاد مباشر' },
  { phase: 'تقييم', weight: 0.1, hint: 'أسئلة سريعة، بطاقة خروج' },
  { phase: 'ختام وتلخيص', weight: 0.1, hint: 'تلخيص مع الطلاب وربط بالدرس القادم' },
]

/**
 * توزيع مدة الحصة على المراحل حسب الأوزان، مع ضمان أن المجموع يساوي تمامًا total
 * وأن كل قيمة أكبر من صفر (عندما يسمح العدد).
 */
export function distributeMinutes(
  total: number,
  items: PhaseTemplateItem[] = PHASE_TEMPLATES,
): { phase: string; minutes: number; hint: string }[] {
  const safeTotal = Math.max(1, Math.round(Number.isFinite(total) ? total : 45))
  const weighted = items.map((it) => ({ ...it, minutes: Math.max(1, Math.floor(safeTotal * it.weight)) }))
  // إذا كان الزمن أصغر من عدد المراحل فنظهر أهم المراحل فقط (الأعلى وزنًا)
  const kept = [...weighted].sort((a, b) => b.weight - a.weight).slice(0, Math.min(weighted.length, safeTotal))
  let rest = safeTotal - kept.reduce((s, r) => s + r.minutes, 0)
  if (rest > 0) {
    // إضافة الفائض للمراحل الأعلى وزنًا
    const order = [...kept].sort((a, b) => b.weight - a.weight)
    let i = 0
    while (rest > 0) {
      order[i % order.length].minutes += 1
      rest -= 1
      i += 1
    }
  } else if (rest < 0) {
    // سحب العلام من المراحل الأدنى وزنًا (مع الحفاظ على دقيقة واحدة على الأقل)
    const order = [...kept].sort((a, b) => a.weight - b.weight)
    let i = 0
    while (rest < 0 && i < order.length * 4) {
      const target = order[i % order.length]
      if (target.minutes > 1) {
        target.minutes -= 1
        rest += 1
      }
      i += 1
    }
  }
  return kept
    .sort((a, b) => {
      const ai = PHASE_TEMPLATES.findIndex((t) => t.phase === a.phase)
      const bi = PHASE_TEMPLATES.findIndex((t) => t.phase === b.phase)
      return ai - bi
    })
    .map(({ phase, minutes, hint }) => ({ phase, minutes, hint }))
}

/** تقسيم عناصر مراحل جاهزة لخطة جديدة وفق المدة */
export function sectionsFromTemplate(total: number): PlanSection[] {
  return distributeMinutes(total).map((d) => ({
    phase: d.phase,
    minutes: d.minutes,
    description: d.hint,
  }))
}

/** الحقول الافتراضية الموحدة — القائمة الكاملة لمواد المنهج */
export const SUBJECT_SUGGESTIONS = [
  'القرآن الكريم',
  'الدراسات الإسلامية',
  'التربية الإسلامية',
  'اللغة العربية',
  'الرياضيات',
  'العلوم',
  'الفيزياء',
  'الكيمياء',
  'الأحياء',
  'علوم الأرض',
  'الدراسات الاجتماعية',
  'التاريخ',
  'الجغرافيا',
  'اللغة الإنجليزية',
  'المهارات الرقمية',
  'الحاسوب وتقنية المعلومات',
  'المهارات الحياتية والأسرية',
  'التربية الفنية',
  'التربية البدنية',
]

/** القائمة الكاملة للصفوف: الابتدائي والمتوسط والثانوي */
export const GRADE_SUGGESTIONS = [
  'الصف الأول الابتدائي',
  'الصف الثاني الابتدائي',
  'الصف الثالث الابتدائي',
  'الصف الرابع الابتدائي',
  'الصف الخامس الابتدائي',
  'الصف السادس الابتدائي',
  'الصف الأول المتوسط',
  'الصف الثاني المتوسط',
  'الصف الثالث المتوسط',
  'الصف الأول الثانوي',
  'الصف الثاني الثانوي',
  'الصف الثالث الثانوي',
]
