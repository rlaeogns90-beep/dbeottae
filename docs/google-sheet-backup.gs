// DB어때 → 구글 시트 백업용 Apps Script
// 사용법: 시트 메뉴 [확장 프로그램 > Apps Script]에 이 코드를 붙여넣고,
// [프로젝트 설정 > 스크립트 속성]에 SECRET 이라는 이름으로 긴 비밀 문자열을 저장한 뒤
// [배포 > 새 배포 > 웹 앱] (실행: 나, 액세스: 모든 사용자)으로 배포한다.
// 나온 웹 앱 주소 = SHEET_WEBHOOK_URL, 비밀 문자열 = SHEET_SECRET (서버 환경변수)

const SHEET_NAME = "백업";
const HEADERS = ["날짜", "유입", "광고주명(배정)", "이름", "연락처", "접수번호"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty("SECRET");
    if (!secret || body.secret !== secret) return out_({ ok: false, error: "권한이 없습니다." });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.setFrozenRows(1);
      sh.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm");
      sh.getRange("E:E").setNumberFormat("@");
    }

    // 접수번호(F열)로 기존 줄 위치를 찾는다.
    const last = sh.getLastRow();
    const ids = last > 1 ? sh.getRange(2, 6, last - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
    const pos = {};
    ids.forEach(function (id, i) { pos[id] = i + 2; });

    const add = [];
    body.rows.forEach(function (r) {
      const line = [new Date(r.at), r.site, r.advertiser, r.name, r.phone, r.id];
      if (pos[r.id]) sh.getRange(pos[r.id], 1, 1, 6).setValues([line]);
      else add.push(line);
    });
    if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 6).setValues(add);
    return out_({ ok: true, added: add.length });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
