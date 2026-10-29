-- ============================================================
-- معلّم بلس | مخطط قاعدة البيانات على Supabase
-- انسخ هذا الملف كاملًا والصقه في: Supabase Dashboard → SQL Editor → New query → Run
-- يحتوي: جدول الملاحظات (notes) + فهارس + سياسات الحماية RLS
-- ملاحظة أمان: سياسات RLS تعزل بيانات كل مستخدم عن غيره تمامًا،
-- لذا يكفي مفتاح «النشر العام» (publishable/anon) في الواجهة —
-- ولا يُستخدم المفتاح السري (secret/service_role) في المتصفح إطلاقًا.
-- ============================================================

-- 1) جدول الملاحظات: كل صف = مستند واحد (خطة/نشاط/اختبار/بطاقة/مهمة أسبوعية/شهادة) أو صف الإعدادات
create table if not exists public.notes (
  id         text primary key,                     -- معرف المستند كما يولّده التطبيق (نص)
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('plan','activity','quiz','card','week','certificate','settings')),
  title      text not null default '',
  data       jsonb not null default '{}'::jsonb,   -- المستند كاملًا كما هو في التطبيق
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- فهرس لجلب مستندات المستخدم بسرعة (وهو الاستعلام الوحيد الذي يستعمله التطبيق)
create index if not exists notes_user_kind_idx on public.notes (user_id, kind);

-- 2) تفعيل الحماية على مستوى الصفوف (RLS) — لا يرى أي مستخدم إلا صفوفه
alter table public.notes enable row level security;

-- حذف السياسات القديمة إن وجدت (لإعادة التشغيل بأمان دون أخطاء)
drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

-- 3) السياسات: القراءة والإضافة والتعديل والحذف لصاحب الصف فقط
create policy "notes_select_own"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "notes_insert_own"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "notes_update_own"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own"
  on public.notes for delete
  using (auth.uid() = user_id);

-- 4) (اختياري لكنه مفضّل) منع المستخدم من انتحال user_id مستخدم آخر عند الإضافة
--    عبر قيود داخلية: user_id يجب أن يساوي هوية الجلسة — مغطى بسياسات with check أعلاه.

-- 5) التحقق بعد التطبيق (استعلامات فحص — اختياري):
-- select * from public.notes limit 5;
-- select schemaname, tablename, policyname, cmd from pg_policies where tablename = 'notes';
