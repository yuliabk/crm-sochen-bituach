# CRM לסוכני ביטוח

מערכת CRM ייעודית לסוכני ביטוח: ריכוז ניהול לקוחות, פוליסות, משימות ותקשורת
(WhatsApp / SMS) במקום אחד, במקום שימוש מבוזר בכלים נפרדים (שורנס, רואטו,
SMS2000). המפרט המלא נמצא במסמכי האפיון המקוריים; מסמך זה מתאר את מה שכבר
ממומש בריפו. שמות הטבלאות/השדות תואמים למסמך ההנחיות (`schema.sql`) כדי
שסקריפטים חיצוניים (ייבוא CSV/Excel, n8n) יעבדו נגדם ללא שינוי.

## ארכיטקטורה

| שכבה | טכנולוגיה |
| --- | --- |
| בסיס נתונים | Supabase (PostgreSQL) עם Row-Level Security |
| Backend / API | Next.js App Router — API Routes תחת `app/api` |
| Frontend | Next.js + Tailwind CSS |
| אוטומציה | n8n (ראו `n8n/`) |
| תקשורת | WhatsApp API (Green API) עם נפילה אוטומטית ל-SMS — `lib/messaging/` |
| AI | OpenAI Whisper (תמלול), Gemini 1.5 Pro / GPT-4o (חילוץ JSON) — `lib/ai/` |
| ייבוא נתונים | סקריפטי Python (`scripts/`) לייבוא CSV/Excel מרואטו/שורנס |

## מבנה הריפו

```
.devcontainer/devcontainer.json      # סביבת Codespaces (Python) להרצת סקריפטי הנתונים
supabase/migrations/
  0001_init.sql                      # סכמת בסיס הנתונים + מדיניות RLS
  0002_agent_signup_trigger.sql      # יצירת שורת agents אוטומטית בהרשמה
  0003_audit_logs.sql                # יומן ביקורת מלא + אכיפת קשרי multi-tenant
supabase/seed.sql                    # נתוני דמה לבדיקות (ראו הוראות בקובץ)
scripts/
  import_clients_policies.py         # ייבוא CSV/Excel מרואטו/שורנס ל-Supabase
  requirements.txt                   # תלויות Python
proxy.ts                             # הגנת נתיבים + רענון session של Supabase Auth
app/                                 # Next.js App Router
  login/page.tsx                     # התחברות / הרשמת סוכן
  forgot-password/page.tsx           # בקשת קישור לאיפוס סיסמה
  reset-password/page.tsx            # בחירת סיסמה חדשה
  auth/confirm/route.ts              # exchange של קישורי אימייל (PKCE) לסשן
  page.tsx                           # דשבורד: חידושים קרובים + משימות פתוחות
  clients/page.tsx                   # לקוחות: הוספה, עריכה, שליחת הודעה, מחיקה
  policies/page.tsx                  # פוליסות: הוספה, עריכה, מחיקה
  tasks/page.tsx                     # משימות: הוספה, עריכה, מחיקה
  api/clients, api/policies, api/tasks  # CRUD API routes
  api/auth/signout                   # התנתקות
  api/messages/send                  # שליחת הודעה ללקוח (WhatsApp עם נפילה ל-SMS)
  api/ai/parse-note                  # תמלול/חילוץ JSON מהודעה קולית או טקסט חופשי
lib/
  supabase/{server,client}.ts        # Supabase client factories (SSR + browser)
  types.ts                           # טיפוסי TypeScript התואמים לסכמה
  messaging/{whatsapp,sms,index}.ts  # שליחת הודעות + Smart Fallback + כתיבה ל-communication_logs
  ai/{transcribe,extract,types}.ts   # Whisper + Gemini/GPT-4o
n8n/                                 # שלדי workflow לייבוא ל-n8n
  policy-renewal-workflow.json       # אוטומציית חידוש פוליסות (30/10 ימים)
  birthday-workflow.json             # ברכת יום הולדת + הצעת ערך
  daily-agent-report-workflow.json   # דו"ח בוקר יומי לסוכן ב-08:00
```

## מסד הנתונים

הטבלאות: `agents`, `clients`, `policies`, `tasks`, `communication_logs`,
`audit_logs`. כל
טבלה (מלבד `agents`) מכילה `agent_id` ומוגנת ב-RLS כך שסוכן רואה ומעדכן רק
את הנתונים המשויכים אליו — שכבת multi-tenancy מעל הסכמה הבסיסית, כדי
שהמערכת תתמוך בכמה סוכנים בעתיד ולא רק בסוכן יחיד. `communication_logs`
ו-`audit_logs` הן append-only (אין מדיניות update/delete). יומן הביקורת
מתעד צפיות דרך ה-API והדשבורד, ו-trigger-ים במסד מתעדים כל הוספה, עדכון
ומחיקה של לקוח, פוליסה או משימה. אילוץ מורכב במסד מונע קישור פוליסה או
משימה ללקוח של סוכן אחר. הרשמת סוכן
חדש (Supabase Auth) יוצרת אוטומטית שורה תואמת ב-`agents` דרך trigger על
`auth.users`.

להרצת המיגרציות על פרויקט Supabase:

```bash
supabase db push
# או, מול פרויקט מרוחק:
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_agent_signup_trigger.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_audit_logs.sql
```

להטענת נתוני דמה לבדיקות, ראו את ההוראות בראש `supabase/seed.sql` (דורש
UUID של סוכן קיים).

