// 회의 공유용 단일 페이지 진입점. Next.js의 화면 파일들을 그대로 가져와 메모리 라우터로 묶는다.
import { createRoot } from "react-dom/client";
import { AdminShell, AdvertiserShell, PartnerShell } from "@/components/shells";
import { StoreProvider } from "@/lib/store";
import { setParams, usePathname } from "./shims/navigation";

import Login from "@/app/login/page";
import Signup from "@/app/signup/page";
import AppHome from "@/app/app/page";
import AppLeads from "@/app/app/leads/page";
import AppLead from "@/app/app/leads/[id]/page";
import AppWallet from "@/app/app/wallet/page";
import AppDefects from "@/app/app/defects/page";
import AppMe from "@/app/app/me/page";
import PartnerHome from "@/app/partner/page";
import PartnerAdvertisers from "@/app/partner/advertisers/page";
import PartnerLeads from "@/app/partner/leads/page";
import AdminHome from "@/app/admin/page";
import AdminWaiting from "@/app/admin/waiting/page";
import AdminMembers from "@/app/admin/members/page";
import AdminDeposits from "@/app/admin/deposits/page";
import AdminDefects from "@/app/admin/defects/page";
import AdminAdvertisers from "@/app/admin/advertisers/page";
import AdminPartners from "@/app/admin/partners/page";
import AdminGroups from "@/app/admin/groups/page";
import AdminSettings from "@/app/admin/settings/page";
import AdminIntegrations from "@/app/admin/integrations/page";
import AdminAccounts from "@/app/admin/accounts/page";

type Shell = (p: { children: React.ReactNode }) => React.ReactNode;
const routes: [string, React.ComponentType, Shell?][] = [
  ["/login", Login],
  ["/signup", Signup],
  ["/app", AppHome, AdvertiserShell],
  ["/app/leads", AppLeads, AdvertiserShell],
  ["/app/leads/:id", AppLead, AdvertiserShell],
  ["/app/wallet", AppWallet, AdvertiserShell],
  ["/app/defects", AppDefects, AdvertiserShell],
  ["/app/me", AppMe, AdvertiserShell],
  ["/partner", PartnerHome, PartnerShell],
  ["/partner/advertisers", PartnerAdvertisers, PartnerShell],
  ["/partner/leads", PartnerLeads, PartnerShell],
  ["/admin", AdminHome, AdminShell],
  ["/admin/waiting", AdminWaiting, AdminShell],
  ["/admin/members", AdminMembers, AdminShell],
  ["/admin/deposits", AdminDeposits, AdminShell],
  ["/admin/defects", AdminDefects, AdminShell],
  ["/admin/advertisers", AdminAdvertisers, AdminShell],
  ["/admin/partners", AdminPartners, AdminShell],
  ["/admin/groups", AdminGroups, AdminShell],
  ["/admin/settings", AdminSettings, AdminShell],
  ["/admin/integrations", AdminIntegrations, AdminShell],
  ["/admin/accounts", AdminAccounts, AdminShell],
];

function match(path: string) {
  const parts = path.split("/").filter(Boolean);
  for (const [pattern, Comp, Shell] of routes) {
    const ps = pattern.split("/").filter(Boolean);
    if (ps.length !== parts.length) continue;
    const params: Record<string, string> = {};
    if (ps.every((p, i) => (p.startsWith(":") ? ((params[p.slice(1)] = parts[i]), true) : p === parts[i]))) {
      return { Comp, Shell, params };
    }
  }
  return { Comp: Login, Shell: undefined, params: {} };
}

function App() {
  const path = usePathname();
  const { Comp, Shell, params } = match(path);
  setParams(params);
  const page = <Comp key={path} />;
  return Shell ? <Shell>{page}</Shell> : page;
}

createRoot(document.getElementById("root")!).render(
  <StoreProvider>
    <App />
  </StoreProvider>,
);
