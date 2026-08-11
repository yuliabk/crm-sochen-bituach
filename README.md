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
| תקשורת | WhatsApp API (Green API / Evolution API) עם נפילה אוטומטית ל-SMS |
| AI | OpenAI Whisper (תמלול), Gemini 1.5 Pro / GPT-4o (חילוץ JSON) — לא ממומש עדיין בקוד, ראו "מה עוד חסר" |

## מבנה הריפו

```
supabase/migrations/0001_init.sql   # סכמת בסיס הנתונים + מדיניות RLS
app/                                 # Next.js App Router
  page.tsx                           # דשבורד: חידושים קרובים + משימות פתוחות
  clients/page.tsx                   # רשימת לקוחות + טופס הוספה
  policies/page.tsx                  # רשימת פוליסות
  tasks/page.tsx                     # רשימת משימות
  api/clients, api/policies, api/tasks  # CRUD API routes
lib/
  supabase/{server,client}.ts        # Supabase client factories (SSR + browser)
  types.ts                           # טיפוסי TypeScript התואמים לסכמה
n8n/                                 # שלדי workflow לייבוא ל-n8n
  policy-renewal-workflow.json       # אוטומציית חידוש פוליסות (30/10 ימים)
  birthday-workflow.json             # ברכת יום הולדת + הצעת ערך
  daily-agent-report-workflow.json   # דו"ח בוקר יומי לסוכן ב-08:00
```

## מסד הנתונים

הטבלאות: `agents`, `clients`, `policies`, `tasks`, `logs`. כל טבלה (מלבד
`agents`) מכילה `agent_id` ומוגנת ב-RLS כך שסוכן רואה ומעדכן רק את הנתונים
המשויכים אליו. `logs` הוא append-only (אין מדיניות update/delete) לצורך
יומן ביקורת.

להרצת המיגרציה על פרויקט Supabase:

```bash
supabase db push
# או, מול פרויקט מרוחק:
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
```

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # למלא את מפתחות ה-Supabase
npm run dev
```

## מה עוד חסר (מחוץ לסקופ של הצעד הראשון)

- אימות/הרשמה של סוכנים (Supabase Auth) וקישור `agents` לטבלת `auth.users`.
- אינטגרציה בפועל מול WhatsApp API / SMS API (כרגע רק כתובות ב-`.env.example`).
- שילוב מנוע ה-AI (Whisper לתמלול הודעות קוליות, Gemini/GPT-4o לחילוץ JSON).
- ייבוא/הרצה בפועל של קובצי ה-n8n מול מופע n8n אמיתי, כולל הגדרת credentials.
- טפסי עריכה/מחיקה לפוליסות ומשימות בממשק (כרגע קיים רק טופס הוספת לקוח).
