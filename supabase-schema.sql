-- معلّم بلس: مخطط مشروع جديد فقط. لقاعدة قائمة، افحص القيود قبل أي تعديل.
-- كل صف مستند واحد يخص معلّمًا واحدًا: خطة/نشاط/اختبار/بطاقة/مفكرة/شهادة/إعدادات.
-- البيانات الوصفية للمرفقات ضمن JSONB؛ محتوى الملفات يحتاج تخزينًا آمنًا مستقلًا.

create table if not exists public.notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('plan','activity','quiz','card','week','certificate','settings')),
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists notes_user_kind_updated_idx
  on public.notes (user_id, kind, updated_at desc);

alter table public.notes enable row level security;
revoke all on public.notes from public, anon;
grant select, insert, update, delete on public.notes to authenticated;

drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

create policy "notes_select_own" on public.notes
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "notes_insert_own" on public.notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "notes_update_own" on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "notes_delete_own" on public.notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- تحقق من المفتاح الأساسي والحماية قبل التفعيل:
-- select pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.notes'::regclass and contype = 'p';
-- select policyname, cmd from pg_policies where schemaname='public' and tablename='notes';
-- ملاحظة: الجداول القديمة التي كان مفتاحها الأساسي id تحتاج ترحيلًا منفصلًا،
-- ولا يكفي CREATE TABLE IF NOT EXISTS لتغيير ذلك المفتاح.
