"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" && "h-9 px-3 text-[13px]",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-[15px]",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-soft",
        variant === "ghost" && "text-sub hover:bg-soft",
        variant === "danger" && "border border-line bg-white text-bad hover:bg-bad-soft",
        className,
      )}
    />
  );
}

/** 브라우저 confirm 대신 두 번 눌러 확인하는 버튼 (4초 안에 다시 누르면 실행) */
export function ConfirmButton({ confirmLabel, onConfirm, children, ...props }: ButtonProps & { confirmLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      {...props}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx("rounded-xl border border-line bg-white", className)} />;
}

export function CardHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-[15px] font-bold">{title}</h2>
        {desc && <p className="mt-0.5 text-[13px] text-mute">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

const tones = {
  gray: "bg-soft text-sub",
  blue: "bg-brand-soft text-brand",
  green: "bg-ok-soft text-ok",
  orange: "bg-warn-soft text-warn",
  red: "bg-bad-soft text-bad",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return (
    <span className={cx("inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

export const inputCls =
  "h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px] outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-soft disabled:text-mute";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "pr-8", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[15px] outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/15",
        props.className,
      )}
    />
  );
}

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-sub">
        {label}
        {required && <span className="ml-0.5 text-bad">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cx(
        // 손가락으로 누르기 쉽게 보이는 크기보다 넓게 눌리도록 바깥 영역(after)을 둔다.
        "relative h-7 w-12 shrink-0 rounded-full transition-colors after:absolute after:-inset-2.5 after:content-[''] disabled:opacity-40",
        on ? "bg-brand" : "bg-[#d1d6db]",
      )}
    >
      <span className={cx("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 text-sm text-sub">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "brand" | "bad" }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-[13px] text-sub">{label}</p>
      <p className={cx("tabular mt-1 text-2xl font-bold", tone === "brand" && "text-brand", tone === "bad" && "text-bad")}>{value}</p>
      {sub && <p className="mt-1 text-xs text-mute">{sub}</p>}
    </Card>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export const th = "border-b border-line bg-page px-4 py-2.5 text-left text-xs font-semibold text-sub whitespace-nowrap";
export const td = "border-b border-line px-4 py-3 align-middle";

export function Empty({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <p className="text-[15px] font-semibold text-sub">{title}</p>
      {desc && <p className="mt-1 text-[13px] text-mute">{desc}</p>}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-[17px] font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-mute hover:bg-soft" aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Notice({ tone = "gray", children }: { tone?: "gray" | "blue" | "orange" | "red"; children: React.ReactNode }) {
  return (
    <div
      className={cx(
        "rounded-lg px-4 py-3 text-[13px] leading-relaxed",
        tone === "gray" && "bg-soft text-sub",
        tone === "blue" && "bg-brand-soft text-brand-dark",
        tone === "orange" && "bg-warn-soft text-warn",
        tone === "red" && "bg-bad-soft text-bad",
      )}
    >
      {children}
    </div>
  );
}

/** 사이트 로고. size는 글자 높이(px), tagline이면 아래 "영업사원을 위한 DB 오픈 마켓"까지 */
export function Logo({ size = 20, tagline }: { size?: number; tagline?: boolean }) {
  return tagline ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-tagline.png" alt="DB어때 · 영업사원을 위한 DB 오픈 마켓" width={1020} height={282} style={{ height: size * 1.6, width: "auto" }} className="block" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="DB어때" width={1016} height={177} style={{ height: size, width: "auto" }} className="block" />
  );
}

export { cx };
