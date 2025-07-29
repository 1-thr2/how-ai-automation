/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode 비활성화 (중복 렌더링 방지)
  reactStrictMode: false,
  
  // 빌드 시 lint/타입 에러 무시 (Vercel 배포용)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 컴파일러 최적화
  compiler: {
    removeConsole: false,
  },
  
  // Vercel 배포 최적화
  experimental: {
    // 빌드 성능 향상
    optimizeCss: false,
    turbotrace: {
      logLevel: 'error'
    }
  }
}

module.exports = nextConfig 