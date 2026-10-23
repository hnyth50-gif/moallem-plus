import { Link } from 'react-router-dom'
import { Button } from '../components/UI'

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="mb-2 text-6xl font-black text-brand-700 dark:text-brand-400">٤٠٤</p>
      <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">الصفحة غير موجودة</h1>
      <p className="mb-6 max-w-md text-sm text-slate-500 dark:text-slate-400">
        الرابط الذي طلبته غير موجود أو تغيّر. ابدأ من الرئيسية وستجد كل أدواتك هناك.
      </p>
      <Link to="/">
        <Button>رجوع إلى الرئيسية</Button>
      </Link>
    </div>
  )
}
