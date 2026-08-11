import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM לסוכני ביטוח",
  description: "מערכת CRM לניהול לקוחות, פוליסות ומשימות לסוכני ביטוח",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="border-b bg-white px-6 py-4 shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center gap-6">
            <span className="text-lg font-bold">CRM סוכני ביטוח</span>
            <a href="/" className="text-sm hover:underline">
              דשבורד
            </a>
            <a href="/clients" className="text-sm hover:underline">
              לקוחות
            </a>
            <a href="/policies" className="text-sm hover:underline">
              פוליסות
            </a>
            <a href="/tasks" className="text-sm hover:underline">
              משימות
            </a>
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
