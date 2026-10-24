import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/zeus/actions/auth";
import { ExternalIcon, FolderIcon, InboxIcon, OverviewIcon, SettingsIcon, UsersIcon, WalletIcon } from "@/components/admin/icons";
import { SidebarMenu } from "@/components/admin/mobile-menu";
import { SidebarNav, type NavItem } from "@/components/admin/sidebar-nav";
import { Avatar } from "@/components/admin/ui";
import { roleLabels } from "@/lib/admin/format";
import { canAccess, getSessionUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { site } from "@/lib/site";

export async function Sidebar() {
  const user = await getSessionUser();
  if (!user) {
    return <SidebarFrame />;
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [newQuotes, overdueInvoices] = await Promise.all([
    canAccess(user.role, "quotes") ? db().quoteRequest.count({ where: { status: "NEW" } }) : 0,
    canAccess(user.role, "finance") ? db().invoice.count({ where: { status: "SENT", dueDate: { lt: startOfToday } } }) : 0,
  ]);

  const items: NavItem[] = [
    { href: "/zeus", label: "Overview", icon: <OverviewIcon />, area: "overview" as const },
    { href: "/zeus/quotes", label: "Quote requests", icon: <InboxIcon />, area: "quotes" as const, badge: newQuotes ? { text: String(newQuotes), tone: "gold" as const } : undefined },
    { href: "/zeus/projects", label: "Projects", icon: <FolderIcon />, area: "projects" as const },
    { href: "/zeus/clients", label: "Clients", icon: <UsersIcon />, area: "clients" as const },
    { href: "/zeus/finances", label: "Finances", icon: <WalletIcon />, area: "finance" as const, badge: overdueInvoices ? { text: `${overdueInvoices} overdue`, tone: "red" as const } : undefined },
    { href: "/zeus/settings", label: "Settings", icon: <SettingsIcon />, area: "settings" as const },
  ]
    .filter((item) => canAccess(user.role, item.area))
    .map((item) => ({ href: item.href, label: item.label, icon: item.icon, badge: item.badge }));

  return (
    <SidebarFrame alert={newQuotes > 0 || overdueInvoices > 0}>
      <SidebarNav items={items} />
      <div className="mt-auto flex flex-col gap-3">
        <Link href="/" className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm text-mist no-underline hover:bg-white/5 hover:text-white">
          <ExternalIcon size={16} />
          View website
        </Link>
        <div className="flex items-center gap-2.5 border-t border-white/10 px-2.5 pt-3">
          <Avatar name={user.name} />
          <Link href="/zeus/account" className="flex min-w-0 flex-1 flex-col no-underline">
            <strong className="truncate text-sm text-white">{user.name}</strong>
            <span className="text-xs text-haze">{roleLabels[user.role]} · Your account</span>
          </Link>
          <form action={logout}>
            <button type="submit" className="cursor-pointer rounded-md px-2 py-1 text-xs text-mist hover:bg-white/10 hover:text-white">Sign out</button>
          </form>
        </div>
      </div>
    </SidebarFrame>
  );
}

function SidebarFrame({ alert, menu = true, children }: { alert?: boolean; menu?: boolean; children?: React.ReactNode }) {
  const home = (
    <Link href="/zeus" aria-label="Ledobiz admin home" className="flex flex-1 items-center justify-between gap-2 px-1.5 no-underline">
      <Image src={site.logo} alt="Ledobiz" width={128} height={34} unoptimized className="h-[34px] w-32 object-cover" />
      <span className="rounded bg-river px-1.5 py-0.5 text-[10px] font-medium tracking-[0.2em] text-midnight">ADMIN</span>
    </Link>
  );
  return (
    <aside className="on-dark flex w-full flex-col bg-midnight px-3.5 py-3 text-sm text-mist nav:min-h-dvh nav:w-[248px] nav:gap-5 nav:py-5">
      {children && menu ? (
        <SidebarMenu home={home} alert={alert}>{children}</SidebarMenu>
      ) : (
        <>
          {home}
          {children}
        </>
      )}
    </aside>
  );
}

export function SidebarSkeleton() {
  return (
    <SidebarFrame menu={false}>
      <div className="hidden flex-col gap-2 nav:flex">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className="h-[42px] animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    </SidebarFrame>
  );
}
