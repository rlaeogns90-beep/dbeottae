export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

const pad = (n: number) => String(n).padStart(2, "0");

export const dateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fullDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};

export const timeAgo = (iso: string, now: Date) => {
  const min = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
};

export const remaining = (until: Date, now: Date) => {
  const min = Math.ceil((until.getTime() - now.getTime()) / 60_000);
  if (min <= 0) return null;
  const h = Math.floor(min / 60);
  return h > 0 ? `${h}시간 ${min % 60}분` : `${min}분`;
};

export const maskName = (name: string) => (name.length <= 1 ? name : name[0] + "*".repeat(name.length - 1));

export const maskPhone = (phone: string) => phone.replace(/^(\d{3})-(\d{3,4})-(\d{4})$/, "$1-****-$3");

export const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
};

/** 실시간 현황용: 가운데 글자만 가린다 (김민준 → 김X준, 홍길 → 홍X) */
export const maskMiddle = (name: string) =>
  name.length <= 1 ? name : name.length === 2 ? `${name[0]}X` : `${name[0]}${"X".repeat(name.length - 2)}${name[name.length - 1]}`;
