"use client";

// 비밀번호 변경 (내 계정) · 재설정 (관리자가 다른 계정)
import { useState } from "react";
import { MIN_PASSWORD } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { Button, Card, CardHeader, Field, Input, Modal } from "./ui";

export function MyPasswordCard() {
  const { changeMyPassword } = useStore();
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <CardHeader title="비밀번호 변경" desc={`새 비밀번호는 ${MIN_PASSWORD}자 이상으로 정해 주세요.`} />
      <form
        className="grid gap-3 p-5 sm:grid-cols-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (f.next.length < MIN_PASSWORD) return setMsg({ ok: false, text: `새 비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.` });
          if (f.next !== f.again) return setMsg({ ok: false, text: "새 비밀번호가 서로 다릅니다." });
          setBusy(true);
          const err = await changeMyPassword(f.current, f.next);
          setBusy(false);
          if (err) return setMsg({ ok: false, text: err });
          setF({ current: "", next: "", again: "" });
          setMsg({ ok: true, text: "비밀번호를 바꿨습니다. 다음 로그인부터 새 비밀번호를 쓰세요." });
        }}
      >
        <Field label="지금 비밀번호"><Input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
        <Field label="새 비밀번호"><Input type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
        <Field label="새 비밀번호 확인"><Input type="password" autoComplete="new-password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} /></Field>
        <div className="flex items-center justify-between gap-3 sm:col-span-3">
          <span className={`text-[13px] ${msg?.ok ? "text-brand" : "text-bad"}`}>{msg?.text}</span>
          <Button type="submit" disabled={busy || !f.current || !f.next}>{busy ? "바꾸는 중…" : "비밀번호 변경"}</Button>
        </div>
      </form>
    </Card>
  );
}

export function ResetPasswordButton({ kind, id, name }: { kind: "advertiser" | "partner" | "admin"; id: string; name: string }) {
  const { setPassword } = useStore();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setPw("");
    setError(null);
  };
  return (
    <>
      <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(true)}>비밀번호 재설정</Button>
      <Modal
        open={open}
        title={`${name} 비밀번호 재설정`}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={close}>취소</Button>
            <Button
              className="flex-1"
              onClick={() => {
                const err = setPassword(kind, id, pw);
                if (err) return setError(err);
                close();
              }}
            >
              재설정
            </Button>
          </>
        }
      >
        <Field label="새 비밀번호" hint={`${MIN_PASSWORD}자 이상. 본인에게 알려준 뒤 로그인해서 직접 바꾸도록 안내해 주세요.`}>
          <Input type="text" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        {error && <p className="mt-2 text-[13px] text-bad">{error}</p>}
      </Modal>
    </>
  );
}
