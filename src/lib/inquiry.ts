// 챗봇 문의(고객센터 게시판 support_posts) 공용 모양과 판단. 브라우저와 서버가 함께 쓴다.

export interface Inquiry { id: number; at: string; title: string; body: string; reply: string | null; replyAt: string | null; seenAt: string | null }

/** 답이 있는데 아직 안 읽음. 읽은 뒤 관리자가 답을 고치면 다시 안 읽음이 된다. */
export const isUnread = (p: Inquiry) =>
  !!p.reply && !!p.replyAt && (!p.seenAt || new Date(p.seenAt) < new Date(p.replyAt));

/** 문의 제목: 질문 앞부분 40자 */
export const inquiryTitle = (body: string) => {
  const t = body.replace(/\s+/g, " ").trim();
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
};
