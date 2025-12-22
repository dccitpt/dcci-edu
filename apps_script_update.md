# Google Apps Script 업데이트 가이드 (v2.5 - J~M열 데이터 조회 및 Undefined 수정)

**목표**:
1. 관리자 페이지에서 **"undefined"**로 뜨는 문제를 해결합니다. (데이터가 비어있을 때 빈 문자열 처리)
2. 신청자 명단에서 **J열(개인정보), K열(회원구분), L열(회비납부), M열(의원구분)**까지 모두 불러옵니다.

### 1. 스크립트 수정 방법
1. 구글 스프레드시트 **[확장 프로그램] > [Apps Script]**
2. 기존 코드 **전체 삭제** 후 아래 코드로 **덮어쓰기**
3. **[저장]** 클릭

### 2. 배포 업데이트 (필수!)
**반드시 버전을 올려서 새로 배포해야 합니다.**
1. **[배포] > [새 배포]**
2. 설명: "J~M열 조회 추가"
3. **버전**: `새 버전` 선택
4. **[배포]** 클릭 -> **새로운 URL 복사**

---

### [복사할 코드 (v2.5)]

```javascript
/*
  DCCI 교육센터 - 통합 스크립트 v2.5
  - J~M열 (개인정보, 회원구분, 회비납부, 의원구분) 조회 추가
  - 데이터 필드 undefined/null 방지 (|| "" 처리)
*/

const ADMIN_PASSWORD = "dccitpt3102"; 

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("COURSE_LIST");
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: "COURSE_LIST 시트가 없습니다." })).setMimeType(ContentService.MimeType.JSON);
  }

  // 1. 과정 목록 로드
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  let courses = {};
  
  rows.forEach(row => {
    if(row[0]) { 
      let dateStr = row[4]; 
      if (!dateStr || dateStr === "") { dateStr = row[3]; } 
      
      if (Object.prototype.toString.call(dateStr) === '[object Date]') {
         const year = dateStr.getFullYear();
         const month = dateStr.getMonth() + 1;
         const day = dateStr.getDate();
         dateStr = `${year}. ${month}. ${day}`;
      }

      courses[row[0]] = {
        id: row[0],
        category: row[1] || "",
        title: String(row[2] || "").trim(),
        date: dateStr || "",
        place: row[5] || "",
        target: row[6] || "", // ★ undefined 방지
        goal: row[7] || "",   // ★ undefined 방지
        content: row[8] || "",
        instructor: row[9] || "",
        contact: row[10] || "",
        paymentInfo: row[11] || "",
        otherInfo: row[12] || "",
        capacity: row[13] || 0,
        deadline: row[14] || "",
        current: 0,
        applicants: []
      };
    }
  });
  
  // 2. 신청 인원 집계 및 명단 매핑 (J~M열 추가)
  const appSheet = ss.getSheetByName("APPLICATION_LIST");
  if(appSheet) {
    const appData = appSheet.getDataRange().getValues();
    if(appData.length > 1) {
       for(let i=1; i<appData.length; i++) {
         const row = appData[i];
         const appliedCourseTitle = String(row[1]).trim();
         
         for (const id in courses) {
           if (courses[id].title === appliedCourseTitle) {
             courses[id].current = (courses[id].current || 0) + 1;
             
             // ★ J(9), K(10), L(11), M(12) 열 데이터 매핑
             courses[id].applicants.push({
               timestamp: formatTimestamp(row[0]),
               bizName: row[2] || "",
               bizNo: row[3] || "",
               dept: row[4] || "",
               position: row[5] || "",
               name: row[6] || "",
               phone: row[7] || "",
               email: row[8] || "",
               privacy: row[9] || "",       // J열
               memberType: row[10] || "",  // K열
               feeStatus: row[11] || "",   // L열
               councilType: row[12] || ""  // M열
             });
             break; 
           }
         }
       }
    }
  }

  return ContentService.createTextOutput(JSON.stringify(courses)).setMimeType(ContentService.MimeType.JSON);
}

function formatTimestamp(ts) {
  if (!ts) return "";
  if (Object.prototype.toString.call(ts) === '[object Date]') {
    return Utilities.formatDate(ts, "GMT+9", "yyyy. MM. dd HH:mm:ss");
  }
  return String(ts);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const params = e.parameter;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. 등록
    if (params.action === "add_course") {
      if (params.password !== ADMIN_PASSWORD) return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: "비밀번호 불일치" })).setMimeType(ContentService.MimeType.JSON);
      let sheet = ss.getSheetByName("COURSE_LIST");
      if (!sheet) { sheet = ss.insertSheet("COURSE_LIST"); sheet.appendRow(["ID", "Category", "Title", "Date", "Time", "Place", "Target", "Goal", "Content", "Instructor", "Contact", "PaymentInfo", "OtherInfo", "Capacity", "Deadline"]); }
      const newId = "CID_" + new Date().getTime().toString().substr(5) + Math.floor(Math.random() * 100);
      sheet.appendRow([newId, params.category, params.title, "", params.date, params.place, params.target, params.goal, params.content, params.instructor, params.contact, params.paymentInfo, params.otherInfo, params.capacity, params.deadline]);
      return ContentService.createTextOutput(JSON.stringify({ result: "success", id: newId })).setMimeType(ContentService.MimeType.JSON);
    }
    // 2. 수정
    else if (params.action === "update_course") {
       if (params.password !== ADMIN_PASSWORD) return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: "비밀번호 불일치" })).setMimeType(ContentService.MimeType.JSON);
       const sheet = ss.getSheetByName("COURSE_LIST");
       const data = sheet.getDataRange().getValues();
       let rowIndex = -1;
       for(let i=1; i<data.length; i++) { if(data[i][0] == params.id) { rowIndex = i + 1; break; } }
       if(rowIndex === -1) return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: "해당 과정을 찾을 수 없습니다." })).setMimeType(ContentService.MimeType.JSON);
       
       sheet.getRange(rowIndex, 2, 1, 14).setValues([[params.category, params.title, "", params.date, params.place, params.target, params.goal, params.content, params.instructor, params.contact, params.paymentInfo, params.otherInfo, params.capacity, params.deadline]]);
       return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
    // 3. 삭제
    else if (params.action === "delete_course") {
       if (params.password !== ADMIN_PASSWORD) return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: "비밀번호 불일치" })).setMimeType(ContentService.MimeType.JSON);
       const sheet = ss.getSheetByName("COURSE_LIST");
       const data = sheet.getDataRange().getValues();
       let rowIndex = -1;
       for(let i=1; i<data.length; i++) { if(data[i][0] == params.id) { rowIndex = i + 1; break; } }
       if(rowIndex === -1) return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: "해당 과정을 찾을 수 없습니다." })).setMimeType(ContentService.MimeType.JSON);
       sheet.deleteRow(rowIndex);
       return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
    // 4. 신청
    else {
      let sheet = ss.getSheetByName("APPLICATION_LIST");
      if (!sheet) { sheet = ss.insertSheet("APPLICATION_LIST"); sheet.appendRow(["Timestamp", "Course", "BizName", "BizNo", "Dept", "Position", "Name", "Phone", "Email", "Privacy"]); }
      const lastRow = sheet.getRange("A:A").getValues().filter(String).length; 
      const nextRow = lastRow + 1;
      const now = new Date();
      const formattedDate = Utilities.formatDate(now, "GMT+9", "yyyy. M. d. HH:mm:ss");
      sheet.getRange(nextRow, 1, 1, 10).setValues([[formattedDate, params.course, params.bizName, params.bizNo, params.dept, params.position, params.name, params.phone, params.email, params.privacy]]);
      return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```
