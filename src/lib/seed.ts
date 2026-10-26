// 예시 데이터. 서버 DB가 비어 있을 때 한 번 넣는다 (연결 키는 서버에서 새로 만든다).
import type { Advertiser, Assignment, DefectReport, DepositRequest, Lead, State, WalletTx } from "./types";

export const STATE_VERSION = 7;

export function seed(now = Date.now()): State {
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  const DAY = 60 * 24;

  const advertisers: Advertiser[] = [
    {
      id: "adv1", loginId: "kim01", password: "1234", name: "김민준", phone: "010-2345-1101",
      company: "현대 강남지점", referrer: "SALES01", receiptType: "tax",
      tax: { bizFileName: "사업자등록증_김민준.pdf", email: "minjun@example.com" },
      status: "approved", receiving: true, lastAssignedAt: ago(12), createdAt: ago(DAY * 50),
    },
    {
      id: "adv2", loginId: "lee02", password: "1234", name: "이서연", phone: "010-3456-2202",
      referrer: "SALES01", receiptType: "cash",
      cash: { name: "이서연", phone: "010-3456-2202" },
      status: "approved", receiving: true, lastAssignedAt: ago(95), createdAt: ago(DAY * 45),
    },
    {
      id: "adv3", loginId: "park03", password: "1234", name: "박도윤", phone: "010-4567-3303",
      company: "기아 분당대리점", referrer: "SALES02", receiptType: "tax",
      tax: { bizFileName: "사업자등록증_박도윤.jpg", email: "doyun@example.com" },
      status: "approved", receiving: false, offAt: ago(60 * 5), offBy: "self",
      lastAssignedAt: ago(60 * 26), createdAt: ago(DAY * 40),
    },
    {
      id: "adv4", loginId: "choi04", password: "1234", name: "최지우", phone: "010-5678-4404",
      referrer: "SALES02", receiptType: "cash",
      cash: { name: "최지우", phone: "010-5678-4404" },
      status: "approved", receiving: false, offAt: ago(30), offBy: "auto",
      lastAssignedAt: ago(30), createdAt: ago(DAY * 6),
    },
    {
      id: "adv5", loginId: "jung05", password: "1234", name: "정하은", phone: "010-6789-5505",
      company: "벤츠 한성모터스", referrer: "SALES01", receiptType: "tax",
      tax: { bizFileName: "사업자등록증_정하은.pdf", email: "haeun@example.com" },
      status: "pending", receiving: false, createdAt: ago(50),
    },
  ];

  const lead = (id: string, name: string, phone: string, car: string, months: number, min: number, status: Lead["status"], extra: Partial<Lead> = {}): Lead => ({
    id, name, phone, car, months, brand: car.split(" ")[0], createdAt: ago(min), status,
    site: "메타", pageName: "장기렌트 특가", term: "신차_특가_01", ...extra,
  });

  const leads: Lead[] = [
    lead("ld1", "홍길동", "010-1111-2222", "현대 그랜저", 48, 12, "assigned", { region: "서울 강남구", buyType: "장기렌트" }),
    lead("ld2", "강수민", "010-2222-3333", "기아 쏘렌토", 60, 40, "assigned", { region: "경기 성남시", buyType: "리스", site: "인스타그램", pageName: "신차 즉시출고", term: "즉시출고_영상_02", memo: "오후 6시 이후 통화 희망" }),
    lead("ld3", "윤재희", "010-3333-4444", "제네시스 GV70", 36, 95, "assigned", { region: "서울 송파구" }),
    lead("ld4", "임하준", "010-4444-5555", "기아 카니발", 60, 30, "assigned", { region: "경기 수원시", buyType: "장기렌트" }),
    lead("ld5", "오세린", "010-5555-6666", "현대 싼타페", 48, 60 * 3 + 20, "assigned", { region: "인천 연수구" }),
    lead("ld6", "한지민", "010-6666-7777", "BMW 520i", 36, 60 * 26, "assigned", { region: "서울 서초구", buyType: "리스" }),
    lead("ld7", "서준호", "010-7777-8888", "현대 아반떼", 48, 8, "waiting", { waitReason: "하루 한도 초과", region: "대전 유성구" }),
    lead("ld8", "문가은", "010-8888-9999", "기아 EV6", 60, 3, "waiting", { waitReason: "배정 가능한 광고주 없음", site: "페이스북", pageName: "전기차 장기렌트", term: "EV_혜택_03" }),
    lead("ld9", "배유진", "010-9999-0000", "현대 투싼", 48, 60 * 2, "assigned", { region: "부산 해운대구" }),
    // 지난달 배정분 (영업자 월별 실적 예시)
    lead("ld10", "구나연", "010-1212-3434", "현대 쏘나타", 48, DAY * 33, "assigned", { region: "서울 마포구" }),
    lead("ld11", "남궁현", "010-2323-4545", "기아 K5", 36, DAY * 34, "assigned", { region: "서울 은평구" }),
    lead("ld12", "도하람", "010-3434-5656", "제네시스 G80", 60, DAY * 36, "assigned", { region: "경기 고양시" }),
    lead("ld13", "류지호", "010-4545-6767", "기아 셀토스", 48, DAY * 37, "assigned", { region: "경기 분당구" }),
    lead("ld14", "맹소율", "010-5656-7878", "현대 코나", 36, DAY * 38, "assigned", { region: "서울 강동구" }),
  ];

  const as = (id: string, leadId: string, advertiserId: string, min: number, consult: Assignment["consult"] = "대기", memo = ""): Assignment => ({
    id, leadId, advertiserId, assignedAt: ago(min), method: "auto", amount: 44000, consult, memo,
  });

  const assignments: Assignment[] = [
    as("as1", "ld1", "adv1", 12),
    as("as2", "ld2", "adv1", 40, "관리", "오후 6시 이후 재연락 요청"),
    as("as3", "ld3", "adv2", 95, "견적발송", "GV70 2.5T 견적 발송"),
    as("as4", "ld4", "adv4", 30),
    as("as5", "ld5", "adv2", 60 * 3 + 20, "관리"),
    as("as6", "ld6", "adv3", 60 * 26, "계약", "11월 출고 예정"),
    as("as7", "ld9", "adv1", 60 * 2, "관리"),
    as("as10", "ld10", "adv1", DAY * 33, "계약", "9월 출고 완료"),
    as("as11", "ld11", "adv1", DAY * 34, "관리"),
    as("as12", "ld12", "adv2", DAY * 36, "견적발송"),
    as("as13", "ld13", "adv3", DAY * 37, "계약"),
    as("as14", "ld14", "adv2", DAY * 38, "관리"),
  ];

  const tx = (id: string, advertiserId: string, type: WalletTx["type"], amount: number, min: number, note: string, depositId?: string): WalletTx => ({
    id, advertiserId, type, amount, at: ago(min), note, depositId,
  });

  const wallet: WalletTx[] = [
    tx("t1", "adv1", "charge", 880000, DAY * 3, "예치금 충전", "dp0"),
    tx("t2", "adv1", "debit", -44000, 60 * 2, "DB 배정 · 배유진 현대 투싼"),
    tx("t3", "adv1", "debit", -44000, 40, "DB 배정 · 강수민 기아 쏘렌토"),
    tx("t4", "adv1", "debit", -44000, 12, "DB 배정 · 홍길동 현대 그랜저"),
    tx("t5", "adv2", "charge", 440000, DAY * 2, "예치금 충전"),
    tx("t6", "adv2", "debit", -44000, 60 * 3 + 20, "DB 배정 · 오세린 현대 싼타페"),
    tx("t7", "adv2", "debit", -44000, 95, "DB 배정 · 윤재희 제네시스 GV70"),
    tx("t8", "adv3", "charge", 440000, DAY * 5, "예치금 충전"),
    tx("t9", "adv3", "debit", -44000, 60 * 26, "DB 배정 · 한지민 BMW 520i"),
    tx("t10", "adv4", "charge", 440000, DAY * 4, "예치금 충전"),
    tx("t11", "adv4", "debit", -396000, DAY, "DB 배정 9건"),
    tx("t12", "adv4", "debit", -44000, 30, "DB 배정 · 임하준 기아 카니발"),
    // 지난달 충전과 배정 (충전액만큼 모두 사용)
    tx("t20", "adv1", "charge", 88000, DAY * 35, "예치금 충전"),
    tx("t21", "adv1", "debit", -44000, DAY * 34, "DB 배정 · 남궁현 기아 K5"),
    tx("t22", "adv1", "debit", -44000, DAY * 33, "DB 배정 · 구나연 현대 쏘나타"),
    tx("t23", "adv2", "charge", 88000, DAY * 39, "예치금 충전"),
    tx("t24", "adv2", "debit", -44000, DAY * 38, "DB 배정 · 맹소율 현대 코나"),
    tx("t25", "adv2", "debit", -44000, DAY * 36, "DB 배정 · 도하람 제네시스 G80"),
    tx("t26", "adv3", "charge", 44000, DAY * 38, "예치금 충전"),
    tx("t27", "adv3", "debit", -44000, DAY * 37, "DB 배정 · 류지호 기아 셀토스"),
  ];

  const deposits: DepositRequest[] = [
    { id: "dp1", advertiserId: "adv4", amount: 440000, depositor: "최지우", at: ago(20), status: "pending" },
    { id: "dp0", advertiserId: "adv1", amount: 880000, depositor: "김민준", at: ago(DAY * 3 + 30), status: "approved", handledAt: ago(DAY * 3), receipt: { status: "issued", issuedAt: ago(DAY * 2) } },
  ];

  const defects: DefectReport[] = [
    { id: "df1", assignmentId: "as7", reason: "결번", fileName: "통화녹음_배유진.m4a", at: ago(60 * 2 - 25), status: "pending" },
  ];

  return {
    version: STATE_VERSION,
    advertisers,
    partners: [
      { id: "pt1", loginId: "sales01", password: "1234", name: "김영업", phone: "010-1200-0001", code: "SALES01", status: "approved", createdAt: ago(DAY * 60) },
      { id: "pt2", loginId: "sales02", password: "1234", name: "박영업", phone: "010-1200-0002", code: "SALES02", status: "approved", createdAt: ago(DAY * 55) },
    ],
    admins: [
      { id: "ad1", loginId: "master", password: "1234", name: "마스터", master: true, createdAt: ago(DAY * 70) },
      { id: "ad2", loginId: "support1", password: "1234", name: "지원팀 1", master: false, createdAt: ago(DAY * 10) },
    ],
    leads,
    assignments,
    wallet,
    deposits,
    defects,
    groups: [
      { id: "g1", advertiserId: "adv1" },
      { id: "g2", advertiserId: "adv2" },
      { id: "g3", advertiserId: "adv3" },
      { id: "g4", advertiserId: "adv4" },
      { id: "g5", advertiserId: "adv5" },
      { id: "g6" },
    ],
    settings: {
      price: 44000,
      minCharge: 440000,
      dailyLimit: 3,
      offLockHours: 24,
      weekendStop: true,
      paused: false,
      incentivePerDb: 11000,
      bankAccount: { bank: "신한은행", number: "110-485-219078", holder: "마케팅을다루다" },
      lastGroupId: "g1",
      solapi: { apiKey: "", channel: "마케팅을다루다", pfId: "KA01PF231027070112916rZ1c03DoQgk", sender: "1600-7628" },
      connections: [
        { id: "cn0", name: "제피어 · 메타 잠재고객", type: "landing", key: "lk_seed0000", active: true },
        { id: "cn1", name: "장기렌트 견적 사이트", type: "landing", key: "lk_7f3a9c21", active: true },
        { id: "cn2", name: "리스 비교 사이트", type: "landing", key: "lk_b81d04e6", active: true },
        { id: "cn3", name: "외부 관리자 어드민", type: "admin", key: "ak_52ce19f0", active: true },
      ],
    },
  };
}
