import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { can } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/web/session";
import type { Role } from "@/lib/db/enums";
import { Logo } from "../_components/Logo";
import { NavLinks, type NavItem } from "../_components/NavLinks";
import { logout } from "../login/actions";

export default async function OsLayout({ children }: LayoutProps<"/os">) {
  const user = await requireUser();
  const role = user.role as Role;
  const [pendingApprovals, newLeads] = await Promise.all([
    can(role, "approval:decide") ? prisma.approval.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    can(role, "lead:read") ? prisma.lead.count({ where: { status: "NEW" } }) : Promise.resolve(0),
  ]);

  const items: NavItem[] = [
    can(role, "dashboard:read") && { href: "/os", label: "Today" },
    can(role, "lead:read") && { href: "/os/leads", label: "Leads", count: newLeads, group: "Pipeline" },
    can(role, "proposal:read") && { href: "/os/proposals", label: "Proposals", group: "Pipeline" },
    can(role, "project:read") && { href: "/os/projects", label: "Projects", group: "Delivery" },
    can(role, "approval:decide") && { href: "/os/approvals", label: "Approvals", count: pendingApprovals, group: "Delivery" },
    can(role, "finance:read") && { href: "/os/finance", label: "Finance", group: "Company" },
    can(role, "ai:read") && { href: "/os/ai", label: "AI usage", group: "Company" },
    can(role, "audit:read") && { href: "/os/audit", label: "Audit log", group: "Company" },
    can(role, "user:manage") && { href: "/os/team", label: "Team", group: "Company" },
  ].filter(Boolean) as NavItem[];

  return (
    <div className="shell">
      <aside className="side">
        <Link className="brand" href="/os">
          <Logo />
          <b>Nirmaan</b>
          <span>OS</span>
        </Link>
        <NavLinks items={items} />
        <div className="side-foot">
          <span>
            {user.name} <span className="faint">· {ROLE_LABELS[role] ?? role}</span>
          </span>
          <form action={logout}>
            <button className="btn ghost sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="main" id="main">
        {children}
      </main>
    </div>
  );
}
