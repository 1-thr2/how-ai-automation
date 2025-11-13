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
-- 🔗 공유 링크 테이블
-- ===============================================
-- 자동화 결과 공유용 링크 관리 테이블
CREATE TABLE IF NOT EXISTS public.share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- 공유 링크 고유 ID (URL에 사용)
    request_id BIGINT NOT NULL REFERENCES public.automation_requests(id) ON DELETE CASCADE, -- 참조하는 자동화 요청 ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL, -- 생성 시각
    expires_at TIMESTAMP WITH TIME ZONE -- 만료 시각 (옵션)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_share_links_request_id ON public.share_links(request_id);
CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON public.share_links(expires_at);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 공유 링크를 조회할 수 있음
CREATE POLICY "공유 링크 조회 허용" ON public.share_links
    FOR SELECT USING (expires_at IS NULL OR expires_at > NOW());

-- 모든 사용자가 공유 링크를 생성할 수 있음
CREATE POLICY "공유 링크 생성 허용" ON public.share_links
    FOR INSERT WITH CHECK (true);

-- ===============================================
-- 📝 사용자 피드백 테이블
-- ===============================================
-- Beta 기간 동안 사용자 피드백 수집
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id BIGSERIAL PRIMARY KEY,
    automation_id BIGINT REFERENCES public.automation_requests(id) ON DELETE CASCADE,
    success BOOLEAN NOT NULL, -- true: 성공, false: 실패
    failed_steps INTEGER[], -- 실패한 단계 번호들 (예: [1, 3])
    detail TEXT, -- 사용자가 입력한 상세 내용
    email VARCHAR(255), -- 답변받을 이메일 (선택)
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed
    admin_reply TEXT, -- 관리자 답변
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    replied_at TIMESTAMP WITH TIME ZONE -- 답변 시각
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_automation_id ON public.user_feedback(automation_id);

-- RLS 정책
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 피드백 등록 가능
CREATE POLICY "피드백 등록 허용" ON public.user_feedback
    FOR INSERT WITH CHECK (true);

-- 모든 사용자가 자신의 피드백 조회 가능
CREATE POLICY "피드백 조회 허용" ON public.user_feedback
    FOR SELECT USING (true);

-- ===============================================
-- 🔍 참고: Supabase 대시보드에서 실행하세요
-- ===============================================
-- 1. Supabase 프로젝트 → SQL Editor
-- 2. 위 스크립트 복사/붙여넣기 → 실행
-- 3. Table Editor에서 테이블 확인:
--    - automation_requests
--    - share_links
--    - user_feedback (NEW) 