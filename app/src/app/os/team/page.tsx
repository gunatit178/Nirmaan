import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { can, ROLE_LABELS, ROLE_CAPABILITIES } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/web/session";
import { CLIENT_ROLES, INTERNAL_ROLES } from "@/lib/db/enums";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { ActionForm } from "../../_components/ActionForm";
import { Badge, NoAccess, PageHead, when } from "../../_components/ui";
import { createUserAction, setActiveAction, setRoleAction } from "../actions/team";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const user = await requireUser();
  if (!can(user.role, "user:manage")) return <NoAccess capability="user:manage" />;
  const [users, clients] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], include: { client: { select: { name: true } } } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHead title="Team" eyebrow="Company" />
      <div className="split">
        <section className="panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Last sign-in</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.name}
                      <div className="faint">{u.email}</div>
                      {u.client && <div className="faint">client: {u.client.name}</div>}
                      {!u.active && <Badge value="inactive" tone="bad" />}
                    </td>
                    <td>
                      <ActionForm action={setRoleAction} submit="Change" variant="ghost sm" className="row">
                        <input type="hidden" name="userId" value={u.id} />
                        <select className="input" name="role" defaultValue={u.role} aria-label={`Role for ${u.name}`}>
                          {(u.clientId ? CLIENT_ROLES : INTERNAL_ROLES).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </ActionForm>
                    </td>
                    <td className="faint">{when(u.lastLoginAt)}</td>
                    <td>
                      {u.id !== user.id && (
                        <ActionForm action={setActiveAction} submit={u.active ? "Deactivate" : "Reactivate"} variant={u.active ? "danger sm" : "ghost sm"} className="">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="active" value={String(!u.active)} />
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="stack">
          <section className="panel">
            <h2>Add a team member</h2>
            <ActionForm action={createUserAction} submit="Create account">
              <label className="field">
                <span className="label-text">Name</span>
                <input className="input" name="name" required />
              </label>
              <label className="field">
                <span className="label-text">Email</span>
                <input className="input" name="email" type="email" required />
              </label>
              <label className="field">
                <span className="label-text">Role</span>
                <select className="input" name="role" defaultValue="ENGINEER">
                  {INTERNAL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="label-text">Temporary password</span>
                <input className="input" name="password" type="password" minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" required />
                <span className="hint">At least {MIN_PASSWORD_LENGTH} characters. Share it over a different channel from the email address.</span>
              </label>
            </ActionForm>
          </section>
          {clients.length > 0 && (
            <section className="panel">
              <h2>Give a client portal access</h2>
              <p className="faint" style={{ fontSize: "0.8125rem" }}>
                Client accounts see only their own projects, invoices and support requests. Admins can also request changes.
              </p>
              <ActionForm action={createUserAction} submit="Create client account">
                <label className="field">
                  <span className="label-text">Client</span>
                  <select className="input" name="clientId" required>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-row">
                  <input className="input" name="name" placeholder="Name" aria-label="Name" required />
                  <input className="input" name="email" type="email" placeholder="Email" aria-label="Email" required />
                </div>
                <div className="form-row">
                  <select className="input" name="role" defaultValue="CLIENT_ADMIN" aria-label="Access">
                    {CLIENT_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <input className="input" name="password" type="password" minLength={MIN_PASSWORD_LENGTH} placeholder="Temporary password" aria-label="Temporary password" autoComplete="new-password" required />
                </div>
              </ActionForm>
            </section>
          )}
          <section className="panel">
            <details className="disclose">
              <summary>What each role can do</summary>
              <dl className="dl">
                {INTERNAL_ROLES.map((r) => (
                  <div key={r} style={{ display: "contents" }}>
                    <dt>{ROLE_LABELS[r]}</dt>
                    <dd className="mono faint">{ROLE_CAPABILITIES[r].join(", ")}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </section>
        </div>
      </div>
    </>
  );
}
