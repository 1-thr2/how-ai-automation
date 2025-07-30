import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 자동화 요청 타입 정의
export interface AutomationRequest {
  id?: number
  user_input: string
  followup_answers: any
  generated_cards: any[]
  user_session_id?: string
  processing_time_ms?: number
  success?: boolean
  error_message?: string
  created_at?: string
}

// 자동화 요청 저장
export async function saveAutomationRequest(request: Omit<AutomationRequest, 'id' | 'created_at'>) {
  try {
    console.log('💾 자동화 요청 저장 시도:', {
      user_input: request.user_input.substring(0, 50) + '...',
      followup_count: Object.keys(request.followup_answers || {}).length,
      cards_count: request.generated_cards?.length || 0
    })

    const { data, error } = await supabase
      .from('automation_requests')
      .insert([request])
      .select()

    if (error) {
      console.error('❌ 자동화 요청 저장 실패:', error)
      return null
    }

    console.log('✅ 자동화 요청 저장 성공:', data[0]?.id)
    return data[0]
  } catch (err) {
    console.error('❌ 자동화 요청 저장 에러:', err)
    return null
  }
}

// 최근 자동화 요청 불러오기 (관리/분석용)
export async function getRecentAutomationRequests(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('automation_requests')
      .select('id, user_input, success, created_at, processing_time_ms')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ 자동화 요청 불러오기 실패:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('❌ 자동화 요청 불러오기 에러:', err)
    return []
  }
}

// 특정 자동화 요청 상세 조회
export async function getAutomationRequestById(id: number) {
  try {
    const { data, error } = await supabase
      .from('automation_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ 자동화 요청 상세 조회 실패:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('❌ 자동화 요청 상세 조회 에러:', err)
    return null
  }
}

// 공유 링크 타입 정의
export interface ShareLink {
  id?: string
  request_id: number
  created_at?: string
  expires_at?: string
}

// 공유 링크 생성 또는 조회
export async function createOrGetShareLink(requestId: number): Promise<string | null> {
  try {
    // 1. 기존 공유 링크가 있는지 확인
    const { data: existing, error: checkError } = await supabase
      .from('share_links')
      .select('id')
      .eq('request_id', requestId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ 기존 공유 링크 확인 실패:', checkError)
      return null
    }

    // 2. 기존 링크가 있으면 반환
    if (existing) {
      console.log('✅ 기존 공유 링크 사용:', existing.id)
      return existing.id
    }

    // 3. 새 공유 링크 생성
    const { data, error } = await supabase
      .from('share_links')
      .insert([{ 
        request_id: requestId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일 후 만료
      }])
      .select('id')

    if (error) {
      console.error('❌ 공유 링크 생성 실패:', error)
      return null
    }

    console.log('✅ 새 공유 링크 생성:', data[0]?.id)
    return data[0]?.id || null
  } catch (err) {
    console.error('❌ 공유 링크 생성 에러:', err)
    return null
  }
}

// 공유 링크로 자동화 요청 조회
export async function getAutomationByShareId(shareId: string) {
  try {
    const { data, error } = await supabase
      .from('share_links')
      .select(`
        id,
        created_at,
        expires_at,
        automation_requests (
          id,
          user_input,
          followup_answers,
          generated_cards,
          created_at,
          processing_time_ms
        )
      `)
      .eq('id', shareId)
      .gt('expires_at', new Date().toISOString()) // 만료되지 않은 것만
      .maybeSingle()

    if (error) {
      console.error('❌ 공유 링크 조회 실패:', error)
      return null
    }

    if (!data) {
      console.log('🔍 공유 링크를 찾을 수 없거나 만료됨:', shareId)
      return null
    }

    console.log('✅ 공유 링크 조회 성공:', shareId)
    return data
  } catch (err) {
    console.error('❌ 공유 링크 조회 에러:', err)
    return null
  }
} 