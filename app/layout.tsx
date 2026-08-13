import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./components/SignOutButton";

export const metadata: Metadata = {
  title: "CRM לסוכני ביטוח",
  description: "מערכת CRM לניהול לקוחות, פוליסות ומשימות לסוכני ביטוח",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {user && (
          <nav className="border-b bg-white px-6 py-4 shadow-sm">
            <div className="mx-auto flex max-w-5xl items-center gap-6">
              <span className="text-lg font-bold">CRM סוכני ביטוח</span>
              <Link href="/" className="text-sm hover:underline">
                דשבורד
              </Link>
              <Link href="/clients" className="text-sm hover:underline">
                לקוחות
              </Link>
              <Link href="/policies" className="text-sm hover:underline">
                פוליסות
              </Link>
              <Link href="/tasks" className="text-sm hover:underline">
                משימות
              </Link>
              <span className="flex-1" />
              <span className="text-sm text-gray-500">{user.email}</span>
              <SignOutButton />
            </div>
          </nav>
        )}
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
