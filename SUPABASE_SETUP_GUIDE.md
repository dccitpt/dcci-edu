# 🚀 Supabase(슈파베이스) 설정 및 연동 가이드

구글 시트의 보안 문제를 해결하기 위해, 안전한 백엔드인 **Supabase**로 이전하는 단계별 가이드입니다.
이 과정을 따라 프로젝트를 생성하고, 발급받은 키를 코드에 입력하면 됩니다.

---

## 1단계: Supabase 프로젝트 생성

1. [Supabase 공식 홈페이지](https://supabase.com/)에 접속하여 가입 및 로그인합니다.
2. **"New Project"** 버튼을 클릭합니다.
3. 프로젝트 정보를 입력합니다:
   - **Name**: `DCCI_EDU` (원하는 이름)
   - **Database Password**: **강력한 비밀번호**를 설정하고 **반드시 기억해두세요.**
   - **Region**: `Seoul` (South Korea) 선택
4. **"Create new project"** 클릭 후, 프로젝트가 생성될 때까지(약 1~2분) 기다립니다.

---

## 2단계: 데이터베이스 테이블 생성 (Table Editor)

왼쪽 메뉴에서 **Table Editor** (아이콘: 표 모양)를 클릭하여 다음 2개의 테이블을 생성합니다.

### 1. `courses` 테이블 (교육 과정 정보)
> **중요:** RLS(Row Level Security)는 일단 체크된 상태(Enable)로 둡니다.

- **Create a new table** 클릭
- **Name**: `courses`
- **Description**: 교육 과정 목록
- **Columns (열) 설정**:
  - `id`: `uuid`, Primary Key (기본값 유지)
  - `created_at`: `timestamptz`, default `now()` (기본값 유지)
  - `category`: `text`
  - `title`: `text`
  - `date`: `text`
  - `place`: `text`
  - `capacity`: `int8` (또는 integer)
  - `deadline`: `date` (또는 text) — *날짜 계산을 위해 `date` 추천*
  - `target`: `text`
  - `goal`: `text`
  - `content`: `text` (Type을 text로 하고 'Define as Array' 체크 해제)
  - `instructor`: `text`
  - `contact`: `text`
  - `payment_info`: `text`
  - `other_info`: `text`
  - `current`: `int8` (Default Value: `0`) — *현재 신청 인원*

### 2. `applicants` 테이블 (신청자 명단)
- **Create a new table** 클릭
- **Name**: `applicants`
- **Description**: 교육 신청자 명단
- **Columns (열) 설정**:
  - `id`: `uuid`, Primary Key
  - `created_at`: `timestamptz`, default `now()`
  - `course_id`: `uuid` (Foreign Key 설정 필요)
    - 🔗 **Relation 설정법**: 오른쪽 쇠사슬 아이콘 클릭 → `courses` 테이블의 `id` 선택
  - `biz_name`: `text`
  - `biz_no`: `text`
  - `dept`: `text`
  - `position`: `text`
  - `name`: `text`
  - `phone`: `text`
  - `email`: `text`
  - `privacy_agreed`: `text` (또는 boolean)

---

## 3단계: 보안 규칙 (RLS Policies) 설정

데이터 보안의 핵심입니다. 왼쪽 메뉴에서 **Authentication** > **Policies** 선택.

### 1. `courses` 테이블 정책
- **Enable RLS**가 켜져 있는지 확인.
- **"New Policy"** 클릭 → **"For full customization"** 선택.

**정책 A: 누구나 교육 과정을 볼 수 있음 (Public Read)**
- **Policy Name**: `Enable read access for all users`
- **Allowed Operation**: `SELECT`
- **Target roles**: `anon`, `authenticated` (둘 다 체크)
- **USING expression**: `true`
- **Save Policy** 클릭.

**정책 B: 관리자만 과정을 등록/수정/삭제 가능 (Admin Write)**
- **New Policy** → **For full customization**
- **Policy Name**: `Enable write access for authenticated users only`
- **Allowed Operation**: `INSERT`, `UPDATE`, `DELETE` (모두 체크)
- **Target roles**: `authenticated` (로그인한 사람만)
- **USING expression**: `true`
- **Check expression**: `true`
- **Save Policy** 클릭.

### 2. `applicants` 테이블 정책
- **Enable RLS** 확인.

**정책 A: 누구나 신청서를 낼 수 있음 (Public Insert)**
- **Policy Name**: `Enable insert for all users`
- **Allowed Operation**: `INSERT`
- **Target roles**: `anon`, `authenticated`
- **WITH CHECK expression**: `true`
- **Save Policy** 클릭.

**정책 B: 관리자만 신청 명단을 볼 수 있음 (Admin Select)**
- **Policy Name**: `Enable read access for authenticated users only`
- **Allowed Operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**: `true`
- **Save Policy** 클릭.

---

## 4단계: 관리자 계정 생성

왼쪽 메뉴 **Authentication** > **Users** 클릭.
- **"Add User"** → **"Create New User"**
- **Email**: 로그인에 사용할 이메일 (예: `admin@dcci.co.kr`)
- **Password**: 사용할 비밀번호
- **Auto Confirm User**: 체크 (이메일 인증 없이 바로 사용)
- **Create User** 클릭.

---

## 5단계: API 키 값 복사 및 코드 적용

1. 왼쪽 메뉴 하단 **Settings (톱니바퀴)** > **API** 클릭.
2. **Project URL** 값을 복사합니다.
3. **Project API keys**의 `anon` `public` 값을 복사합니다.

### ⚙️ 코드 수정 방법
`index.html`과 `admin.html` 파일 상단에 있는 설정 영역에 위 값을 붙여넣으세요.

```javascript
// [Supabase 설정]
const SUPABASE_URL = "여기에 Project URL 붙여넣기";
const SUPABASE_KEY = "여기에 anon public 키 붙여넣기";
```

완료되면, 이제 구글 시트 없이 안전하게 로그인 기반으로 관리자 페이지를 운영할 수 있습니다! 🎉
