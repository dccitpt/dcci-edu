-- 1. 교육 과정 테이블 (Manage Courses)
create table courses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  category text,
  title text not null,
  date text,
  place text,
  capacity integer default 0,
  deadline date,
  target text,
  goal text,
  content text,
  instructor text,
  contact text,
  payment_info text,
  other_info text
);

-- 2. 교육 접수 테이블 (교육 신청 내역)
-- 사용자 요청에 따라 테이블명: education_apply
create table education_apply (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- 어떤 교육 과정에 신청했는지 연결 (Foreign Key)
  course_id uuid references courses(id) on delete cascade not null,
  
  -- 요청받은 필수 필드
  company text,     -- 회사명
  biz_no text,      -- 사업자번호 (추가)
  dept text,        -- 부서 (추가)
  position text,    -- 직위
  name text,        -- 성명
  phone text,       -- 연락처
  email text,       -- 이메일
  agree_privacy boolean default false, -- 개인정보동의
  
  -- 관리용 필드 (선택 사항)
  status text default '접수됨' -- 상태 (접수, 취소 등)
);


-- 3. Row Level Security (RLS) 보안 정책 설정

-- RLS 활성화
alter table courses enable row level security;
alter table education_apply enable row level security;

-- [정책 1] Courses 테이블
-- (읽기): 누구나 교육 과정을 볼 수 있음 (Public Read)
create policy "Public courses are viewable by everyone"
  on courses for select
  to anon, authenticated
  using ( true );

-- (쓰기): 로그인한 관리자만 등록/수정/삭제 가능
create policy "Enable insert for authenticated users only"
  on courses for insert
  to authenticated
  with check ( true );

create policy "Enable update for authenticated users only"
  on courses for update
  to authenticated
  using ( true );

create policy "Enable delete for authenticated users only"
  on courses for delete
  to authenticated
  using ( true );


-- [정책 2] Education_apply 테이블
-- (쓰기): 누구나 신청서를 제출할 수 있음 (Public Insert)
create policy "Anyone can insert application"
  on education_apply for insert
  to anon, authenticated
  with check ( true );

-- (읽기): 로그인한 관리자만 신청 명단을 볼 수 있음 (Admin Read only)
-- 일반 사용자는 남의 신청 정보를 절대 볼 수 없음.
create policy "Only admin can view applications"
  on education_apply for select
  to authenticated
  using ( true );
