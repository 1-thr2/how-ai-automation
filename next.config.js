/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Fast Refresh 완전 비활성화
    forceSwcTransforms: false,
  },
  // React Strict Mode 비활성화 (중복 렌더링 방지)
  reactStrictMode: false,
  
  // 빌드 시 lint/타입 에러 무시
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
  
  // Fast Refresh 완전 차단
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // HMR 완전 비활성화
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
      
      // Watch 옵션 최적화 (파일 변경 감지를 느리게)
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 10000, // 10초로 늘림
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/build/**',
          '**/dist/**'
        ],
      };
      
      // Fast Refresh 플러그인 완전 제거
      config.plugins = config.plugins.filter(plugin => {
        const name = plugin.constructor.name;
        return name !== 'ReactRefreshPlugin' && 
               name !== 'ReactRefreshWebpackPlugin';
      });
      
      // HMR 엔트리 제거
      if (config.entry) {
        const originalEntry = config.entry;
        config.entry = async () => {
          const entries = await (typeof originalEntry === 'function' ? originalEntry() : originalEntry);
          
          Object.keys(entries).forEach(key => {
            if (Array.isArray(entries[key])) {
              entries[key] = entries[key].filter(entry => 
                !entry.includes('webpack/hot') && 
                !entry.includes('react-refresh') &&
                !entry.includes('fast-refresh')
              );
            }
          });
          return entries;
        };
      }
    }
    return config;
  },
}

module.exports = nextConfig 