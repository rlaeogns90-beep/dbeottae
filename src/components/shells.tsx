"use client";

import {
  Bell, ClipboardCheck, FileWarning, Home, Inbox, KeyRound, Layers, LogOut, Plug, ScrollText, Settings, ShieldCheck,
  User, Users, Wallet, Briefcase, Clock3, Radio,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { balanceOf } from "@/lib/engine";
import { won } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Admin, Advertiser, Partner, Session } from "@/lib/types";
import { cx, Logo } from "./ui";

function useGuard(role: Session["role"]) {
  const { session, state } = useStore();
  const router = useRouter();
  const user =
    session?.role === role
      ? role === "advertiser"
        ? state.advertisers.find((a) => a.id === session.id)
        : role === "partner"
          ? state.partners.find((p) => p.id === session.id)
          : state.admins.find((a) => a.id === session.id)
      : undefined;
  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);
  return user;
}

export const useAdvertiser = () => useGuard("advertiser") as Advertiser | undefined;
export const usePartner = () => useGuard("partner") as Partner | undefined;
export const useAdmin = () => useGuard("admin") as Admin | undefined;

type NavItem = { href: string; label: string; icon: React.ElementType; count?: number };

const isActive = (path: string, href: string, root: string) => (href === root ? path === root : path.startsWith(href));

