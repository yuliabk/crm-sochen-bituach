"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          });

    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="mx-auto mt-16 max-w-sm space-y-6">
      <h1 className="text-2xl font-bold">
        {mode === "login" ? "התחברות" : "הרשמת סוכן"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-white p-4">
        {mode === "signup" && (
          <input
            required
            placeholder="שם מלא"
            className="w-full rounded border px-3 py-2"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        )}
        <input
          required
          type="email"
          placeholder="אימייל"
          className="w-full rounded border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          required
          type="password"
          minLength={6}
          placeholder="סיסמה"
          className="w-full rounded border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {mode === "login" ? "התחבר" : "הרשם"}
        </button>
      </form>

      <button
        className="text-sm text-gray-600 hover:underline"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "סוכן חדש? הרשמה" : "יש לך כבר חשבון? התחבר"}
      </button>
    </div>
  );
}
