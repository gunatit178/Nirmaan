import Link from "next/link";

const NAV_STYLE: React.CSSProperties = {
  display: "flex",
  gap: "1.5rem",
  padding: "1rem 1.5rem",
  borderBottom: "1px solid #333",
  fontFamily: "system-ui, sans-serif",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav style={NAV_STYLE}>
        <strong>Agency OS</strong>
        <Link href="/dashboard">Projects</Link>
        <Link href="/dashboard/approvals">Approvals</Link>
      </nav>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "2rem 1.5rem", fontFamily: "system-ui, sans-serif" }}>
        {children}
      </div>
    </div>
  );
}
