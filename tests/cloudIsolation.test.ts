import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { emptyData } from '../src/lib/store'
import { loadAppState, saveAppState, scopedStorageKey, STORAGE_KEY } from '../src/lib/storage'
import { makePlan } from './helpers'
import {
  clearQueue,
  enqueueCloudOps,
  getPendingDeletes,
  hasPendingOps,
  setSyncUser,
} from '../src/lib/cloudSync'

beforeEach(() => {
  setSyncUser(null)
  window.localStorage.clear()
})
afterEach(() => {
  clearQueue()
  setSyncUser(null)
  window.localStorage.clear()
})

describe('الحفظ المحلي المعزول', () => {
  it('كل معلّم له مساحة مستقلة، والبيانات القديمة للضيف لا تتغير', () => {
    const guest = emptyData()
    guest.plans = [makePlan({ id: 'old-plan' })]
    const alice = emptyData()
    alice.plans = [makePlan({ id: 'alice-plan' })]
    const bob = emptyData()
    bob.plans = [makePlan({ id: 'bob-plan' })]

    expect(saveAppState(guest).ok).toBe(true)
    expect(saveAppState(alice, 'teacher-a').ok).toBe(true)
    expect(saveAppState(bob, 'teacher-b').ok).toBe(true)

    expect(scopedStorageKey()).toBe(STORAGE_KEY)
    expect(scopedStorageKey('teacher-a')).not.toBe(scopedStorageKey('teacher-b'))
    expect(loadAppState()?.plans[0].id).toBe('old-plan')
    expect(loadAppState('teacher-a')?.plans[0].id).toBe('alice-plan')
    expect(loadAppState('teacher-b')?.plans[0].id).toBe('bob-plan')
  })
})

describe('المزامنة المؤجلة الخاصة بكل معلّم', () => {
  const plan = makePlan({ id: 'plan-a', updatedAt: 1000 })

  it('تحتفظ بالتعديلات بعد الخروج وتستعيدها لصاحبها فقط', () => {
    setSyncUser('teacher-a')
    enqueueCloudOps([{ kind: 'plan', doc: plan }])
    expect(hasPendingOps()).toBe(true)
    expect(window.localStorage.getItem('moallem-plus:pending:teacher-a')).not.toBeNull()
    setSyncUser(null)
    expect(hasPendingOps()).toBe(false)
    setSyncUser('teacher-b')
    expect(hasPendingOps()).toBe(false)
    expect(getPendingDeletes('teacher-a')).toEqual([])
    setSyncUser('teacher-a')
    expect(hasPendingOps()).toBe(true)
  })

  it('الحذف المؤجل لا يختلط بالحسابات ولا يعيد العنصر لاحقًا', () => {
    setSyncUser('teacher-a')
    enqueueCloudOps([{ kind: 'plan', doc: plan }])
    enqueueCloudOps([], [{ kind: 'plan', id: 'plan-a' }])
    expect(getPendingDeletes('teacher-a')).toEqual([{ kind: 'plan', id: 'plan-a' }])
    setSyncUser('teacher-b')
    expect(getPendingDeletes('teacher-b')).toEqual([])
    setSyncUser('teacher-a')
    expect(getPendingDeletes('teacher-a')).toHaveLength(1)
    // استرجاع مستند بعد الحذف يُلغيه.
    enqueueCloudOps([{ kind: 'plan', doc: { ...plan, updatedAt: 2000 } }])
    expect(getPendingDeletes('teacher-a')).toEqual([])
  })

  it('لا يسجل عمليات دفع قبل الدخول بحساب', () => {
    setSyncUser(null)
    enqueueCloudOps([{ kind: 'plan', doc: plan }])
    expect(hasPendingOps()).toBe(false)
  })
})
