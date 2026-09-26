import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/web/session";
import { isClientRole } from "@/lib/db/enums";
import { ActionForm } from "../_components/ActionForm";
import { Logo } from "../_components/Logo";
import { login } from "./actions";
import { googleConfigured } from "@/lib/auth/google";

const GOOGLE_ERRORS: Record<string, string> = {
  "google-not-allowed": "That Google account isn't on the team. Ask the founder to add your email.",
  "google-failed": "Google sign-in didn't work. Try again.",
  "google-expired": "The sign-in took too long or was started elsewhere. Try again.",
  "google-cancelled": "Google sign-in was cancelled.",
  "google-busy": "Too many sign-in attempts. Try again in a few minutes.",
  "google-off": "Google sign-in isn't set up yet.",
};

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const current = await getCurrentUser();
  if (current) redirect(isClientRole(current.role) ? "/portal" : "/os");
  const params = await searchParams;
  const next = params.next;
  const error = typeof params.error === "string" ? GOOGLE_ERRORS[params.error] : undefined;
  const google = googleConfigured();
  return (
    <main className="auth">
      <div className="panel">
        <div className="brand">
          <Logo />
          <b>Nirmaan</b>
          <span>OS</span>
        </div>
        <h1>Sign in</h1>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {google && (
          <>
            <a className="btn" href={`/api/auth/google${typeof next === "string" ? `?next=${encodeURIComponent(next)}` : ""}`} style={{ width: "100%", justifyContent: "center" }}>
              Sign in with Google
            </a>
            <p className="faint" style={{ textAlign: "center", margin: "0.25rem 0" }}>
              or with a password
            </p>
          </>
        )}
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
          Team and client accounts. Clients are taken to their portal.
        </p>
      </div>
    </main>
  );
}
