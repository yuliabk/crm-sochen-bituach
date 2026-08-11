"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto mt-16 max-w-sm space-y-6">
      <h1 className="text-2xl font-bold">שחזור סיסמה</h1>

      {sent ? (
        <p className="text-sm text-gray-600">
          נשלח אליך אימייל עם קישור לאיפוס הסיסמה.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-lg border bg-white p-4"
        >
          <input
            required
            type="email"
            placeholder="אימייל"
            className="w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
          >
            שלח קישור לאיפוס
          </button>
        </form>
      )}

      <a href="/login" className="block text-sm text-gray-600 hover:underline">
        חזרה להתחברות
      </a>
    </div>
  );
}
