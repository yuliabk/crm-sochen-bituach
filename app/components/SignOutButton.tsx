"use client";

export function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="POST">
      <button type="submit" className="text-sm text-gray-600 hover:underline">
        התנתק
      </button>
    </form>
  );
}
