<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>자동화 플로우</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #F8F9FA;
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 800;
            color: #333;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            color: #666;
        }
        
        .impact-bar {
            background: linear-gradient(90deg, #6C5CE7 0%, #A29BFE 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 16px;
            text-align: center;
            margin-bottom: 32px;
            box-shadow: 0 8px 32px rgba(108, 92, 231, 0.2);
        }
        
        .impact-bar strong {
            font-size: 18px;
            font-weight: 700;
        }
        
        .flow-container {
            position: relative;
            margin-bottom: 40px;
        }
        
        .progress-line {
            position: absolute;
            top: 30px;
            left: 40px;
            right: 40px;
            height: 4px;
            background: #E1E3E8;
            border-radius: 2px;
            z-index: 1;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #6C5CE7, #A29BFE);
            border-radius: 2px;
            width: 0%;
            transition: width 1s ease;
        }
        
        .flow-steps {
            position: relative;
            z-index: 2;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }
        
        .flow-step {
            background: white;
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            transform: translateY(10px);
            opacity: 0;
        }
        
        .flow-step.active {
            transform: translateY(0);
            opacity: 1;
        }
        
        .flow-step:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 12px 40px rgba(108, 92, 231, 0.15);
        }
        
        .step-number {
            position: absolute;
            top: -12px;
            left: 24px;
            width: 24px;
            height: 24px;
            background: white;
            border: 3px solid #6C5CE7;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            color: #6C5CE7;
            z-index: 3;
        }
        
        .step-number.completed {
            background: #6C5CE7;
            color: white;
        }
        
        .step-icon {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin-bottom: 16px;
            transition: all 0.3s ease;
        }
        
        .step1 .step-icon { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .step2 .step-icon { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .step3 .step-icon { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
        
        .step-title {
            font-size: 18px;
            font-weight: 700;
            color: #333;
            margin-bottom: 6px;
        }
        
        .step-subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 12px;
            line-height: 1.4;
        }
        
        .step-duration {
            display: inline-flex;
            align-items: center;
            background: #F0F7FF;
            color: #6C5CE7;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        
        .step-duration:before {
            content: '⏱️';
            margin-right: 4px;
        }
        
        .step-preview {
            background: #F8F9FA;
            border-radius: 12px;
            padding: 12px;
            font-size: 13px;
            color: #666;
            margin-bottom: 16px;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease 0.2s;
        }
        
        .flow-step:hover .step-preview {
            opacity: 1;
            transform: translateY(0);
        }
        
        .step-tech {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        
        .tech-tag {
            background: #E1ECFF;
            color: #6C5CE7;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
        }
        
        .action-hero {
            background: white;
            border-radius: 24px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
            margin-bottom: 32px;
            position: relative;
            overflow: hidden;
        }
        
        .action-hero:before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(108, 92, 231, 0.1), transparent);
            transition: left 0.6s ease;
        }
        
        .action-hero:hover:before {
            left: 100%;
        }
        
        .action-title {
            font-size: 24px;
            font-weight: 800;
            color: #333;
            margin-bottom: 8px;
        }
        
        .action-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 32px;
        }
        
        .main-cta {
            background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
            color: white;
            border: none;
            padding: 18px 36px;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 8px 32px rgba(108, 92, 231, 0.3);
            position: relative;
            overflow: hidden;
        }
        
        .main-cta:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.3s ease;
        }
        
        .main-cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 48px rgba(108, 92, 231, 0.4);
        }
        
        .main-cta:hover:before {
            width: 300px;
            height: 300px;
        }
        
        .secondary-actions {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 20px;
        }
        
        .secondary-btn {
            background: transparent;
            color: #6C5CE7;
            border: 2px solid #E1ECFF;
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .secondary-btn:hover {
            background: #F0F7FF;
            border-color: #6C5CE7;
            transform: translateY(-1px);
        }
        
        .result-showcase {
            background: white;
            border-radius: 24px;
            padding: 32px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
            position: relative;
        }
        
        .showcase-header {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .showcase-title {
            font-size: 22px;
            font-weight: 800;
            color: #333;
            margin-bottom: 8px;
        }
        
        .showcase-subtitle {
            font-size: 14px;
            color: #666;
        }
        
        .result-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }
        
        .result-card {
            background: #F8F9FA;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .result-card:hover {
            background: #F0F7FF;
            transform: translateY(-4px);
        }
        
        .result-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            margin: 0 auto 16px;
            background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
        }
        
        .result-card h4 {
            font-size: 16px;
            font-weight: 700;
            color: #333;
            margin-bottom: 8px;
        }
        
        .result-card p {
            font-size: 13px;
            color: #666;
            line-height: 1.4;
        }
        
        .share-section {
            background: white;
            border-radius: 20px;
            padding: 32px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            margin-top: 24px;
        }
        
        .share-header h3 {
            font-size: 20px;
            font-weight: 700;
            color: #333;
            margin-bottom: 8px;
        }
        
        .share-header p {
            font-size: 14px;
            color: #666;
            margin-bottom: 24px;
        }
        
        .share-btn {
            background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
            color: white;
            border: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
        }
        
        .share-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
        }
        
        .floating-tip {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #6C5CE7;
            color: white;
            padding: 16px 20px;
            border-radius: 16px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 8px 32px rgba(108, 92, 231, 0.3);
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.4s ease;
            cursor: pointer;
            z-index: 1000;
        }
        
        .floating-tip.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .floating-tip:hover {
            transform: translateY(-4px);
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            z-index: 2000;
        }
        
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 24px;
            padding: 40px;
            max-width: 700px;
            width: 90%;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }
        
        .modal-header {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .modal-title {
            font-size: 24px;
            font-weight: 800;
            color: #333;
            margin-bottom: 8px;
        }
        
        .modal-subtitle {
            font-size: 14px;
            color: #666;
        }
        
        .close-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            background: #F8F9FA;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 18px;
            color: #666;
            transition: all 0.3s ease;
        }
        
        .close-btn:hover {
            background: #E1E3E8;
            transform: rotate(90deg);
        }
        
        .guide-step {
            background: #F8F9FA;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            display: flex;
            align-items: flex-start;
        }
        
        .guide-number {
            background: #6C5CE7;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            margin-right: 16px;
            flex-shrink: 0;
        }
        
        .guide-content h4 {
            font-size: 16px;
            font-weight: 700;
            color: #333;
            margin-bottom: 6px;
        }
        
        .guide-content p {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
        }
        
        .code-showcase {
            background: #1a1a1a;
            color: #e6e6e6;
            padding: 24px;
            border-radius: 16px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            line-height: 1.6;
            margin: 20px 0;
            position: relative;
            overflow: hidden;
        }
        
        .code-showcase:before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #6C5CE7, #A29BFE);
        }
        
        .copy-code {
            position: absolute;
            top: 16px;
            right: 16px;
            background: #333;
            color: #fff;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .copy-code:hover {
            background: #6C5CE7;
        }
        
        @media (max-width: 768px) {
            .flow-steps {
                grid-template-columns: 1fr;
                gap: 24px;
            }
            
            .progress-line {
                display: none;
            }
            
            .result-grid {
                grid-template-columns: 1fr;
            }
            
            .secondary-actions {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>메시징 앱에서 질문 자동 수집</h1>
            <p>15분이면 완성되는 자동화 시스템</p>
        </div>
        
        <div class="impact-bar">
            <strong>💡 평균 8시간/주 절약</strong> • 95% 오류 감소 • 실시간 처리
        </div>
        
        <div class="flow-container">
            <div class="progress-line">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            
            <div class="flow-steps">
                <div class="flow-step step1" onclick="openModal('step1')" data-step="1">
                    <div class="step-number">1</div>
                    <div class="step-icon">💬</div>
                    <div class="step-title">메시징 앱 연동</div>
                    <div class="step-subtitle">카카오톡/슬랙에서 메시지 받아오기</div>
                    <div class="step-duration">5분</div>
                    <div class="step-preview">
                        웹훅 설정으로 실시간 메시지 수신
                    </div>
                    <div class="step-tech">
                        <span class="tech-tag">Webhook</span>
                        <span class="tech-tag">Express.js</span>
                    </div>
                </div>
                
                <div class="flow-step step2" onclick="openModal('step2')" data-step="2">
                    <div class="step-number">2</div>
                    <div class="step-icon">📊</div>
                    <div class="step-title">구글 시트 연동</div>
                    <div class="step-subtitle">받은 메시지를 자동으로 시트에 저장</div>
                    <div class="step-duration">7분</div>
                    <div class="step-preview">
                        API 연동으로 즉시 데이터 정리
                    </div>
                    <div class="step-tech">
                        <span class="tech-tag">Google API</span>
                        <span class="tech-tag">Sheets</span>
                    </div>
                </div>
                
                <div class="flow-step step3" onclick="openModal('step3')" data-step="3">
                    <div class="step-number">3</div>
                    <div class="step-icon">🔍</div>
                    <div class="step-title">스마트 필터링</div>
                    <div class="step-subtitle">질문만 골라서 자동 분류</div>
                    <div class="step-duration">3분</div>
                    <div class="step-preview">
                        AI 키워드 분석으로 정확한 분류
                    </div>
                    <div class="step-tech">
                        <span class="tech-tag">Keywords</span>
                        <span class="tech-tag">Auto-Sort</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="result-showcase">
            <div class="showcase-header">
                <div class="showcase-title">🎉 완성 후 이런 일들이 가능해져요</div>
                <div class="showcase-subtitle">클릭하면 실제 예시를 확인할 수 있어요</div>
            </div>
            
            <div class="result-grid">
                <div class="result-card" onclick="showPreview('dashboard')">
                    <div class="result-icon">📊</div>
                    <h4>실시간 대시보드</h4>
                    <p>질문 통계와 트렌드를 시각적으로 확인</p>
                </div>
                
                <div class="result-card" onclick="showPreview('notification')">
                    <div class="result-icon">🔔</div>
                    <h4>즉시 알림 시스템</h4>
                    <p>긴급 질문 시 슬랙/이메일 자동 발송</p>
                </div>
                
                <div class="result-card" onclick="showPreview('report')">
                    <div class="result-icon">📈</div>
                    <h4>자동 리포트</h4>
                    <p>주간/월간 인사이트 자동 생성</p>
                </div>
                
                <div class="result-card" onclick="showPreview('expansion')">
                    <div class="result-icon">🚀</div>
                    <h4>무한 확장</h4>
                    <p>AI 답변, CRM 연동까지 가능</p>
                </div>
            </div>
        </div>
        
        <div class="action-hero">
            <div class="action-title">🚀 지금 바로 시작해보세요</div>
            <div class="action-subtitle">ChatGPT가 개인 맞춤 가이드를 제공합니다</div>
            
            <button class="main-cta" onclick="goToGPT()">
                <span style="position: relative; z-index: 1;">🤖 GPT와 함께 설계하기</span>
            </button>
            
            <div class="secondary-actions">
                <button class="secondary-btn" onclick="createNew()">
                    ➕ 새 레시피 만들기
                </button>
            </div>
        </div>
        
        <div class="share-section">
            <div class="share-header">
                <h3>🔗 이 레시피가 유용했다면?</h3>
                <p>다른 사람들과 공유해서 함께 자동화의 혜택을 누려보세요</p>
            </div>
            <button class="share-btn" onclick="shareRecipe()">
                📤 레시피 공유하기
            </button>
        </div>
    </div>
    
    <div class="floating-tip" id="floatingTip" onclick="showFAQ()">
        ❓ 자주 묻는 질문
    </div>
    
    <!-- Modal -->
    <div id="modal" class="modal" onclick="closeModal(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
            <button class="close-btn" onclick="closeModal()">×</button>
            <div class="modal-header">
                <div class="modal-title" id="modalTitle">단계별 상세 가이드</div>
                <div class="modal-subtitle">따라하기만 하면 완성됩니다</div>
            </div>
            <div id="modalBody">
                <!-- 동적으로 채워짐 -->
            </div>
        </div>
    </div>
    
    <script>
        // 애니메이션 초기화
        document.addEventListener('DOMContentLoaded', function() {
            // 카드들 순차적으로 나타나기
            const steps = document.querySelectorAll('.flow-step');
            steps.forEach((step, index) => {
                setTimeout(() => {
                    step.classList.add('active');
                    const number = step.querySelector('.step-number');
                    if (index === 0) number.classList.add('completed');
                }, index * 200);
            });
            
            // 프로그레스 바 애니메이션
            setTimeout(() => {
                document.getElementById('progressFill').style.width = '33%';
            }, 800);
            
            // 플로팅 팁 나타나기
            setTimeout(() => {
                document.getElementById('floatingTip').classList.add('show');
            }, 3000);
        });
        
        // 모달 컨텐츠
        const modalContent = {
            step1: {
                title: "1단계: 메시징 앱 연동",
                subtitle: "5분이면 완성되는 실시간 연동",
                content: `
                    <div class="guide-step">
                        <div class="guide-number">1</div>
                        <div class="guide-content">
                            <h4>카카오톡/슬랙 API 설정</h4>
                            <p>개발자 콘솔에서 앱을 생성하고 메시징 권한을 활성화합니다. 5분이면 충분해요!</p>
                        </div>
                    </div>
                    
                    <div class="guide-step">
                        <div class="guide-number">2</div>
                        <div class="guide-content">
                            <h4>웹훅 엔드포인트 생성</h4>
                            <p>아래 코드를 복사해서 서버에 배포하면 메시지를 받을 수 있어요</p>
                        </div>
                    </div>
                    
                    <div class="code-showcase">
                        <button class="copy-code" onclick="copyCode(this)">복사</button>
app.post('/webhook', (req, res) => {
    const { content, user_key, type } = req.body;
    
    // 메시지 처리
    if (type === 'text') {
        console.log('받은 메시지:', content);
        console.log('발신자:', user_key);
        
        // 다음 단계에서 구글 시트로 저장
        processMessage(content, user_key);
    }
    
    res.status(200).json({ status: 'ok' });
});
                    </div>
                    
                    <div class="guide-step">
                        <div class="guide-number">3</div>
                        <div class="guide-content">
                            <h4>연결 테스트</h4>
                            <p>테스트 메시지를 보내서 콘솔에 로그가 찍히는지 확인해보세요</p>
                        </div>
                    </div>
                `
            },
            step2: {
                title: "2단계: 구글 시트 연동",
                subtitle: "API 한 번 설정으로 평생 자동화",
                content: `
                    <div class="guide-step">
                        <div class="guide-number">1</div>
                        <div class="guide-content">
                            <h4>Google Cloud Console 설정</h4>
                            <p>새 프로젝트 → Sheets API 활성화 → 서비스 계정 키 생성 (3분 컷)</p>
                        </div>
                    </div>
                    
                    <div class="guide-step">
                        <div class="guide-number">2</div>
                        <div class="guide-content">
                            <h4>스프레드시트 연결</h4>
                            <p>구글 시트를 만들고 서비스 계정에 편집 권한을 부여하세요</p>
                        </div>
                    </div>
                    
                    <div class="code-showcase">
                        <button class="copy-code" onclick="copyCode(this)">복사</button>
const { google } = require('googleapis');

async function saveToSheet(message, sender) {
const auth = new google.auth.GoogleAuth({
keyFile: 'service-account-key.json',
scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

    const sheets = google.sheets({ version: 'v4', auth });
    const timestamp = new Date().toLocaleString('ko-KR');

    const values = [[timestamp, sender, message, '미답변', '일반']];

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: 'YOUR_SPREADSHEET_ID',
            range: 'A:E',
            valueInputOption: 'RAW',
            resource: { values },
        });

        console.log('✅ 시트에 저장 완료!');
    } catch (error) {
        console.error('❌ 저장 실패:', error);
    }

}
</div>

                    <div class="guide-step">
                        <div class="guide-number">3</div>
                        <div class="guide-content">
                            <h4>실시간 저장 확인</h4>
                            <p>메시지를 보내보면 구글 시트에 실시간으로 추가되는 걸 확인할 수 있어요!</p>
                        </div>
                    </div>
                `
            },
            step3: {
                title: "3단계: 스마트 필터링",
                subtitle: "AI처럼 똑똑하게 자동 분류",
                content: `
                    <div class="guide-step">
                        <div class="guide-number">1</div>
                        <div class="guide-content">
                            <h4>질문 키워드 설정</h4>
                            <p>어떤 메시지가 "질문"인지 판단하는 키워드들을 설정합니다</p>
                        </div>
                    </div>

                    <div class="guide-step">
                        <div class="guide-number">2</div>
                        <div class="guide-content">
                            <h4>자동 분류 로직</h4>
                            <p>기술문의, 결제문의, 일반문의 등으로 자동 카테고라이징</p>
                        </div>
                    </div>

                    <div class="code-showcase">
                        <button class="copy-code" onclick="copyCode(this)">복사</button>

function processMessage(message, sender) {
// 질문 여부 판단
const questionKeywords = ['질문', '문의', '도움', '?', '어떻게', '뭔가요'];
const isQuestion = questionKeywords.some(keyword =>
message.toLowerCase().includes(keyword.toLowerCase())
);

    if (!isQuestion) {
        console.log('질문이 아님 - 저장 안함');
        return;
    }

    // 카테고리 자동 분류
    const category = categorizeMessage(message);
    const priority = getPriority(message);

    // 시트에 저장
    saveToSheetWithCategory(message, sender, category, priority);

    // 긴급한 경우 즉시 알림
    if (priority === '긴급') {
        sendSlackNotification(message, sender);
    }

}

function categorizeMessage(message) {
if (message.includes('기술') || message.includes('버그')) return '기술문의';
if (message.includes('결제') || message.includes('요금')) return '결제문의';
if (message.includes('사용법')) return '사용법문의';
return '일반문의';
}

function getPriority(message) {
const urgentWords = ['긴급', '급함', '에러', '안됨', '문제발생'];
return urgentWords.some(word => message.includes(word)) ? '긴급' : '일반';
}
</div>

                    <div class="guide-step">
                        <div class="guide-number">3</div>
                        <div class="guide-content">
                            <h4>알림 시스템 연동</h4>
                            <p>슬랙이나 이메일로 중요한 질문이 왔을 때 즉시 알림을 받을 수 있어요</p>
                        </div>
                    </div>
                `
            }
        };

        function openModal(stepId) {
            const modal = document.getElementById('modal');
            const title = document.getElementById('modalTitle');
            const body = document.getElementById('modalBody');

            const content = modalContent[stepId];
            title.textContent = content.title;
            body.innerHTML = content.content;

            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // 프로그레스 업데이트
            const stepNum = parseInt(stepId.replace('step', ''));
            updateProgress(stepNum);
        }

        function closeModal(event) {
            if (!event || event.target.id === 'modal' || event.target.classList.contains('close-btn')) {
                document.getElementById('modal').style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }

        function updateProgress(stepNum) {
            const progress = (stepNum / 3) * 100;
            document.getElementById('progressFill').style.width = progress + '%';

            // 완료된 스텝 표시
            document.querySelectorAll('.step-number').forEach((num, index) => {
                if (index < stepNum) {
                    num.classList.add('completed');
                }
            });
        }

        function goToGPT() {
            const prompt = encodeURIComponent(`

메시징 앱에서 질문을 자동으로 수집하는 시스템을 만들고 싶어요!

🚀 만들고 싶은 시스템:
• 카카오톡/슬랙에서 질문 자동 수집
• 구글 시트에 실시간 저장
• 질문만 필터링해서 자동 분류
• 긴급 질문 시 즉시 알림

📋 가이드를 받았는데 더 구체적으로 도와주세요:

1. 메시징 앱 연동 (5분) - 웹훅 설정
2. 구글 시트 연동 (7분) - API 연결
3. 스마트 필터링 (3분) - 자동 분류

💻 제 상황:

- 개발 경험: [여기에 입력]
- 사용 플랫폼: [카카오톡/슬랙/기타]
- 예상 메시지량: [하루 몇 개]

더 자세한 단계별 가이드와 맞춤 코드를 부탁드려요!
`);

            window.open(`https://chat.openai.com/?q=${prompt}`, '_blank');
        }

        function shareRecipe() {
            const shareUrl = 'https://how-ai.com/recipe/messaging-automation-123';
            const shareText = '메시징 앱에서 질문을 자동으로 수집하는 자동화 레시피! 15분만에 설정 완료 🚀';

            if (navigator.share) {
                // 모바일에서 네이티브 공유
                navigator.share({
                    title: '자동화 레시피: 메시징 앱 질문 수집',
                    text: shareText,
                    url: shareUrl
                });
            } else {
                // 데스크톱에서 URL 복사
                navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
                    alert('🔗 레시피 링크가 복사되었어요!\n\n' + shareText + '\n' + shareUrl + '\n\n다른 사람들과 공유해보세요.');
                }).catch(() => {
                    // 복사 실패시 수동 복사용 프롬프트
                    prompt('링크를 복사해서 공유하세요:', shareUrl);
                });
            }
        }

        function createNew() {
            alert('➕ 새로운 자동화 레시피 만들기 페이지로 이동합니다!');
        }

        function showPreview(type) {
            const modal = document.getElementById('modal');
            const title = document.getElementById('modalTitle');
            const body = document.getElementById('modalBody');

            const previews = {
                dashboard: {
                    title: '📊 실시간 대시보드 미리보기',
                    content: `
                        <div style="background: #F8F9FA; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="margin-bottom: 16px; color: #333;">오늘의 질문 통계</h4>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
                                <div style="text-align: center; padding: 16px; background: white; border-radius: 8px;">
                                    <div style="font-size: 24px; font-weight: 700; color: #6C5CE7;">23</div>
                                    <div style="font-size: 12px; color: #666;">총 질문</div>
                                </div>
                                <div style="text-align: center; padding: 16px; background: white; border-radius: 8px;">
                                    <div style="font-size: 24px; font-weight: 700; color: #10B981;">18</div>
                                    <div style="font-size: 12px; color: #666;">답변 완료</div>
                                </div>
                                <div style="text-align: center; padding: 16px; background: white; border-radius: 8px;">
                                    <div style="font-size: 24px; font-weight: 700; color: #F59E0B;">5</div>
                                    <div style="font-size: 12px; color: #666;">답변 대기</div>
                                </div>
                            </div>
                            <div style="background: white; border-radius: 8px; padding: 16px;">
                                <h5 style="margin-bottom: 12px; color: #333;">질문 유형별 분포</h5>
                                <div style="margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                        <span style="font-size: 13px;">기술문의</span>
                                        <span style="font-size: 13px; font-weight: 600;">45%</span>
                                    </div>
                                    <div style="background: #E1E3E8; border-radius: 4px; height: 6px;">
                                        <div style="background: #6C5CE7; width: 45%; height: 100%; border-radius: 4px;"></div>
                                    </div>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                        <span style="font-size: 13px;">사용법문의</span>
                                        <span style="font-size: 13px; font-weight: 600;">30%</span>
                                    </div>
                                    <div style="background: #E1E3E8; border-radius: 4px; height: 6px;">
                                        <div style="background: #10B981; width: 30%; height: 100%; border-radius: 4px;"></div>
                                    </div>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                        <span style="font-size: 13px;">결제문의</span>
                                        <span style="font-size: 13px; font-weight: 600;">25%</span>
                                    </div>
                                    <div style="background: #E1E3E8; border-radius: 4px; height: 6px;">
                                        <div style="background: #F59E0B; width: 25%; height: 100%; border-radius: 4px;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p style="color: #666; text-align: center;">실제 데이터가 연동되면 이런 대시보드를 실시간으로 확인할 수 있어요!</p>
                    `
                },
                notification: {
                    title: '🔔 즉시 알림 시스템 미리보기',
                    content: `
                        <div style="background: #F8F9FA; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="margin-bottom: 16px; color: #333;">슬랙 알림 예시</h4>
                            <div style="background: #4A154B; color: white; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px;">
                                <div style="margin-bottom: 8px;">
                                    <span style="color: #E01E5A; font-weight: bold;">🚨 긴급 질문 알림</span>
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <strong>발신자:</strong> 김고객 (user_12345)
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <strong>시간:</strong> 2024-01-15 14:30:25
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>내용:</strong> "결제가 안되는 문제가 발생했어요. 급합니다!"
                                </div>
                                <div style="background: #2EB67D; padding: 8px; border-radius: 4px; text-align: center;">
                                    <a href="#" style="color: white; text-decoration: none;">📋 바로 확인하기</a>
                                </div>
                            </div>
                        </div>
                        <div style="background: #FFF9E6; border: 1px solid #FFE066; border-radius: 8px; padding: 16px;">
                            <p style="margin: 0; color: #B7791F; font-size: 14px;">
                                💡 <strong>설정 팁:</strong> '긴급', '급함', '에러', '문제' 등의 키워드가 포함되면 즉시 알림이 발송됩니다.
                            </p>
                        </div>
                    `
                },
                report: {
                    title: '📈 자동 리포트 미리보기',
                    content: `
                        <div style="background: #F8F9FA; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="margin-bottom: 16px; color: #333;">📋 주간 질문 분석 리포트</h4>
                            <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                                <h5 style="margin-bottom: 12px; color: #333;">이번 주 하이라이트</h5>
                                <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.6;">
                                    <li>총 156개 질문 수집 (전주 대비 23% 증가)</li>
                                    <li>평균 응답 시간: 2.3시간 (전주 대비 1.2시간 단축)</li>
                                    <li>가장 많은 질문: "로그인 관련 문의" (34건)</li>
                                    <li>고객 만족도: 4.7/5.0 (전주 대비 0.3점 상승)</li>
                                </ul>
                            </div>
                            <div style="background: white; border-radius: 8px; padding: 16px;">
                                <h5 style="margin-bottom: 12px; color: #333;">개선 제안</h5>
                                <div style="background: #E1ECFF; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
                                    <div style="font-weight: 600; color: #6C5CE7; font-size: 13px; margin-bottom: 4px;">🎯 추천 액션</div>
                                    <div style="font-size: 13px; color: #333;">로그인 관련 FAQ를 홈페이지에 추가하면 문의량을 30% 줄일 수 있을 것 같아요.</div>
                                </div>
                                <div style="background: #FFF4E6; border-radius: 6px; padding: 12px;">
                                    <div style="font-weight: 600; color: #F59E0B; font-size: 13px; margin-bottom: 4px;">⚡ 긴급 알림 개선</div>
                                    <div style="font-size: 13px; color: #333;">결제 문의 키워드에 '환불', '취소'를 추가하는 것을 검토해보세요.</div>
                                </div>
                            </div>
                        </div>
                        <p style="color: #666; text-align: center;">매주 월요일 오전 9시에 이런 리포트가 자동으로 이메일/슬랙으로 발송됩니다!</p>
                    `
                },
                expansion: {
                    title: '🚀 무한 확장 가능성',
                    content: `
                        <div style="background: #F8F9FA; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="margin-bottom: 16px; color: #333;">🔧 확장 로드맵</h4>
                            <div style="display: grid; gap: 12px;">
                                <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #6C5CE7;">
                                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">1단계: AI 자동 답변 (+ 2주)</div>
                                    <div style="font-size: 13px; color: #666;">ChatGPT API 연동으로 간단한 질문은 자동 답변</div>
                                </div>
                                <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #10B981;">
                                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">2단계: 다중 채널 통합 (+ 1주)</div>
                                    <div style="font-size: 13px; color: #666;">인스타그램, 페이스북, 디스코드까지 한 번에 관리</div>
                                </div>
                                <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #F59E0B;">
                                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">3단계: CRM 연동 (+ 3주)</div>
                                    <div style="font-size: 13px; color: #666;">고객 정보와 연결해서 개인화된 응답 제공</div>
                                </div>
                                <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #E11D48;">
                                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">4단계: 감정 분석 & 우선순위 (+ 2주)</div>
                                    <div style="font-size: 13px; color: #666;">고객 감정 상태를 분석해서 우선순위 자동 조정</div>
                                </div>
                            </div>
                        </div>
                        <div style="background: #E1ECFF; border-radius: 8px; padding: 16px; text-align: center;">
                            <p style="margin: 0; color: #6C5CE7; font-weight: 600;">
                                🎯 목표: 완전 자동화된 고객지원 시스템 구축
                            </p>
                        </div>
                    `
                }
            };

            const content = previews[type];
            title.textContent = content.title;
            body.innerHTML = content.content;

            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        function showFAQ() {
            const modal = document.getElementById('modal');
            const title = document.getElementById('modalTitle');
            const body = document.getElementById('modalBody');

            title.textContent = '❓ 자주 묻는 질문';
            body.innerHTML = `
                <div style="margin-bottom: 24px;">
                    <div style="background: #F8F9FA; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                        <h4 style="color: #333; margin-bottom: 12px;">Q. 개발 경험이 없어도 만들 수 있나요?</h4>
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">네! 가이드에 나온 코드를 복사+붙여넣기만 하면 됩니다. "GPT와 함께 설계하기"를 클릭하면 더 쉬운 단계별 도움을 받을 수 있어요.</p>
                    </div>

                    <div style="background: #F8F9FA; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                        <h4 style="color: #333; margin-bottom: 12px;">Q. 카카오톡 API 승인이 안 돼요</h4>
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">개인 계정으로는 제한이 있어요. 비즈니스 계정으로 신청하거나 슬랙을 먼저 시도해보세요. 슬랙은 5분만에 설정 가능합니다!</p>
                    </div>

                    <div style="background: #F8F9FA; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                        <h4 style="color: #333; margin-bottom: 12px;">Q. 비용이 얼마나 드나요?</h4>
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">Google Sheets API는 무료이고, 카카오톡/슬랙도 기본 사용량은 무료입니다. 서버 호스팅만 월 5-10달러 정도 필요해요.</p>
                    </div>

                    <div style="background: #F8F9FA; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                        <h4 style="color: #333; margin-bottom: 12px;">Q. 다른 메신저도 연동 가능한가요?</h4>
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">네! 텔레그램, 디스코드, 라인 등도 비슷한 방식으로 연동 가능합니다. GPT에서 구체적인 가이드를 요청해보세요.</p>
                    </div>

                    <div style="background: #F8F9FA; border-radius: 12px; padding: 20px;">
                        <h4 style="color: #333; margin-bottom: 12px;">Q. 보안은 안전한가요?</h4>
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">API 키는 환경변수로 관리하고, 메시지는 암호화되어 전송됩니다. 민감한 정보는 필터링해서 제외할 수 있어요.</p>
                    </div>
                </div>

                <div style="background: #E1ECFF; border-radius: 12px; padding: 16px; text-align: center;">
                    <p style="margin: 0; color: #6C5CE7; font-size: 14px;">
                        💬 더 궁금한 점이 있다면 "GPT와 함께 설계하기"에서 1:1 맞춤 답변을 받아보세요!
                    </p>
                </div>
            `;

            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        function copyCode(button) {
            const codeBlock = button.parentElement;
            const code = codeBlock.textContent.replace('복사', '').trim();

            navigator.clipboard.writeText(code).then(() => {
                button.textContent = '복사됨!';
                button.style.background = '#10B981';
                setTimeout(() => {
                    button.textContent = '복사';
                    button.style.background = '#333';
                }, 2000);
            });
        }
    </script>

</body>
</html>
