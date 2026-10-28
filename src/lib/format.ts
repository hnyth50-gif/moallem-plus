// أدوات تنسيق التواريخ والأرقام بالعربية (ميلادي)
const dateFmt = new Intl.DateTimeFormat('ar-EG', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  calendar: 'gregory',
})

const dateFmtShort = new Intl.DateTimeFormat('ar-EG', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  calendar: 'gregory',
})

const relTime = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })

export function formatDate(ms: number | undefined | null): string {
  if (!ms || !Number.isFinite(ms)) return ''
  try {
    return dateFmt.format(new Date(ms))
  } catch {
    return ''
  }
}

export function formatDateShort(ms: number | undefined | null): string {
  if (!ms || !Number.isFinite(ms)) return ''
  try {
    return dateFmtShort.format(new Date(ms))
  } catch {
    return ''
  }
}

/** صياغة التاريخ لطبقة ترويسة الطباعة */
export function formatDateForPrint(iso: string | undefined): string {
  if (!iso) return '—————'
  const ms = new Date(`${iso}T12:00:00`).getTime()
  if (!Number.isFinite(ms)) return iso
  return formatGregorianShort(ms)
}

function formatGregorianShort(ms: number): string {
  try {
    return dateFmtShort.format(new Date(ms))
  } catch {
    return new Date(ms).toISOString().slice(0, 10)
  }
}

/** «قبل 3 ساعات» / «قبل يوم» — تعتمد Intl.RelativeTimeFormat */
export function formatRelative(ms: number, now = Date.now()): string {
  if (!Number.isFinite(ms)) return ''
  const diff = ms - now // سالب للماضي
  const abs = Math.abs(diff)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (abs < minute) return 'قبل لحظات'
  if (abs < hour) return relTime.format(Math.round(diff / minute), 'minute')
  if (abs < day) return relTime.format(Math.round(diff / hour), 'hour')
  if (abs < 30 * day) return relTime.format(Math.round(diff / day), 'day')
  return formatDateShort(ms)
}

export function formatPoints(n: number): string {
  try {
    return n.toLocaleString('ar-EG')
  } catch {
    return String(n)
  }
}

/** صياغة عربية سليمة لعدد النقاط: نقطة واحدة / نقطتان / نقاط / نقطة */
export function pointsLabel(n: number): string {
  if (!Number.isFinite(n)) return ''
  if (n === 1) return 'نقطة واحدة'
  if (n === 2) return 'نقطتان'
  if (n >= 3 && n <= 10) return `${formatPoints(n)} نقاط`
  return `${formatPoints(n)} نقطة`
}

/** مبدّل اختياري للأرقام في طباعة الاختبار */
export function arabicIndex(n: number): string {
  try {
    return (n + 1).toLocaleString('ar-EG')
  } catch {
    return String(n + 1)
  }
}

/** نسخة يومية ثابتة لسلسلة التاريخ (لتحديد «بطاقة اليوم») */
export function dayKey(now = Date.now()): string {
  const d = new Date(now)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/**
 * تنسيق مدة زمنية إلى م:ث (أو س:م:ث إن تجاوزت الساعة) بأرقام لاتينية
 * — أوضح للعرض الكبير أمام الصف (المؤقت الصفي).
 */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

// ============ الساعة والتاريخ الهجري/الميلادي ============
// المُنسّقات تُنشأ بتكاسل (lazy) وأي تقويم/إعداد غير مدعوم يعيد سلسلة فارغة بأمان.

let hijriFmt: Intl.DateTimeFormat | null | undefined
function getHijriFmt(): Intl.DateTimeFormat | null {
  if (hijriFmt === undefined) {
    try {
      hijriFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      hijriFmt = null
    }
  }
  return hijriFmt
}

let timeFmt: Intl.DateTimeFormat | null | undefined
function getTimeFmt(): Intl.DateTimeFormat | null {
  if (timeFmt === undefined) {
    try {
      timeFmt = new Intl.DateTimeFormat('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    } catch {
      timeFmt = null
    }
  }
  return timeFmt
}

/** التاريخ الهجري (أم القرى) مثل «١٤ رجب ١٤٤٧ هـ» */
export function formatHijri(ms: number | undefined | null): string {
  if (!ms || !Number.isFinite(ms)) return ''
  const fmt = getHijriFmt()
  if (!fmt) return ''
  try {
    return fmt.format(new Date(ms))
  } catch {
    return ''
  }
}

/** وقت الساعة بنظام 24 ساعة مثل «٠٩:٠٥:٠٣» */
export function formatTime(ms: number | undefined | null): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return ''
  const fmt = getTimeFmt()
  if (!fmt) return ''
  try {
    return fmt.format(new Date(ms))
  } catch {
    return ''
  }
}
