// ============ أنواع هيكلية دنيا لمكتبة supabase-js المحمولة من CDN ============
// المكتبة تُحمَّل عبر وسم CDN في index.html فلا توجد أنواع رسمية من الحزمة —
// نُعرِّف هنا الشكل الدنيا الذي نستعمله فقط، وبقية المشروع يبقى مكتوب الأنواع.

/** مستند صف من جدول notes */
export interface SupabaseRow {
  id: string
  user_id: string
  kind: string
  title: string
  data: unknown
  updated_at: string
  created_at?: string
}

/** نتيجة استعلام موحدة (كما تعيدها المكتبة) */
export interface SupabaseResult<T = SupabaseRow> {
  data: T | null
  error: { message: string } | null
}

/** باني استعلام قابل للانتظار في أي موضع من السلسلة */
export interface SupabaseQuery extends PromiseLike<SupabaseResult> {
  select(columns?: string): SupabaseQuery
  eq(column: string, value: unknown): SupabaseQuery
  in(column: string, values: string[]): SupabaseQuery
  upsert(rows: Array<Record<string, unknown>>, options?: { onConflict?: string }): SupabaseQuery
  delete(): SupabaseQuery
}

export interface SupabaseUser {
  id: string
  email?: string | null
}

export interface SupabaseSession {
  access_token: string
  user: SupabaseUser | null
}

export interface SupabaseAuthResponse {
  data: { session: SupabaseSession | null }
  error: { message: string } | null
}

export interface SupabaseSignUpResponse {
  data: { session: SupabaseSession | null; user: SupabaseUser | null }
  error: { message: string } | null
}

/** نتيجة بدء تدفق OAuth (مثل Google) */
export interface SupabaseOAuthResponse {
  data: { provider: string; url?: string }
  error: { message: string } | null
}

export interface SupabaseAuth {
  getSession(): Promise<{ data: { session: SupabaseSession | null }; error: { message: string } | null }>
  onAuthStateChange(callback: (event: string, session: SupabaseSession | null) => void): {
    data: { subscription: { unsubscribe(): void } }
  }
  signInWithPassword(credentials: { email: string; password: string }): Promise<SupabaseAuthResponse>
  signUp(credentials: { email: string; password: string }): Promise<SupabaseSignUpResponse>
  signInWithOAuth(options: { provider: string; options?: { redirectTo?: string } }): Promise<SupabaseOAuthResponse>
  signOut(): Promise<{ error: { message: string } | null }>
}

export interface SupabaseClient {
  auth: SupabaseAuth
  from(table: string): SupabaseQuery
}

/** الشكل المتوقع من النطاق العام الذي يوفره وسم CDN */
export interface SupabaseGlobal {
  createClient(url: string, publishableKey: string, options?: unknown): SupabaseClient
}
