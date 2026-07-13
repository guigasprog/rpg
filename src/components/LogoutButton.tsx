"use client";

import { logout } from "@/lib/authActions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="btn btn-ghost tap text-xs">
        Sair
      </button>
    </form>
  );
}
