import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true';
const JUDGE0_API_KEY = process.env.RAPIDAPI_KEY;

// JavaScript: 63, Python: 71 등 (Judge0 공식 문서 참고)
const LANGUAGE_ID = 63; // JavaScript

async function validateCodeStep(code: string) {
  const res = await fetch(JUDGE0_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': JUDGE0_API_KEY || '',
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
    },
    body: JSON.stringify({
      language_id: LANGUAGE_ID,
      source_code: Buffer.from(code).toString('base64'),
      stdin: Buffer.from('').toString('base64'),
      expected_output: Buffer.from('').toString('base64'),
    }),
  });
  if (!res.ok) throw new Error('Judge0 코드 검증 실패');
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { steps } = await req.json();
    if (!steps || !Array.isArray(steps)) {
      return NextResponse.json({ error: 'steps 배열이 필요합니다.' }, { status: 400 });
    }
    const results = [];
    for (const step of steps) {
      if (step.code) {
        try {
          const result = await validateCodeStep(step.code);
          results.push({
            step: step.title,
            valid: result.status?.id <= 3,
            output: result.stdout ? Buffer.from(result.stdout, 'base64').toString() : '',
            error: result.stderr ? Buffer.from(result.stderr, 'base64').toString() : '',
            status: result.status,
          });
        } catch (error: any) {
          results.push({
            step: step.title,
            valid: false,
            error: error.message,
          });
        }
      } else {
        results.push({ step: step.title, valid: null, error: '코드 없음' });
      }
    }
    return NextResponse.json({ validation: results });
  } catch (error) {
    return NextResponse.json({ error: '코드 검증 중 오류 발생' }, { status: 500 });
  }
}
