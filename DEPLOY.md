# دليل النشر على GitHub Pages — خطوة بخطوة

هذا المشروع منشور تلقائيًا: كل دفعة (push) إلى الفرع `main` تمرّ على الاختبارات والبناء ثم تنشر في GitHub Pages. الدليل أدناه يشرح الإعداد من الصفر ويصلح لإعادة النشر لاحقًا.

## المتطلبات

- حساب GitHub (المستخدم الحالي: `hnyth50-gif`).
- Git مثبّتًا، وتسجيل الدخول إلى GitHub CLI مرة واحدة:

```bash
gh auth login
```

## 1) إنشاء المستودع على GitHub

```bash
# من داخل مجلد المشروع
gh repo create moallem-plus --public --description "معلّم بلس — مساحة عمل عربية للمعلم"
```

أو يدويًا: github.com → **New repository** → الاسم `moallem-plus` → عام → **دون أي ملف تهيئة** (بدون README/gitignore) → Create.

## 2) ربط المشروع المحلي وتحميله

```bash
git remote add origin https://github.com/hnyth50-gif/moallem-plus.git
git branch -M main
git push -u origin main
```

## 3) تفعيل Pages من إعدادات المستودع (مرة واحدة فقط)

أهم خطوة يغفلها الكثيرون: يجب أن تُسمح لـ GitHub Actions بالنشر:

1. افتح المستودع ثم: **Settings** → **Pages**.
2. في خانة **Build and deployment** اختر:
   - **Source**: `GitHub Actions`
3. احفظ. (لا حاجة لأي إعداد آخر — لا فرع `gh-pages` ولا مجلد `docs/`.)

بالسطر البرمجي بدلًا عن المتصفح:

```bash
gh api repos/hnyth50-gif/moallem-plus/pages -X POST -f build_type=workflow
```

## 4) ما يحدث بعد الدفعة

سير `.github/workflows/pages.yml` يشتغل تلقائيًا:

1. **build**: تثبيت المكتبيات (`npm ci`) → تشغيل كل الاختبارات (`npm test`) → البناء (`npm run build`) → رفع `dist/`.
2. **deploy**: نشر المجلد إلى Pages.

الحالة والسجل: تبويب **Actions** في المستودع. فشل = رسالة واضحة في الخطوة المتعثرة.

إعادة التشغيل اليدوي:

```bash
gh run list --limit 5
gh run watch            # أو رقم التشغيل المطلوب
gh workflow run pages.yml   # إطلاق يدوي عند الحاجة
```

## 5) رابط الموقع

بعد أول نشر ناجح يكون الموقع متاحًا على:

```
https://hnyth50-gif.github.io/moallem-plus/
```

لاحظ أن التطبيق يستخدم `HashRouter` مع `base: './'`، لذا يعمل تحت المسار الفرعي `moallem-plus` دون أي ضبط لاحق إطلاقًا.

## استكشاف الأخطاء الشائعة

| المشكلة | الحل |
|---|---|
| Actions فشل بصلاحيات Pages | تأكد من خطوة 3: `Settings → Pages → Source: GitHub Actions` |
| الصفحة 404 بعد نشر ناجح | التفعيل الجديد يستغرق دقيقة؛ حدّث الصفحة. تأكد أن الرابط يتضمن اسم المستودع `moallem-plus/` |
| تحتاج إعادة نشر بلا تعديلات | تبويب Actions → اختر آخر تشغيل → **Re-run all jobs** |
| تعديل واحد صغير لم يبُنَ | `git push` مرة أخرى، أو `gh workflow run pages.yml` |

## ملاحظات أمنية

- لا مفاتيح API ولا أسرار في هذا المشروع ولا حاجة إليها (كل شيء محلي في المتصفح).
- لا تدفع أبًا بيانات اعتماد أو رموز (tokens) داخل الملفات.
- ملف `.gitignore` يمنع رفع `node_modules/` و`dist/` والمخلفات المحلية.
