export type MemberStatus = "pending" | "approved" | "rejected" | "suspended";

export type ReceiptType = "tax" | "cash";

export interface Advertiser {
  id: string;
  loginId: string;
  password: string;
  name: string;
  /** DB와 알림톡을 받는 번호 (1개) */
  phone: string;
  company?: string;
  /** 영업자 추천 코드 */
  referrer: string;
  receiptType: ReceiptType;
  tax?: { bizFileName: string; email: string };
  /** 현금영수증 (휴대전화번호로 발급, 주민번호는 받지 않음) */
  cash?: { name: string; phone: string };
  status: MemberStatus;
  receiving: boolean;
  offAt?: string;
  offBy?: "self" | "auto" | "admin";
  lastAssignedAt?: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  loginId: string;
  password: string;
  name: string;
  phone: string;
  code: string;
  status: MemberStatus;
  createdAt: string;
}

export interface Admin {
  id: string;
  loginId: string;
  password: string;
  name: string;
  master: boolean;
  createdAt: string;
}

export type LeadStatus = "assigned" | "waiting" | "defect";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  car: string;
  /** 고객이 남긴 메모 (웹훅 car_memo) */
  memo?: string;
  months?: number;
  buyType?: string;
  region?: string;
  /** 매체 (웹훅 source) */
  site: string;
  /** 페이지명 (웹훅 page_name) */
  pageName?: string;
  /** 광고소재명 (웹훅 term) */
  term?: string;
  brand?: string;
  groupId?: string;
  createdAt: string;
  status: LeadStatus;
  waitReason?: string;
}

export type ConsultStatus = "대기" | "견적발송" | "계약" | "관리" | "계약취소";

export interface Assignment {
  id: string;
  leadId: string;
  advertiserId: string;
  assignedAt: string;
  method: "auto" | "admin" | "external";
  amount: number;
  consult: ConsultStatus;
  memo: string;
}

export type WalletType = "charge" | "debit" | "refund" | "adjust";

export interface WalletTx {
  id: string;
  advertiserId: string;
  type: WalletType;
  amount: number;
  at: string;
  note: string;
}

export interface DepositRequest {
  id: string;
  advertiserId: string;
  amount: number;
  depositor: string;
  at: string;
  status: "pending" | "approved" | "rejected";
  handledAt?: string;
}

/** 불량 인정 사유는 결번 하나뿐 */
export type DefectReason = "결번";

export interface DefectReport {
  id: string;
  assignmentId: string;
  reason: DefectReason;
  /** 통화 녹음 (선택) */
  fileName?: string;
  at: string;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  handledAt?: string;
}

/** 배정 순번 칸. 배열 순서가 곧 그룹 번호(1번부터)이고, 한 그룹에 광고주 1명만 들어간다. */
export interface Group {
  id: string;
  advertiserId?: string;
}

export interface Connection {
  id: string;
  name: string;
  type: "landing" | "admin";
  key: string;
  active: boolean;
}

export interface Settings {
  price: number;
  minCharge: number;
  dailyLimit: number;
  offLockHours: number;
  defectHours: number;
  weekendStop: boolean;
  paused: boolean;
  /** 영업자 수익: 추천 광고주의 DB 1건당 */
  incentivePerDb: number;
  bankAccount: { bank: string; number: string; holder: string };
  /** 마지막으로 자동 배정한 그룹. 다음 DB는 그다음 번호 그룹부터 찾는다. */
  lastGroupId?: string;
  solapi: { apiKey: string; channel: string; sender: string };
  connections: Connection[];
}

export interface Session {
  role: "advertiser" | "partner" | "admin";
  id: string;
  /** 서버가 발급한 로그인 토큰 */
  token?: string;
}

export interface State {
  version: number;
  advertisers: Advertiser[];
  partners: Partner[];
  admins: Admin[];
  leads: Lead[];
  assignments: Assignment[];
  wallet: WalletTx[];
  deposits: DepositRequest[];
  defects: DefectReport[];
  groups: Group[];
  settings: Settings;
}
