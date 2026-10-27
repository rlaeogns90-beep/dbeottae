"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { ResetPasswordButton } from "@/components/password";
import { useAdmin } from "@/components/shells";
import { Badge, Button, Card, CardHeader, ConfirmButton, Empty, Field, Input, Notice, PageHeader } from "@/components/ui";
import { formatPhone, fullDate } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function AccountsPage() {
  const me = useAdmin()!;
  const { state, createAdmin, deleteAdmin, createPartner } = useStore();
  const [f, setF] = useState({ loginId: "", password: "", name: "" });
  const [p, setP] = useState({ loginId: "", password: "", name: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [pError, setPError] = useState<string | null>(null);

  if (!me.master) return <Card><Empty title="마스터 계정만 볼 수 있는 화면입니다" /></Card>;

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="계정 관리" desc="영업자와 관리자 계정은 마스터 계정에서만 만들 수 있습니다. 만든 계정은 바로 로그인할 수 있습니다." />

      <Card>
        <CardHeader title="영업자 계정 만들기" desc="아이디가 그대로 추천인 아이디가 됩니다" />
        <form
          className="grid gap-3 p-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!p.loginId || !p.password || !p.name || !p.phone) return setPError("모든 항목을 입력해 주세요.");
            const err = createPartner(p);
            if (err) return setPError(err);
            setP({ loginId: "", password: "", name: "", phone: "" });
            setPError(null);
          }}
        >
          <Field label="이름"><Input id="pt-name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="연락처"><Input id="pt-phone" inputMode="numeric" value={p.phone} onChange={(e) => setP({ ...p, phone: formatPhone(e.target.value) })} /></Field>
          <Field label="아이디 (추천인 아이디)"><Input id="pt-id" value={p.loginId} onChange={(e) => setP({ ...p, loginId: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })} /></Field>
          <Field label="비밀번호 (4자 이상)"><Input id="pt-pw" type="password" value={p.password} onChange={(e) => setP({ ...p, password: e.target.value })} /></Field>
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <span className="text-[13px] text-bad">{pError}</span>
            <Button type="submit">영업자 계정 만들기</Button>
          </div>
        </form>
        <ul className="divide-y divide-line border-t border-line">
          {state.partners.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-semibold">{x.name} <Badge>{x.code}</Badge></p>
                <p className="text-xs text-mute">{x.loginId} · {x.phone} · {fullDate(x.createdAt)} 생성</p>
              </div>
              <div className="flex items-center gap-2">
                {x.status === "suspended" && <Badge tone="red">정지</Badge>}
                <ResetPasswordButton kind="partner" id={x.id} name={x.name} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="관리자 계정 만들기" desc="관리자 계정은 모든 메뉴 권한을 가집니다" />
        <form
          className="grid gap-3 p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.loginId || !f.password || !f.name) return setError("모든 항목을 입력해 주세요.");
            const err = createAdmin(f.loginId, f.password, f.name);
            if (err) return setError(err);
            setF({ loginId: "", password: "", name: "" });
            setError(null);
          }}
        >
          <Field label="이름"><Input id="ad-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="아이디"><Input id="ad-id" value={f.loginId} onChange={(e) => setF({ ...f, loginId: e.target.value })} /></Field>
          <Field label="비밀번호 (4자 이상)"><Input id="ad-pw" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <Button type="submit" className="h-11">만들기</Button>
        </form>
        {error && <p className="px-5 pb-4 text-[13px] text-bad">{error}</p>}
        <ul className="divide-y divide-line border-t border-line">
          {state.admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {a.name}
                  {a.master && <span className="inline-flex items-center gap-0.5 text-xs text-brand"><ShieldCheck size={13} /> 마스터</span>}
                </p>
                <p className="text-xs text-mute">{a.loginId} · {fullDate(a.createdAt)} 생성</p>
              </div>
              <div className="flex items-center gap-2">
                {a.id !== me.id && <ResetPasswordButton kind="admin" id={a.id} name={a.name} />}
                {!a.master && <ConfirmButton variant="danger" size="sm" confirmLabel="한 번 더 누르면 삭제" onConfirm={() => deleteAdmin(a.id)}>삭제</ConfirmButton>}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Notice>2단계 인증이 없으므로 관리자 로그인 기록(시각, IP)을 남겨 관리합니다.</Notice>
    </div>
  );
}
