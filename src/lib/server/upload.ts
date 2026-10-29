// 올린 파일 검사: 크기와 실제 내용(앞부분 바이트)으로 PDF·PNG·JPG만 받는다. 이름에 붙은 확장자는 믿지 않는다.
import "server-only";

export const MAX_UPLOAD = 4 * 1024 * 1024; // Vercel 요청 본문 한도(4.5MB)보다 작게
const TYPES: { mime: string; ok: (b: Uint8Array) => boolean }[] = [
  { mime: "application/pdf", ok: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { mime: "image/png", ok: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", ok: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
];

export type Upload = { name: string; mime: string; size: number; b64: string };

/** 검사를 통과하면 저장할 값, 아니면 오류 문장 */
export async function readUpload(file: File, fallbackName: string): Promise<Upload | string> {
  if (file.size === 0) return "빈 파일입니다.";
  if (file.size > MAX_UPLOAD) return "파일은 4MB까지 첨부할 수 있습니다.";
  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = TYPES.find((t) => t.ok(buf));
  if (!kind) return "PDF, PNG, JPG 파일만 첨부할 수 있습니다.";
  const name = file.name.replace(/[\/:*?"<>|\r\n]/g, "_").slice(0, 100) || fallbackName;
  return { name, mime: kind.mime, size: file.size, b64: Buffer.from(buf).toString("base64") };
}

/** 파일 응답. 사진은 브라우저에서 바로 보이게, PDF는 내려받게 한다 (격리된 창에서는 PDF 뷰어가 안 열려서). */
export const fileResponse = (f: { name: string; mime: string; b64: string }, inlineImages = false) =>
  new Response(Buffer.from(f.b64, "base64"), {
    headers: {
      "content-type": f.mime,
      "content-disposition": `${inlineImages && f.mime.startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "cache-control": "private, no-store",
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
