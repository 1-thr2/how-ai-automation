import axios from 'axios';

const CODESANDBOX_API_KEY = process.env.NEXT_PUBLIC_CODESANDBOX_API_KEY;
const CODESANDBOX_API_URL = 'https://codesandbox.io/api/v1/sandboxes';

export async function validateCode(code, language) {
  try {
    // 코드 샌드박스 생성
    const sandbox = await axios.post(
      CODESANDBOX_API_URL,
      {
        files: {
          'index.js': {
            content: code,
            language: language,
          },
        },
        template: 'node',
      },
      {
        headers: {
          Authorization: `Bearer ${CODESANDBOX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // 코드 실행 및 검증
    const validation = await axios.post(
      `${CODESANDBOX_API_URL}/${sandbox.data.sandbox_id}/execute`,
      {
        command: 'node index.js',
      },
      {
        headers: {
          Authorization: `Bearer ${CODESANDBOX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      isValid: validation.data.status === 'success',
      output: validation.data.output,
      errors: validation.data.errors || [],
    };
  } catch (error) {
    console.error('코드 검증 오류:', error);
    return {
      isValid: false,
      output: null,
      errors: [error.message],
    };
  }
}
