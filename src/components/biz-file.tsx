"use client";

// 광고주 사업자등록증: 가입 화면의 사진 줄이기, 관리자 화면의 보기 버튼과 올리기 버튼.
import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Advertiser } from "@/lib/types";
import { Button, Modal } from "./ui";

const LIMIT = 4 * 1024 * 1024;
const MAX_SIDE = 2400;

/** 휴대폰 사진은 4MB를 넘기 쉬워서, 크거나 PNG·JPG가 아닌 사진은 JPG로 줄인다. 줄이지 못하면 원래 파일을 그대로 돌려준다. */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if ((file.type === "image/jpeg" || file.type === "image/png") && file.size <= 1.5 * 1024 * 1024) return file;
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "사업자등록증"}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** 고른 파일을 줄이고 크기를 확인한다. 문제가 있으면 오류 문장 */
export async function prepareBizFile(file: File): Promise<File | string> {
  const out = await shrinkImage(file);
  return out.size > LIMIT ? "파일은 4MB까지 올릴 수 있습니다. 사진으로 찍어 올리거나 더 작은 파일을 골라 주세요." : out;
}

const url = (id: string) => `/api/biz-file?advertiser=${encodeURIComponent(id)}`;
const isPdf = (name?: string) => /\.pdf$/i.test(name ?? "");

/** 관리자 목록용 "등록증" 버튼. 사진은 창 안에서 바로 보이고 PDF는 내려받는다. */
export function BizFileButton({ adv }: { adv: Advertiser }) {
  const [open, setOpen] = useState(false);
  if (adv.receiptType !== "tax") return <span className="text-xs text-mute">현금영수증</span>;
  if (!adv.tax?.file) return <span className="text-xs text-mute">파일 없음</span>;
  if (isPdf(adv.tax.bizFileName))
    return <a href={url(adv.id)} className="text-[13px] font-semibold text-brand hover:underline">등록증 PDF</a>;
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>등록증 보기</Button>
      <Modal
        open={open}
        title={`${adv.name} 사업자등록증`}
        onClose={() => setOpen(false)}
        footer={
          <>
            <a href={url(adv.id)} target="_blank" rel="noreferrer" className="flex-1">
              <Button variant="secondary" className="w-full">새 창에서 크게 보기</Button>
            </a>
            <Button className="flex-1" onClick={() => setOpen(false)}>닫기</Button>
          </>
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 로그인한 관리자만 받는 비공개 파일이라 이미지 최적화를 거치지 않는다 */}
        <img src={url(adv.id)} alt={`${adv.name} 사업자등록증`} className="mx-auto max-h-[65vh] w-auto rounded-lg border border-line" />
        <p className="mt-2 text-center text-xs text-mute">{adv.tax.bizFileName}</p>
      </Modal>
    </>
  );
}

/** 관리자가 사업자등록증을 대신 올리거나 바꾸는 줄 (광고주 관리 창) */
export function BizFileUpload({ adv }: { adv: Advertiser }) {
  const { attachBizFile } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const ready = await prepareBizFile(file);
    const err = typeof ready === "string" ? ready : await attachBizFile(adv.id, ready);
    setBusy(false);
    setMsg(err ?? "올렸습니다.");
    if (input.current) input.current.value = "";
  };

  return (
    <section className="rounded-lg bg-page px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="font-semibold">사업자등록증</p>
          <p className="truncate text-xs text-mute">{adv.tax?.file ? adv.tax.bizFileName : "저장된 파일 없음"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {adv.tax?.file && <a href={url(adv.id)} target="_blank" rel="noreferrer" className="px-1 py-2 text-[13px] font-semibold text-brand hover:underline">보기</a>}
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "올리는 중" : adv.tax?.file ? "바꾸기" : "올리기"}
          </Button>
        </div>
      </div>
      {msg && <p className="mt-2 text-xs text-sub">{msg}</p>}
      <input ref={input} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </section>
  );
}
