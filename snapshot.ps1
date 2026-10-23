# ============================================================
# أداة لقطات الحالة — معلّم بلس
# تشغيل:  .\snapshot.cmd "وصف التغيير"
#         .\snapshot.cmd -List
# ما تفعله:
#   1) تثبت كل التغييرات الحالية في commit يضم التعليق والتاريخ
#   2) تضع Tag موسومًا اسمه snap-<التاريخ والوقت> بتعليقك
#   3) ترفع اللقطة والوسم إلى GitHub (حتى لو فسد المجلد المحلي تبقى اللقطة محفوظة)
# ============================================================
param(
    [string]$Comment = "",
    [switch]$List
)

$ErrorActionPreference = 'Stop'

# --- عرض اللقطات المحفوظة ---
if ($List) {
    Write-Output "== اللقطات المحفوظة (الأحدث أولًا) =="
    git for-each-ref --sort=-creatordate --format='%(creatordate:iso)|%(refname:short)|%(contents:subject)' "refs/tags/snap-*" |
        ForEach-Object {
            $p = $_ -split '\|', 3
            if ($p.Length -ge 3) { Write-Output ("{0}  {1}  —  {2}" -f $p[0], $p[1], $p[2]) }
        }
    Write-Output ""
    Write-Output "للاستعراض فقط:   git checkout <اسم اللقطة>"
    Write-Output "للعودة إليها:     git checkout main; git reset --hard <اسم اللقطة>   (يفقد ما جاء بعدها)"
    return
}

# --- تعليق إجباري (سؤال إن لم يُمرَّر) ---
if ([string]::IsNullOrWhiteSpace($Comment)) {
    $Comment = Read-Host "اكتب وصفًا موجزًا لهذا التغيير (يُحفظ مع التاريخ)"
    if ([string]::IsNullOrWhiteSpace($Comment)) {
        Write-Error "لا يمكن عمل لقطة دون تعليق يوضح التغيير."
    }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$iso   = Get-Date -Format 'yyyy-MM-dd HH:mm'
$tag   = "snap-$stamp"
$message = "لقطة الحالة — $iso — $Comment"

Write-Output "== لقطة جديدة =="

# --- أي تغييرات غير محفوظة؟ ---
$dirty = (git status --porcelain) | Out-String
$hasChanges = -not [string]::IsNullOrWhiteSpace($dirty)

if ($hasChanges) {
    git add -A
    git commit -m $message | Out-Null
    Write-Output "✔ حُفظت التغييرات في commit جديد."
}
else {
    Write-Output "• لا تغييرات تعديلية منذ آخر حفظ — ستُوسم الحالة الحالية فقط."
}

# --- وسوم موسومة بتعليق التغيير والتاريخ ---
git tag -a $tag -m $message
Write-Output "✔ وُسمت اللقطة: $tag"

# --- رفع إلى GitHub (حتى تبقى اللقطات متاحة من أي جهاز) ---
$remoteUrl = git remote get-url origin
$pushed = $false
try {
    $tok = (gh auth token) 2>$null
    if (-not [string]::IsNullOrWhiteSpace($tok) -and $remoteUrl -match 'github\.com[:/]') {
        # دفعة مؤقتة برمز تسجيل gh (بدون تخزين دائم) ثم إعادة الرابط الأصلي
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'   # حتى لا تكسر تحذيرات git على stderr السكربت
        $authUrl = $remoteUrl -replace 'https://github\.com', "https://hnyth50-gif:$tok@github.com"
        git remote set-url origin $authUrl
        git push -u origin main --tags *> $null
        $code = $LASTEXITCODE
        git remote set-url origin $remoteUrl
        $ErrorActionPreference = $prevEAP
        if ($code -eq 0) {
            $pushed = $true
            Write-Output "✔ رُفعت اللقطة والوسم إلى GitHub."
        }
    }
}
catch {
    git remote set-url origin $remoteUrl
}
if (-not $pushed) { Write-Output "⚠ لم يُرَفَع — شغّل لاحقًا:  git push --tags" }

# --- الخلاصة وإرشاد العودة ---
Write-Output ""
Write-Output "== أحدث اللقطات =="
git for-each-ref --sort=-creatordate --format='%(creatordate:iso)|%(refname:short)' "refs/tags/snap-*" |
    Select-Object -First 5 | ForEach-Object {
        $p = $_ -split '\|', 2
        Write-Output ("{0}  {1}" -f $p[0], $p[1])
    }
Write-Output ""
Write-Output "للعودة إلى هذه اللقطة لاحقًا:"
Write-Output "  git checkout main"
Write-Output "  git reset --hard $tag        # يعيد المجلد كاملًا إلى هذه اللحظة"
Write-Output "  git push --force             # فقط إن أردت جعل GitHub مطابقًا للأصل"
