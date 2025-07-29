-- ===============================================
-- 🤖 How-AI 자동화 요청 데이터 테이블 생성
-- ===============================================

-- 자동화 요청 메인 테이블
CREATE TABLE IF NOT EXISTS public.automation_requests (
    id BIGSERIAL PRIMARY KEY,
    user_input TEXT NOT NULL, -- 사용자가 직접 입력한 자동화 요청
    followup_answers JSONB, -- 후속질문과 답변들 (JSON 형태)
    generated_cards JSONB, -- 생성된 자동화 결과 (cards 배열)
    user_session_id VARCHAR(100), -- 세션 구분용 (옵션)
    processing_time_ms INTEGER, -- 처리 시간 (성능 모니터링)
    success BOOLEAN DEFAULT true, -- 성공/실패 여부
    error_message TEXT, -- 에러 발생시 메시지
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_automation_requests_created_at ON public.automation_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_requests_success ON public.automation_requests(success);
CREATE INDEX IF NOT EXISTS idx_automation_requests_user_session ON public.automation_requests(user_session_id);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.automation_requests ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자동화 요청을 조회할 수 있음 (통계/분석용)
CREATE POLICY "자동화 요청 조회 허용" ON public.automation_requests
    FOR SELECT USING (true);

-- 모든 사용자가 자동화 요청을 등록할 수 있음
CREATE POLICY "자동화 요청 등록 허용" ON public.automation_requests
    FOR INSERT WITH CHECK (true);

-- ===============================================
-- 🔍 참고: Supabase 대시보드에서 실행하세요
-- ===============================================
-- 1. Supabase 프로젝트 → SQL Editor
-- 2. 위 스크립트 복사/붙여넣기 → 실행
-- 3. Table Editor에서 game_scores 테이블 확인 