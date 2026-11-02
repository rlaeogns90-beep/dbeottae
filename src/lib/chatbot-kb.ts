// 상담 챗봇의 답 찾기. 외부 AI 없이 정해 둔 답만 고른다. 판단 기준은 docs/chatbot-rules.md.
// 순서: 금지 질문 거르기 → 단어로 답 찾기 → 못 찾으면 사람에게 넘기기(화면에서 처리).
// 브라우저에서 돌고 서버로 아무것도 보내지 않는다. 테스트가 바로 묶을 수 있게 상대 경로로 가져온다.
import { faqs, industryOptions, minChargeText } from "./content";

export type Mode = "main" | "advertiser";
export interface Topic { id: string; q: string; a: string; words: string[]; links?: [href: string, label: string][]; contact?: boolean }
export type Reply = { kind: "blocked" } | { kind: "topic"; topic: Topic } | { kind: "miss" };

export const REFUSAL = "그 내용은 안내해 드릴 수 없어요.";
export const MISS = "그 질문에는 바로 답을 드리기 어려워요.";

const won = (n: number) => n.toLocaleString("ko-KR");
const faq = (q: string) => {
  const hit = faqs.find(([k]) => k === q);
  if (!hit) throw new Error(`FAQ 없음: ${q}`);
  return hit[1];
};
const fromFaq = (id: string, q: string, words: string[]): Topic => ({ id, q, a: faq(q), words });

// words는 질문(소문자, 공백 하나로 정리)에 들어 있으면 이 답을 고르는 단어. 긴 단어일수록 점수가 높다.
const common: Topic[] = [
  fromFaq("about", "DB어때는 어떤 플랫폼인가요?", ["플랫폼", "무엇", "어떤 곳", "소개", "디비어때", "db어때", "뭐하는"]),
  fromFaq("source", "DB는 어디에서 수집되나요?", ["수집", "어디서 나", "출처", "진짜", "허위", "조작"]),
  fromFaq("price", "가격은 얼마인가요?", ["가격", "얼마", "비용", "단가", "금액", "요금", "건당", "최소 충전", "최소충전", "환불"]),
  fromFaq("speed", "DB는 얼마나 빨리 오나요?", ["빨리", "속도", "언제 와", "알림톡", "몇초", "몇 초", "실시간"]),
  fromFaq("onoff", "원할 때만 받을 수 있나요?", ["on", "off", "끄", "켜", "수신", "멈", "중지", "쉬"]),
  fromFaq("daily", "하루에 몇 건까지 받나요?", ["하루", "몇 건", "몇건", "한도", "최대"]),
  fromFaq("exclusive", "다른 사람도 같은 DB를 받나요?", ["중복", "다른 사람", "다른사람", "단독", "공유", "같은 db", "같은"]),
  fromFaq("defect", "어떤 DB가 불량으로 인정되나요?", ["불량", "결번", "환급", "없는 번호", "안 받", "안받"]),
  { ...fromFaq("signup", "어떻게 시작하나요?", ["시작", "가입", "추천인", "회원", "승인"]), links: [["/signup", "광고주 가입 신청"]] },
  {
    id: "industry",
    q: "어떤 업종 DB가 있나요?",
    a: `지금 받을 수 있는 업종은 ${industryOptions.filter((o) => o.live).map((o) => `${o.name}(건당 ${won(o.price ?? 0)}원)`).join(", ")}입니다. 모두 VAT 별도입니다. ${industryOptions.filter((o) => !o.live).map((o) => o.name).join(", ")}은 준비 중이며, 열리면 안내해 드립니다.`,
    words: ["업종", "종류", "오토바이", "중고차", "리스", "보험", "수출", "장기렌트", "렌트"],
  },
  {
    id: "contact",
    q: "상담원과 이야기하고 싶어요",
    a: "고객센터로 전화하시거나 카카오톡 채널로 남겨 주세요.",
    words: ["상담원", "사람이랑", "전화", "연락처", "문의", "직원", "담당"],
    contact: true,
  },
];

