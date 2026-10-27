"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SiteFooter } from "@/components/contact";
import { Button, cx, Field, Input, Logo, Notice } from "@/components/ui";
import { formatPhone } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ReceiptType } from "@/lib/types";

export default function SignupPage() {
  const { signupAdvertiser } = useStore();
  const [f, setF] = useState(() => ({
    loginId: "", password: "", name: "", phone: "", company: "",
    referrer: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") ?? "" : "",
    receiptType: "tax" as ReceiptType,
    bizFileName: "", email: "",
    cashName: "", cashPhone: "",
    agreeTerms: false, agreePrivacy: false,
  }));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const need: [boolean, string][] = [
      [!f.loginId || !f.password, "아이디와 비밀번호를 입력해 주세요."],
      [f.password.length < 4, "비밀번호는 4자 이상이어야 합니다."],
      [/\s/.test(f.loginId), "아이디에는 공백을 넣을 수 없습니다."],
      [!f.name, "이름을 입력해 주세요."],
      [f.phone.replace(/\D/g, "").length < 10, "DB를 받을 연락처를 정확히 입력해 주세요."],
      [!f.referrer, "추천인 아이디는 필수입니다."],
      [f.receiptType === "tax" && (!f.bizFileName || !f.email), "사업자등록증과 계산서 받을 이메일을 입력해 주세요."],
      [f.receiptType === "cash" && (!f.cashName || !f.cashPhone), "현금영수증 정보를 모두 입력해 주세요."],
      [!f.agreeTerms || !f.agreePrivacy, "필수 약관에 동의해 주세요."],
    ];
    const miss = need.find(([bad]) => bad);
    if (miss) return setError(miss[1]);
    const err = await signupAdvertiser({
      loginId: f.loginId, password: f.password, name: f.name, phone: f.phone, company: f.company || undefined,
      referrer: f.referrer, receiptType: f.receiptType,
      tax: f.receiptType === "tax" ? { bizFileName: f.bizFileName, email: f.email } : undefined,
      cash: f.receiptType === "cash" ? { name: f.cashName, phone: f.cashPhone } : undefined,
    });
    if (err) return setError(err);
    setDone(true);
  };

  if (done)
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle2 size={48} className="mx-auto text-brand" />
          <h1 className="mt-4 text-xl font-bold">가입 신청이 접수됐습니다</h1>
          <p className="mt-2 text-sm leading-relaxed text-sub">
            관리자가 확인 후 승인하면 로그인할 수 있습니다.
            <br />
            문의: 1600-7628
          </p>
          <Link href="/">
            <Button size="lg" className="mt-8 w-full">로그인 화면으로</Button>
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <Link href="/" className="inline-block py-2"><Logo /></Link>
        <h1 className="mt-6 text-[22px] font-bold">광고주 가입 신청</h1>
        <p className="mt-1 text-sm text-sub">가입 후 관리자 승인이 끝나면 로그인할 수 있습니다.</p>

        <form onSubmit={submit} className="mt-8 space-y-8">
          <section className="space-y-4">
            <h2 className="text-[15px] font-bold">계정</h2>
            <Field label="아이디" required><Input value={f.loginId} onChange={set("loginId")} autoComplete="username" /></Field>
            <Field label="비밀번호 (4자 이상)" required><Input type="password" value={f.password} onChange={set("password")} autoComplete="new-password" /></Field>
          </section>

          <section className="space-y-4">
            <h2 className="text-[15px] font-bold">기본 정보</h2>
            <Field label="이름" required><Input value={f.name} onChange={set("name")} /></Field>
            <Field label="연락처" required hint="DB와 알림톡을 받을 번호입니다. 1개만 등록할 수 있습니다.">
              <Input inputMode="numeric" placeholder="010-0000-0000" value={f.phone} onChange={(e) => setF({ ...f, phone: formatPhone(e.target.value) })} />
            </Field>
            <Field label="회사명"><Input placeholder="예: 현대 강남지점" value={f.company} onChange={set("company")} /></Field>
            <Field label="추천인 아이디" required hint="담당 영업자에게 받은 추천인 아이디를 입력해 주세요.">
              <Input value={f.referrer} onChange={set("referrer")} className="uppercase" />
            </Field>
          </section>

          <section className="space-y-4">
            <h2 className="text-[15px] font-bold">증빙 정보</h2>
            <div className="grid grid-cols-2 gap-2">
              {([["tax", "세금계산서", "사업자"], ["cash", "현금영수증", "개인"]] as const).map(([k, label, sub]) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setF({ ...f, receiptType: k })}
                  className={cx(
                    "rounded-lg border px-4 py-3 text-left",
                    f.receiptType === k ? "border-brand bg-brand-soft" : "border-line hover:bg-page",
                  )}
                >
                  <p className={cx("text-sm font-semibold", f.receiptType === k ? "text-brand" : "text-ink")}>{label}</p>
                  <p className="text-xs text-mute">{sub}</p>
                </button>
              ))}
            </div>
            {f.receiptType === "tax" ? (
              <>
                <Field label="사업자등록증" required>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setF({ ...f, bizFileName: e.target.files?.[0]?.name ?? "" })}
                    className="block w-full text-sm text-sub file:mr-3 file:h-10 file:rounded-lg file:border file:border-line file:bg-white file:px-4 file:text-sm file:font-semibold file:text-ink hover:file:bg-soft"
                  />
                </Field>
                <Field label="계산서 받을 이메일" required><Input type="email" value={f.email} onChange={set("email")} /></Field>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="이름" required><Input value={f.cashName} onChange={set("cashName")} /></Field>
                  <Field label="휴대전화번호" required>
                    <Input inputMode="numeric" value={f.cashPhone} onChange={(e) => setF({ ...f, cashPhone: formatPhone(e.target.value) })} />
                  </Field>
                </div>
                <p className="text-[13px] text-mute">현금영수증은 휴대전화번호로 발급합니다.</p>
              </>
            )}
          </section>

          <section className="space-y-2.5">
            <label className="flex items-center gap-2.5 py-1.5 text-sm">
              <input type="checkbox" checked={f.agreeTerms} onChange={set("agreeTerms")} className="h-5 w-5 shrink-0 accent-[#2659d9]" />
              <span><span className="text-bad">[필수]</span> 이용약관 동의 (예치금 환불 불가 포함) <a href="/terms" target="_blank" rel="noreferrer" className="py-2 font-semibold text-brand underline underline-offset-2">보기</a></span>
            </label>
            <label className="flex items-center gap-2.5 py-1.5 text-sm">
              <input type="checkbox" checked={f.agreePrivacy} onChange={set("agreePrivacy")} className="h-5 w-5 shrink-0 accent-[#2659d9]" />
              <span><span className="text-bad">[필수]</span> 개인정보 수집·이용 동의 <a href="/privacy" target="_blank" rel="noreferrer" className="py-2 font-semibold text-brand underline underline-offset-2">보기</a></span>
            </label>
          </section>

          <Notice>가입 후에는 정보를 직접 수정할 수 없습니다. 변경이 필요하면 1600-7628로 요청해 주세요.</Notice>

          {error && <p className="text-[13px] text-bad">{error}</p>}
          <Button type="submit" size="lg" className="w-full">가입 신청</Button>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}
