# Google Apps Script 업데이트 가이드 (v2.2 - 인원 카운트 수정)

신청 인원이 0명으로 뜨는 문제를 해결하기 위해, 과정명 비교 로직을 강화했습니다 (공백 제거 등).
아래 코드로 스크립트를 **덮어쓰기** 하고 다시 **배포**해 주세요.

```javascript
/*
  DCCI 교육센터 - 통합 스크립트 v2.2 (인원 카운트 상세 수정)
*/

const ADMIN_PASSWORD = "dccitpt3102"; // ★ 비밀번호 확인

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("COURSE_LIST");
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: "COURSE_LIST 시트가 없습니다." }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  
  let courses = {};
  
  // 1. 과정 목록 로드
  rows.forEach(row => {
    // ID(A열)가 있는 경우만 로드
    if(row[0]) { 
      
      // 날짜/시간 병합 처리
      let dateStr = row[4]; // E열
      if (!dateStr || dateStr === "") { dateStr = row[3]; } // D열 fallback
      
      if (Object.prototype.toString.call(dateStr) === '[object Date]') {
         const year = dateStr.getFullYear();
         const month = dateStr.getMonth() + 1;
         const day = dateStr.getDate();
         dateStr = `${year}. ${month}. ${day}`;
      }

      courses[row[0]] = {
        id: row[0],
        category: row[1],
        title: String(row[2]).trim(), // ★ 공백 제거 후 저장
        date: dateStr,
        place: row[5],
        target: row[6],
        goal: row[7],
        content: row[8] || "",
        instructor: row[9] || "",
        contact: row[10] || "",
        paymentInfo: row[11] || "",
        otherInfo: row[12] || "",
        capacity: row[13] || 0,
        deadline: row[14] || "",
        current: 0 
      };
    }
  });
  
  // 2. 신청 인원 집계 (APPLICATION_LIST 확인)
  const appSheet = ss.getSheetByName("APPLICATION_LIST");
  if(appSheet) {
    const appData = appSheet.getRange(2, 1, appSheet.getLastRow(), appSheet.getLastColumn()).getValues(); // 빈 행 방지
    // 혹은 간단히: const appData = appSheet.getDataRange().getValues().slice(1); 
    
    appData.forEach(row => {
      // B열(인덱스 1)이 과정명이라고 가정
      // 값이 비어있지 않은 경우만 체크
      if(row[1]) {
        const appliedCourseTitle = String(row[1]).trim(); // ★ 공백 제거 후 비교
        
        for (const id in courses) {
          if (courses[id].title === appliedCourseTitle) {
            courses[id].current = (courses[id].current || 0) + 1;
            break; 
          }
        }
      }
    });
  }

  return ContentService.createTextOutput(JSON.stringify(courses))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const params = e.parameter;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. 교육 과정 등록
    if (params.action === "add_course") {
      if (params.password !== ADMIN_PASSWORD) return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: "비밀번호 불일치" })).setMimeType(ContentService.MimeType.JSON);

      let sheet = ss.getSheetByName("COURSE_LIST");
      if (!sheet) { sheet = ss.insertSheet("COURSE_LIST"); sheet.appendRow(["ID", "Category", "Title", "Date", "Time", "Place", "Target", "Goal", "Content", "Instructor", "Contact", "PaymentInfo", "OtherInfo", "Capacity", "Deadline"]); }

      const newId = "CID_" + new Date().getTime().toString().substr(5) + Math.floor(Math.random() * 100);

      sheet.appendRow([
        newId, params.category, params.title, "", params.date, params.place, params.target, params.goal, params.content, params.instructor, params.contact, params.paymentInfo, params.otherInfo, params.capacity, params.deadline
      ]);

      return ContentService.createTextOutput(JSON.stringify({ result: "success", id: newId })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. 교육 참가 신청 (수식이 미리 걸려있어도 빈 행 찾아 입력)
    else {
      let sheet = ss.getSheetByName("APPLICATION_LIST");
      if (!sheet) { sheet = ss.insertSheet("APPLICATION_LIST"); sheet.appendRow(["Timestamp", "Course", "BizName", "BizNo", "Dept", "Position", "Name", "Phone", "Email", "Privacy"]); }

      // A열(Timestamp) 기준으로 데이터가 있는 마지막 행 찾기
      // (appendRow는 수식이 있는 행을 데이터가 있는 것으로 간주하므로 사용하지 않음)
      const lastRow = sheet.getRange("A:A").getValues().filter(String).length; 
      const nextRow = lastRow + 1; // 다음 빈 행

      // A열~J열까지만 데이터 입력 (K, L열에 미리 적어둔 수식 보존)
      // Timestamp 포맷팅 (시간까지 나오도록 문자열로 변환)
      const now = new Date();
      const formattedDate = Utilities.formatDate(now, "GMT+9", "yyyy. M. d. HH:mm:ss");

      sheet.getRange(nextRow, 1, 1, 10).setValues([[ 
        formattedDate, 
        params.course, 
        params.bizName, 
        params.bizNo, 
        params.dept, 
        params.position, 
        params.name, 
        params.phone, 
        params.email, 
        params.privacy 
      ]]);

      return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```
