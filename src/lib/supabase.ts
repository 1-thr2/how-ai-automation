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