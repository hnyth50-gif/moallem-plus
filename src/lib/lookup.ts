import type { ThinkingCard } from './types'
import { BUILTIN_CARDS } from './strategies'

/** البحث عن بطاقة استراتيجية بالمعرّف في المكتبة المدمجة + بطاقات المعلم الخاصة */
export function cardById(id: string, customCards: ThinkingCard[]): ThinkingCard | undefined {
  return (
    BUILTIN_CARDS.find((c) => c.id === id) ??
    customCards.find((c) => c.id === id)
  )
}

/** كل البطاقات المتاحة (مدمجة ثم الخاصة) */
export function allCards(customCards: ThinkingCard[]): ThinkingCard[] {
  return [...BUILTIN_CARDS, ...customCards]
}
