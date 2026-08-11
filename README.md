# CRM לסוכני ביטוח

מערכת CRM ייעודית לסוכני ביטוח: ריכוז ניהול לקוחות, פוליסות, משימות ותקשורת
(WhatsApp / SMS) במקום אחד, במקום שימוש מבוזר בכלים נפרדים (שורנס, רואטו,
SMS2000). המפרט המלא נמצא במסמך האפיון המקורי; מסמך זה מתאר את מה שכבר
ממומש בריפו.

## ארכיטקטורה

| שכבה | טכנולוגיה |
| --- | --- |
| בסיס נתונים | Supabase (PostgreSQL) עם Row-Level Security |
| Backend / API | Next.js App Router — API Routes תחת `app/api` |
| Frontend | Next.js + Tailwind CSS |
| אוטומציה | n8n (ראו `n8n/`) |
| תקשורת | WhatsApp API (Green API / Evolution API) עם נפילה אוטומטית ל-SMS — `lib/messaging/` |
| AI | OpenAI Whisper (תמלול), Gemini 1.5 Pro / GPT-4o (חילוץ JSON) — `lib/ai/` |

## מבנה הריפו

```
supabase/migrations/
  0001_init.sql                      # סכמת בסיס הנתונים + מדיניות RLS
  0002_agent_signup_trigger.sql      # יצירת שורת agents אוטומטית בהרשמה
middleware.ts                        # הגנת נתיבים + רענון session של Supabase Auth
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
  messaging/{whatsapp,sms,index}.ts  # שליחת הודעות + Smart Fallback + כתיבה ל-logs
  ai/{transcribe,extract,types}.ts   # Whisper + Gemini/GPT-4o
n8n/                                 # שלדי workflow לייבוא ל-n8n
  policy-renewal-workflow.json       # אוטומציית חידוש פוליסות (30/10 ימים)
  birthday-workflow.json             # ברכת יום הולדת + הצעת ערך
  daily-agent-report-workflow.json   # דו"ח בוקר יומי לסוכן ב-08:00
```

## מסד הנתונים

הטבלאות: `agents`, `clients`, `policies`, `tasks`, `logs`. כל טבלה (מלבד
`agents`) מכילה `agent_id` ומוגנת ב-RLS כך שסוכן רואה ומעדכן רק את הנתונים
המשויכים אליו. `logs` הוא append-only (אין מדיניות update/delete) לצורך
יומן ביקורת. הרשמת סוכן חדש (Supabase Auth) יוצרת אוטומטית שורה תואמת
ב-`agents` דרך trigger על `auth.users`.

להרצת המיגרציות על פרויקט Supabase:

```bash
supabase db push
# או, מול פרויקט מרוחק:
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_agent_signup_trigger.sql
```

## הרשמה, התחברות ואיפוס סיסמה

`/login` מאפשר הרשמה והתחברות עם אימייל/סיסמה (Supabase Auth).
`/forgot-password` שולח קישור איפוס, ו-`/auth/confirm` (route handler)
מממש את חילופי ה-PKCE code מהאימייל להפעלת session לפני שהמשתמש מגיע
ל-`/reset-password`. כל שאר הנתיבים מוגנים ב-`middleware.ts` ומפנים
אוטומטית ל-`/login` למשתמש לא מחובר.

## תקשורת (WhatsApp / SMS)

`lib/messaging/sendToClient()` מממש את ה-Dual-Channel Architecture מהמפרט:
שליחה ב-WhatsApp כערוץ ראשי, עם נפילה אוטומטית ל-SMS אם השליחה נכשלת או אם
`channel_preference` של הלקוח הוא `sms_only`. כל ניסיון שליחה נכתב ל-`logs`.
נחשף גם ב-API (`POST /api/messages/send`) וגם בכפתור "שלח הודעה" בדף
הלקוחות. **הפונקציות קוראות בפועל ל-`WHATSAPP_API_URL`/`SMS_API_URL`
מה-env** — ללא הגדרתם השליחה תיכשל עם שגיאה ברורה, לא סימולציה שקטה.

## מנוע AI

`lib/ai/transcribe.ts` קורא ל-OpenAI Whisper לתמלול הודעה קולית.
`lib/ai/extract.ts` מחלץ JSON מובנה (פרטי לקוח + פוליסה) מטקסט חופשי,
עם תמיכה הן ב-GPT-4o והן ב-Gemini 1.5 Pro (נבחר לפי `AI_PROVIDER` או לפי
איזה מפתח API מוגדר). נחשף ב-`POST /api/ai/parse-note` שמקבל קובץ שמע
(`audio`) או טקסט (`text`) ומחזיר `{ transcript, extracted }`.

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # למלא את מפתחות ה-Supabase / WhatsApp / SMS / AI
npm run dev
```

## מגבלות סביבת הפיתוח הנוכחית

הקוד בריפו הזה **לא נבדק מול שירותים אמיתיים** — הפיתוח נעשה בסביבת
container מבודדת ללא גישה למפתחות/פרויקטים אמיתיים של Supabase, WhatsApp
API, ספק SMS, OpenAI/Gemini, או מופע n8n. מה שכן אומת:

- `npm run build` ו-`npm run lint` — מקומפל ועובר type-check נקי.
- תקינות JSON של קובצי ה-n8n.
- לוגיקת הקוד נבדקה ידנית (code review), לא הרצה חיה.

**לפני עלייה לפרודקשן צריך**: לחבר פרויקט Supabase אמיתי ולהריץ את
המיגרציות, למלא את `.env.local` במפתחות אמיתיים, לבדוק את זרימת
ההרשמה/התחברות/איפוס סיסמה מול Supabase Auth אמיתי, לשלוח הודעת בדיקה
דרך `/api/messages/send`, ולייבא את קובצי ה-n8n למופע אמיתי ולהגדיר בו
credentials ל-Postgres/WhatsApp/SMS/Email.

## מה עוד חסר (מחוץ לסקופ הנוכחי)

- ייבוא/הרצה בפועל של קובצי ה-n8n מול מופע n8n אמיתי, כולל הגדרת credentials.
- תפקידי משתמש (multi-agent per agency) — כרגע כל agent רואה רק את הנתונים שלו, אבל אין ניהול הרשאות בין סוכנים באותה סוכנות.
- חיפוש/סינון/pagination בטבלאות (רלוונטי כשיש עשרות אלפי רשומות).
- שילוב `/api/ai/parse-note` בממשק (הלוגיקה קיימת ב-API אך אין עדיין כפתור "הקלט הודעה" בדפי הלקוחות).
