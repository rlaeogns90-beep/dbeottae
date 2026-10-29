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
  /** 가입할 때 고른 업종 */
  industry?: string;
  /** 영업자 추천 코드 */
  referrer: string;
  receiptType: ReceiptType;
  /** 세금계산서. file이 있으면 사업자등록증 파일이 서버(biz_files)에 저장돼 있다 */
  tax?: { bizFileName: string; email: string; file?: { size: number; at: string } };
  /** 현금영수증 (휴대전화번호로 발급, 주민번호는 받지 않음) */
  cash?: { name: string; phone: string };
  status: MemberStatus;
  /** 로그인 토큰 버전: 비밀번호를 바꾸면 올라가서 기존 로그인이 끊긴다 */
  tv?: number;
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
  tv?: number;
  createdAt: string;
}

export interface Admin {
  id: string;
  loginId: string;
  password: string;
  name: string;
  master: boolean;
  tv?: number;
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
  /** 충전 건이면 어떤 입금 신청에서 생겼는지 (계산서 확인하기 연결용) */
  depositId?: string;
}

/** 입금 건의 세금계산서·현금영수증 발행 현황 */
export interface Receipt {
  /** 대기 → 발행완료 */
  status: "pending" | "issued";
  issuedAt?: string;
  /** 첨부한 발행 파일(PDF·이미지). 파일 본문은 별도 저장소에 있고 여기엔 이름·크기만 둔다. */
  file?: { name: string; size: number; at: string };
}

export interface DepositRequest {
  id: string;
  advertiserId: string;
  amount: number;
  depositor: string;
  at: string;
  status: "pending" | "approved" | "rejected";
  handledAt?: string;
  /** 입금 확인(approved) 후에만 생긴다. 없으면 발행 대기로 본다. */
  receipt?: Receipt;
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
  weekendStop: boolean;
  paused: boolean;
  /** 영업자 수익: 추천 광고주의 DB 1건당 */
  incentivePerDb: number;
  bankAccount: { bank: string; number: string; holder: string };
  /** 마지막으로 자동 배정한 그룹. 다음 DB는 그다음 번호 그룹부터 찾는다. */
  lastGroupId?: string;
  /**
   * 솔라피 알림톡 설정. API Key·Secret은 서버 환경변수(SOLAPI_API_KEY·SOLAPI_API_SECRET)에만 두고 여기에는 두지 않는다.
   * keyReady는 서버가 환경변수 유무를 알려주는 읽기 전용 값이다.
   */
  solapi: {
    channel: string;
    /** 솔라피에 연결된 카카오톡 채널의 발신 프로필 ID(PFID) */
    pfId: string;
    /** 알림톡 실패 시 문자로 보내는 발신번호 (솔라피에 등록된 번호) */
    sender: string;
    /** 문의 접수 알림톡 템플릿(직원용): 새 DB가 배정되면 해당 광고주에게 */
    templateInquiry: string;
    /** 통계 알림 템플릿(관리자용): 새 DB가 접수되면 관리자에게 */
    templateStats: string;
    /** 통계 알림을 받을 관리자 휴대폰 번호 */
    statsPhone: string;
    /** 알림톡 발송 전체 켜기·끄기 */
    enabled: boolean;
    /** 통계 알림만 따로 켜기·끄기 */
    statsEnabled: boolean;
    apiKey?: string;
    keyReady?: boolean;
  };
  connections: Connection[];
}

export interface Session {
  role: "advertiser" | "partner" | "admin";
  id: string;
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
  /** 화면에 보여도 되는 집계 (서버가 보낼 때만 채운다. 저장하지 않는다) */
  pub?: { signupsMonth: number };
}
