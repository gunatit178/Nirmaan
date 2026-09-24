import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/web/session";
import { ActionForm } from "../_components/ActionForm";
import { Logo } from "../_components/Logo";
import { login } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/os");
  const next = (await searchParams).next;
  return (
    <main className="auth">
      <div className="panel">
        <div className="brand">
          <Logo />
          <b>Nirmaan</b>
          <span>OS</span>
        </div>
        <h1>Sign in</h1>
        <ActionForm action={login} submit="Sign in" pendingLabel="Signing in…">
          <input type="hidden" name="next" value={typeof next === "string" ? next : "/os"} />
          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
        </ActionForm>
        <p className="faint" style={{ fontSize: "0.8125rem" }}>
          Team accounts only. Clients receive a private link instead.
        </p>
      </div>
    </main>
  );
}