function TopNav({ items, root }: { items: NavItem[]; root: string }) {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={cx(
            "rounded-lg px-3 py-2 text-[15px] font-semibold",
            isActive(path, it.href, root) ? "text-ink" : "text-mute hover:text-sub",
          )}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

function BottomNav({ items, root }: { items: NavItem[]; root: string }) {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((it) => {
        const on = isActive(path, it.href, root);
        return (
          <Link key={it.href} href={it.href} className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", on ? "text-ink" : "text-mute")}>
            <it.icon size={22} strokeWidth={on ? 2.2 : 1.8} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu({ name }: { name: string }) {
  const { logout } = useStore();
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-sub sm:inline">{name}님</span>
      <button
        onClick={() => {
          logout();
          router.replace("/login");
        }}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-mute hover:bg-soft hover:text-sub"
      >
        <LogOut size={16} /> 로그아웃
      </button>
    </div>
  );
}

export function AdvertiserShell({ children }: { children: React.ReactNode }) {
  const adv = useAdvertiser();
  const { state } = useStore();
  if (!adv) return null;
  const items: NavItem[] = [
    { href: "/app", label: "홈", icon: Home },
    { href: "/app/leads", label: "DB 관리", icon: Inbox },
    { href: "/app/wallet", label: "예치금", icon: Wallet },
    { href: "/app/defects", label: "불량 처리", icon: FileWarning },
    { href: "/app/me", label: "내 정보", icon: User },
  ];
  return (
    <div className="min-h-screen bg-page pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/app"><Logo /></Link>
            <TopNav items={items} root="/app" />
          </div>
          <div className="flex items-center gap-3">
            <span className={cx("flex items-center gap-1.5 text-[13px] font-semibold", adv.receiving ? "text-brand" : "text-mute")}>
              <span className={cx("h-2 w-2 rounded-full", adv.receiving ? "bg-brand" : "bg-[#c4cad0]")} />
              {adv.receiving ? "수신 ON" : "수신 OFF"}
            </span>
            <span className="tabular hidden text-[13px] text-sub sm:inline">{won(balanceOf(state, adv.id))}</span>
            <UserMenu name={adv.name} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <BottomNav items={items} root="/app" />
    </div>
  );
}

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const p = usePartner();
  if (!p) return null;
  const items: NavItem[] = [
    { href: "/partner", label: "실적", icon: Home },
    { href: "/partner/advertisers", label: "추천 광고주", icon: Users },
    { href: "/partner/leads", label: "배정 DB", icon: Inbox },
  ];
  return (
    <div className="min-h-screen bg-page pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/partner" className="flex items-center gap-2">
              <Logo />
              <span className="rounded-md bg-soft px-1.5 py-0.5 text-[11px] font-semibold text-sub">영업자</span>
            </Link>
            <TopNav items={items} root="/partner" />
          </div>
          <UserMenu name={p.name} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <BottomNav items={items} root="/partner" />
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = useAdmin();
  const { state, alerts } = useStore();
  const path = usePathname();
  if (!admin) return null;

  const waiting = state.leads.filter((l) => l.status === "waiting").length;
  const pendingMembers =
    state.advertisers.filter((a) => a.status === "pending").length + state.partners.filter((p) => p.status === "pending").length;
  const pendingDeposits = state.deposits.filter((d) => d.status === "pending").length;
  const pendingDefects = state.defects.filter((d) => d.status === "pending").length;

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: "DB",
      items: [
        { href: "/admin", label: "실시간 DB 현황", icon: Radio },
        { href: "/admin/waiting", label: "관리자 대기", icon: Clock3, count: waiting },
      ],
    },
    {
      title: "처리",
      items: [
        { href: "/admin/members", label: "가입 승인", icon: ClipboardCheck, count: pendingMembers },
        { href: "/admin/deposits", label: "입금 확인", icon: Wallet, count: pendingDeposits },
        { href: "/admin/defects", label: "불량 처리 승인", icon: FileWarning, count: pendingDefects },
      ],
    },
    {
      title: "회원",
      items: [
        { href: "/admin/advertisers", label: "광고주", icon: Users },
        { href: "/admin/partners", label: "영업자·인센티브", icon: Briefcase },
        { href: "/admin/groups", label: "그룹 순번", icon: Layers },
      ],
    },
    {
      title: "설정",
      items: [
        { href: "/admin/settings", label: "배정 설정", icon: Settings },
        { href: "/admin/integrations", label: "외부 연동·알림톡", icon: Plug },
        ...(admin.master ? [{ href: "/admin/accounts", label: "계정 관리", icon: KeyRound }] : []),
      ],
    },
    {
      title: "보안",
      items: [
        { href: "/admin/alerts", label: "알림", icon: Bell, count: alerts.length },
        ...(admin.master ? [{ href: "/admin/logs", label: "보안 기록", icon: ScrollText }] : []),
      ],
    },
  ];
  const flat = groups.flatMap((g) => g.items);

  return (
    <div className="min-h-screen bg-page">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-line px-5">
          <Logo />
          <span className="rounded-md bg-soft px-1.5 py-0.5 text-[11px] font-semibold text-sub">관리자</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g.title} className="mb-5">
              <p className="mb-1 px-2 text-[11px] font-semibold text-mute">{g.title}</p>
              {g.items.map((it) => {
                const on = isActive(path, it.href, "/admin");
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cx(
                      "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium",
                      on ? "bg-soft text-ink font-semibold" : "text-sub hover:bg-page",
                    )}
                  >
                    <it.icon size={17} className={on ? "text-ink" : "text-mute"} />
                    <span className="flex-1">{it.label}</span>
                    {!!it.count && (
                      <span className="tabular min-w-5 rounded-full bg-bad px-1.5 text-center text-[11px] font-bold leading-5 text-white">{it.count}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-line px-5 py-3 text-xs text-mute">
          {admin.master && <span className="mr-1 inline-flex items-center gap-0.5 font-semibold text-sub"><ShieldCheck size={13} /> 마스터</span>}
          {admin.name}
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-line bg-white">
          <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="flex items-center gap-2 lg:hidden">
              <Logo />
            </div>
            <div className="hidden items-center gap-4 text-sm text-sub lg:flex">
              <span className="flex items-center gap-1.5">
                <ClipboardCheck size={16} className="text-mute" />
                {waiting + pendingMembers + pendingDeposits + pendingDefects > 0
                  ? `처리할 일 ${waiting + pendingMembers + pendingDeposits + pendingDefects}건`
                  : "처리할 일이 없습니다"}
              </span>
              <Link href="/admin/alerts" className={cx("flex items-center gap-1.5", alerts.length ? "font-semibold text-bad" : "")}>
                <Bell size={16} className={alerts.length ? "text-bad" : "text-mute"} />
                {alerts.length ? `새 알림 ${alerts.length}건` : "새 알림 없음"}
              </Link>
            </div>
            <UserMenu name={admin.name} />
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {flat.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={cx(
                  "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold",
                  isActive(path, it.href, "/admin") ? "bg-ink text-white" : "bg-soft text-sub",
                )}
              >
                {it.label}
                {!!it.count && ` ${it.count}`}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          {alerts.length > 0 && path !== "/admin/alerts" && (
            <Link
              href="/admin/alerts"
              className={cx(
                "mb-4 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm",
                alerts.some((a) => a.level === "error") ? "border-bad/30 bg-bad-soft text-bad" : "border-warn/30 bg-warn-soft text-warn",
              )}
            >
              <Bell size={16} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                <b>{alerts[0].source}</b> · {alerts[0].message}
              </span>
              <span className="shrink-0 font-semibold">{alerts.length > 1 ? `외 ${alerts.length - 1}건 ` : ""}확인하기 →</span>
            </Link>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
