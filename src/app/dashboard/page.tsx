'use client';

import React, { useState, useEffect } from 'react';
import { DashboardStats } from '@/lib/monitoring/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    fetchInitialData();
    setupRealTimeConnection();
  }, []);

  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setLastUpdate(new Date());
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ 초기 데이터 로드 실패:', error);
      setLoading(false);
    }
  };

  const setupRealTimeConnection = () => {
    const eventSource = new EventSource('/api/dashboard/stream');
    
    eventSource.onopen = () => {
      console.log('🔄 실시간 연결 성공');
      setConnected(true);
    };
    
    eventSource.addEventListener('stats', (event) => {
      const newStats = JSON.parse(event.data);
      setStats(newStats);
      setLastUpdate(new Date());
      console.log('📊 실시간 통계 업데이트됨');
    });
    
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('✅ 대시보드 연결:', data.message);
    });
    
    eventSource.onerror = () => {
      console.error('❌ 실시간 연결 오류');
      setConnected(false);
    };
    
    // 컴포넌트 언마운트 시 연결 종료
    return () => {
      eventSource.close();
    };
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatPercent = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;
  const formatNumber = (num: number) => num.toLocaleString();
  const formatLatency = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  const getStatusColor = (successRate: number) => {
    if (successRate >= 0.95) return 'text-green-600';
    if (successRate >= 0.9) return 'text-yellow-600';
    return 'text-red-600';
  };

  const addTestMetric = async () => {
    try {
      await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_metric',
          data: {
            endpoint: '/api/test',
            success: Math.random() > 0.1, // 90% 성공률
            latency: Math.random() * 10000 + 2000,
            tokens: Math.floor(Math.random() * 2000 + 500),
            model: Math.random() > 0.5 ? 'gpt-4o-mini' : 'gpt-4o-2024-11-20'
          }
        })
      });
      console.log('🧪 테스트 메트릭 추가됨');
    } catch (error) {
      console.error('❌ 테스트 메트릭 추가 실패:', error);
    }
  };

  const clearAlerts = async () => {
    try {
      await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_alerts' })
      });
      console.log('✅ 알림 해결 처리됨');
    } catch (error) {
      console.error('❌ 알림 해결 처리 실패:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl">📊 대시보드 데이터를 불러올 수 없습니다</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🚀 AI 자동화 모니터링 대시보드</h1>
              <p className="text-sm text-gray-500">
                실시간 성능 및 비용 모니터링 • v2.0
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${connected ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-600' : 'bg-red-600'}`}></div>
                {connected ? '🟢 실시간 연결됨' : '🔴 연결 끊김'}
              </div>
              {lastUpdate && (
                <span className="text-sm text-gray-500">
                  마지막 업데이트: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 오늘 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">총 요청</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats.today.totalRequests)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">성공률</p>
                <p className={`text-2xl font-bold ${getStatusColor(stats.today.successRate)}`}>
                  {formatPercent(stats.today.successRate)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">평균 응답시간</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatLatency(stats.today.avgLatencyMs)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">총 비용</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.today.totalCost)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <span className="text-2xl">🔤</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">총 토큰</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats.today.totalTokens)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 모델별 사용량 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 모델별 사용량</h3>
            <div className="space-y-4">
              {stats.modelUsage.map((model, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{model.model}</span>
                      <span className="text-sm text-gray-500">{formatPercent(model.percentage / 100)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${model.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>{formatNumber(model.tokens)} 토큰</span>
                      <span>{formatCurrency(model.cost)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 RAG 활용 통계</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">활용률</span>
                <span className="text-sm font-medium">{formatPercent(stats.ragStats.utilizationRate / 100)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">평균 검색 횟수</span>
                <span className="text-sm font-medium">{stats.ragStats.avgSearchesPerRequest.toFixed(1)}회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">평균 소스 발견</span>
                <span className="text-sm font-medium">{stats.ragStats.avgSourcesFound.toFixed(1)}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">URL 검증 성공률</span>
                <span className="text-sm font-medium">{formatPercent(stats.ragStats.urlVerificationRate / 100)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 엔드포인트별 통계 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 엔드포인트별 통계</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-medium text-gray-700">엔드포인트</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-700">요청 수</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-700">성공률</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-700">평균 응답시간</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-700">총 비용</th>
                </tr>
              </thead>
              <tbody>
                {stats.endpointStats.map((endpoint, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-4 text-sm">{endpoint.endpoint}</td>
                    <td className="py-2 px-4 text-sm text-right">{formatNumber(endpoint.count)}</td>
                    <td className={`py-2 px-4 text-sm text-right ${getStatusColor(endpoint.successRate)}`}>
                      {formatPercent(endpoint.successRate)}
                    </td>
                    <td className="py-2 px-4 text-sm text-right">{formatLatency(endpoint.avgLatency)}</td>
                    <td className="py-2 px-4 text-sm text-right">{formatCurrency(endpoint.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 알림 및 최근 에러 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 활성 알림 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">🚨 활성 알림</h3>
              {stats.alerts.length > 0 && (
                <button 
                  onClick={clearAlerts}
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                >
                  모두 해결
                </button>
              )}
            </div>
            <div className="space-y-3">
              {stats.alerts.length === 0 ? (
                <p className="text-sm text-gray-500">✅ 활성 알림이 없습니다</p>
              ) : (
                stats.alerts.slice(0, 5).map((alert, index) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    alert.type === 'error' ? 'bg-red-50 border-red-400' :
                    alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 최근 에러 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">❌ 최근 에러</h3>
            <div className="space-y-3">
              {stats.recentErrors.length === 0 ? (
                <p className="text-sm text-gray-500">✅ 최근 에러가 없습니다</p>
              ) : (
                stats.recentErrors.slice(0, 5).map((error, index) => (
                  <div key={index} className="p-3 bg-red-50 rounded border-l-4 border-red-400">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{error.endpoint}</p>
                        <p className="text-sm text-gray-600">{error.error}</p>
                        {error.userInput && (
                          <p className="text-xs text-gray-500 mt-1">입력: {error.userInput}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 테스트 버튼들 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🧪 테스트 도구</h3>
          <div className="flex space-x-4">
            <button 
              onClick={addTestMetric}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              테스트 메트릭 추가
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              새로고침
            </button>
            <a 
              href="/api/dashboard" 
              target="_blank" 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Raw API 보기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}