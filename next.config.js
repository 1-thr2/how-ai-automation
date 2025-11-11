/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode 비활성화 (중복 렌더링 방지)
  reactStrictMode: false,
  
  // 🔥 Fast Refresh / HMR 설정
  experimental: {
    // Fast Refresh 간격 조정 (너무 빈번한 리빌드 방지)
    webpackBuildWorker: false,
  },
  
  // Webpack 설정으로 HMR 조정
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // HMR 폴링 간격 늘리기
      config.watchOptions = {
        poll: 3000, // 3초마다 체크 (기본값보다 훨씬 길게)
        aggregateTimeout: 1000,
        ignored: /node_modules/,
      };
    }
    return config;
  },
  
  // 빌드 시 lint/타입 에러 처리
  // 프로덕션에서는 에러를 표면화하여 품질 보장
  // Preview 배포에서만 일시적으로 허용
  eslint: {
    ignoreDuringBuilds: process.env.VERCEL_ENV === 'preview',
  },
  typescript: {
    ignoreBuildErrors: process.env.VERCEL_ENV === 'preview',
  },
  
  // 컴파일러 최적화
  compiler: {
    removeConsole: false,
  }
}

module.exports = nextConfig 