## ייבוא מרואטו / שורנס

`scripts/import_clients_policies.py` מייבא לקוחות ופוליסות מקובצי
CSV/Excel שיוצאו מרואטו או משורנס. מכיוון ששני השירותים לא חושפים סכמת
ייצוא קבועה, יש לערוך את ה-mapping של שמות העמודות (`CLIENT_COLUMN_MAP` /
`POLICY_COLUMN_MAP` בראש הקובץ) כך שיתאים לכותרות בפועל בקובץ שיוצא אצלכם.

```bash
pip install -r scripts/requirements.txt
python scripts/import_clients_policies.py \
  --agent-id <agent-uuid> \
  --clients-file export_clients.xlsx \
  --policies-file export_policies.xlsx
```

`.devcontainer/devcontainer.json` מגדיר סביבת GitHub Codespaces עם Python
3.10 ותלויות הסקריפט מותקנות אוטומטית, לנוחות הרצת הייבוא בלי סביבה מקומית.

## הרשמה, התחברות ואיפוס סיסמה

`/login` מאפשר הרשמה והתחברות עם אימייל/סיסמה (Supabase Auth).
`/forgot-password` שולח קישור איפוס, ו-`/auth/confirm` (route handler)
מממש את חילופי ה-PKCE code מהאימייל להפעלת session לפני שהמשתמש מגיע
ל-`/reset-password`. כל שאר הנתיבים מוגנים ב-`proxy.ts` ומפנים
אוטומטית ל-`/login` למשתמש לא מחובר.

## תקשורת (WhatsApp / SMS)

`lib/messaging/sendToClient()` מממש את ה-Dual-Channel Architecture מהמפרט:
שליחה ב-WhatsApp (Green API) כערוץ ראשי, עם נפילה אוטומטית ל-SMS אם
השליחה נכשלת או אם `preferred_channel` של הלקוח הוא `sms_only`. כל ניסיון
שליחה נכתב ל-`communication_logs`. נחשף גם ב-API
(`POST /api/messages/send`) וגם בכפתור "שלח הודעה" בדף הלקוחות.
**הפונקציות קוראות בפועל ל-Green API / ספק ה-SMS לפי משתני הסביבה** —
ללא הגדרתם השליחה תיכשל עם שגיאה ברורה, לא סימולציה שקטה. ל-SMS יש להגדיר
גם `SMS_PROVIDER_API_URL` (הנקודת קצה בפועל של 019/InforUMobile, לא
מוגדרת מראש כי היא שונה בין הספקים).

## מנוע AI

`lib/ai/transcribe.ts` קורא ל-OpenAI Whisper לתמלול הודעה קולית.
`lib/ai/extract.ts` מחלץ JSON מובנה (פרטי לקוח + פוליסה) מטקסט חופשי,
עם תמיכה הן ב-GPT-4o והן ב-Gemini 1.5 Pro (נבחר לפי `AI_PROVIDER` או לפי
איזה מפתח API מוגדר). נחשף ב-`POST /api/ai/parse-note` שמקבל קובץ שמע
(`audio`) או טקסט (`text`) ומחזיר `{ transcript, extracted }`.

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # למלא את מפתחות ה-Supabase / Green API / SMS / AI
npm run dev
```

## מגבלות סביבת הפיתוח הנוכחית

הקוד בריפו הזה **לא נבדק מול שירותים אמיתיים** — הפיתוח נעשה בסביבת
container מבודדת ללא גישה למפתחות/פרויקטים אמיתיים של Supabase, Green API,
ספק SMS, OpenAI/Gemini, או מופע n8n. מה שכן אומת:

- `npm run build` ו-`npm run lint` — מקומפל ועובר type-check נקי.
- `npm audit` — ללא חולשות ידועות בחבילות המותקנות.
- תקינות JSON של קובצי ה-n8n ושל `.devcontainer/devcontainer.json`.
- תקינות תחבירית (syntax) של סקריפט הפייתון.
- לוגיקת הקוד נבדקה ידנית (code review), לא הרצה חיה.

**לפני עלייה לפרודקשן צריך**: לחבר פרויקט Supabase אמיתי ולהריץ את
המיגרציות, למלא את `.env.local` במפתחות אמיתיים, לבדוק את זרימת
ההרשמה/התחברות/איפוס סיסמה מול Supabase Auth אמיתי, לשלוח הודעת בדיקה
דרך `/api/messages/send`, לעדכן את ה-column mapping בסקריפט הייבוא לפי
הקובץ האמיתי מרואטו/שורנס, ולייבא את קובצי ה-n8n למופע אמיתי ולהגדיר בו
credentials ל-Postgres/WhatsApp/SMS/Email.

## מה עוד חסר (מחוץ לסקופ הנוכחי)

- ייבוא/הרצה בפועל של קובצי ה-n8n מול מופע n8n אמיתי, כולל הגדרת credentials.
- ניהול הרשאות בין סוכנים באותה סוכנות (תפקידים, שיתוף לקוחות) — כרגע כל
  agent רואה רק את הנתונים שהוא עצמו יצר.
- חיפוש/סינון/pagination בטבלאות (רלוונטי כשיש עשרות אלפי רשומות).
- שילוב `/api/ai/parse-note` בממשק (הלוגיקה קיימת ב-API אך אין עדיין כפתור "הקלט הודעה" בדפי הלקוחות).