// 광고주 화면 전용 이용 안내. 근거: docs/claude-design-prompt.md 확정 정책, 예치금 화면 안내 문구.
const advertiserOnly: Topic[] = [
  {
    id: "charge",
    q: "충전은 어떻게 하나요?",
    a: `예치금 화면에 나온 계좌로 이체한 뒤, 충전 금액과 입금자명을 넣어 충전 신청을 해 주세요. 계좌이체만 가능합니다(카드 불가). 관리자가 입금을 확인하면 예치금에 반영됩니다. 최소 충전은 업종별 10건분(${minChargeText()}, VAT 포함)이며, 충전한 예치금은 환불되지 않습니다.`,
    words: ["충전", "입금", "계좌", "예치금", "이체", "넣"],
    links: [["/app/wallet", "예치금 화면으로"]],
  },
  {
    id: "receive-off",
    q: "수신이 왜 꺼졌나요?",
    a: "수신이 꺼지는 경우는 두 가지입니다. 직접 끈 경우에는 끈 뒤 24시간이 지나면 다시 켤 수 있습니다. 예치금을 다 쓰면 자동으로 꺼지며, 충전하면 다시 켤 수 있습니다. 수신이 켜져 있어도 하루 최대 3건을 받으면 그날은 DB가 더 오지 않습니다.",
    words: ["꺼졌", "꺼져", "왜 꺼", "안 와", "안와", "안 들어", "안들어", "왜 안", "자동 off"],
    links: [["/app", "홈에서 수신 상태 보기"]],
  },
  {
    id: "leads",
    q: "받은 DB는 어디서 보나요?",
    a: "받은 DB는 DB 관리 화면에서 볼 수 있습니다. 카카오 알림톡으로도 같은 내용이 갑니다.",
    words: ["받은 db", "받은 디비", "db 관리", "디비 관리", "db 어디", "고객 연락처", "고객 정보", "어디서 봐", "어디서 보"],
    links: [["/app/leads", "DB 관리 화면으로"]],
  },
  {
    id: "password",
    q: "비밀번호는 어떻게 바꾸나요?",
    a: "내 정보 화면에서 비밀번호를 바꿀 수 있습니다.",
    words: ["비밀번호", "비번", "패스워드", "내 정보", "연락처 변경", "정보 변경"],
    links: [["/app/me", "내 정보 화면으로"]],
  },
  {
    id: "ask-admin",
    q: "관리자에게 문의할래요",
    a: "아래 버튼으로 관리자에게 문의를 남겨 주세요. 답변은 이 창에서 확인할 수 있어요.",
    words: ["관리자", "문의 남", "답변", "1:1", "고객센터"],
  },
];

const withDefectLink = (t: Topic): Topic => (t.id === "defect" ? { ...t, links: [["/app/defects", "불량 처리 화면으로"]] } : t);

const byMode: Record<Mode, Topic[]> = {
  main: common,
  // 광고주 전용 안내가 앞에 있어 점수가 같으면 먼저 고른다.
  advertiser: [...advertiserOnly, ...common.filter((t) => t.id !== "signup").map(withDefectLink)],
};

export const topicsFor = (mode: Mode) => byMode[mode];

const quickIds: Record<Mode, string[]> = {
  main: ["price", "industry", "defect", "signup"],
  advertiser: ["charge", "receive-off", "defect", "ask-admin"],
};
export const quickTopics = (mode: Mode) => quickIds[mode].map((id) => byMode[mode].find((t) => t.id === id)!);

const norm = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

// 금지: 사이트 보안, 다른 광고주 정보, 고객 정보 (설계 문서 3.4). 이 검사가 답 찾기보다 먼저다.
const BLOCK: RegExp[] = [
  /(다른|타)\s*(광고주|업체|영업|회원)/,
  /광고주\s*(는|가|들|수)?\s*(몇|누구|명단|목록)/,
  /(누가|누구누구).{0,8}(받|광고)/,
  /(관리자|어드민|admin).{0,10}(페이지|주소|화면|로그인|계정|비번|비밀번호|아이디|url)/,
  /(서버|데이터베이스|database|해킹|api|토큰|소스 ?코드|키값|시스템 구조|보안)/,
];
const PERSON_NAME_ASK = /님도/;
const PERSON_NAME_VERB = /(받|가입|광고|써|쓰)/;
const CUSTOMER = /(고객|신청자|db|디비)/;
const CUSTOMER_INFO = /(번호|연락처|이름|명단|정보|주소)/;
const GIVE_ME = /(알려|보여|줘|뭐|뭔)/;
// 단독 여부 질문("다른 광고주도 같은 DB 받나요?")은 정책 안내라 거르지 않는다.
const EXCLUSIVE_ASK = /(같은|중복|단독)/;

export function isBlocked(text: string): boolean {
  const t = norm(text).replace(/(db|디비)\s*어때/g, "");
  if (EXCLUSIVE_ASK.test(t)) return false;
  if (BLOCK.some((r) => r.test(t))) return true;
  if (PERSON_NAME_ASK.test(t) && PERSON_NAME_VERB.test(t)) return true;
  return CUSTOMER.test(t) && CUSTOMER_INFO.test(t) && GIVE_ME.test(t);
}

export function answer(text: string, mode: Mode): Reply {
  if (isBlocked(text)) return { kind: "blocked" };
  const t = norm(text);
  let best: Topic | null = null;
  let score = 0;
  for (const tp of byMode[mode]) {
    const s = tp.words.reduce((n, w) => (t.includes(w) ? n + w.length : n), 0);
    if (s > score) [best, score] = [tp, s];
  }
  return best ? { kind: "topic", topic: best } : { kind: "miss" };
}
