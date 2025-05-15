document.addEventListener('DOMContentLoaded', function () {
    // 전역 변수 설정
    let isLoggedIn = false;
    let lastUserQuestion = '';
    
    // DOM 요소 가져오기 (최상단에 한 번만)
    const messagesContainer = document.getElementById('messagesContainer');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginForm = document.getElementById('loginForm');
    const submitLoginBtn = document.getElementById('submitLoginBtn');
    const adminBadge = document.getElementById('adminBadge');
    const adminMenu = document.getElementById('adminMenu');
    const userContent = document.getElementById('userContent');
    const adminContent = document.getElementById('adminContent');
    const adminTabs = document.querySelectorAll('.admin-tab');
    const tabs = document.querySelectorAll('.tab');
    const adminContentTabs = document.querySelectorAll('.admin-content');
    
    // 이벤트 리스너 등록
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();  // 엔터 누를 때 줄바꿈 방지
            sendMessage();
        }
    });
    
    clearChatBtn.addEventListener('click', clearChat);
    loginBtn.addEventListener('click', toggleLoginForm);
    submitLoginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    
    adminTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');
            switchAdminTab(tabName);
        });
    });
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');
            switchAdminTab(tabName);
        });
    });
    
    // ------------------- 질문-답변 관련 -------------------
    
let isFirstUserMessageSent = false;  // 첫 사용자 질문 여부 상태 변수

// 최근 질문 목록 업데이트 함수
function updateRecentQuestions() {
    fetch('/api/admin/recent-questions')
        .then(response => response.json())
        .then(data => {
            const recentList = document.getElementById('recentQuestionsList');
            if (recentList) {
                recentList.innerHTML = '';
                data.questions.forEach(q => {
                    const li = document.createElement('li');
                    li.textContent = q;
                    recentList.appendChild(li);
                });
            }
        })
        .catch(err => console.error('최근 질문 로딩 실패:', err));
}

// 봇 통계 데이터 업데이트 함수
function updateBotStatistics() {
    fetch('/api/admin/statistics')
        .then(response => response.json())
        .then(data => {
            const statTotal = document.getElementById('statTotalQuestions');
            const statAnswered = document.getElementById('statAnsweredQuestions');
            const statUnanswered = document.getElementById('statUnansweredQuestions');
            if (statTotal) statTotal.textContent = data.totalQuestions;
            if (statAnswered) statAnswered.textContent = data.answeredQuestions;
            if (statUnanswered) statUnanswered.textContent = data.unansweredQuestions;
        })
        .catch(err => console.error('통계 로딩 실패:', err));
}

// 이벤트 리스너 등록
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();  // 엔터 누를 때 줄바꿈 방지
        sendMessage();
    }
});

clearChatBtn.addEventListener('click', clearChat);
loginBtn.addEventListener('click', toggleLoginForm);
submitLoginBtn.addEventListener('click', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

adminTabs.forEach(tab => {
    tab.addEventListener('click', function () {
        const tabName = this.getAttribute('data-tab');
        switchAdminTab(tabName);
    });
});

tabs.forEach(tab => {
    tab.addEventListener('click', function () {
        const tabName = this.getAttribute('data-tab');
        switchAdminTab(tabName);
    });
});

// 질문-답변 관련

function sendMessage() {
    const message = messageInput.value.trim();
    if (message === '') return;

    addUserMessage(message);
    lastUserQuestion = message;
    messageInput.value = '';

    // 첫 메시지 전송 여부 업데이트
    isFirstUserMessageSent = true;

    fetchBotResponse(message);
}

function fetchBotResponse(userMessage) {
    const loadingMessage = addBotMessage('응답을 생성하는 중입니다...', []);

    fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage })
    })
    .then(response => response.json())
    .then(data => {
        loadingMessage.remove();
        displayChatMessage(data.answer, data.relatedQuestions || []);

        // 로그인 상태면 최근 질문과 통계 업데이트
        if (isLoggedIn) {
            updateRecentQuestions();
            updateBotStatistics();
        }
    })
    .catch(error => {
        loadingMessage.remove();
        addBotMessage('죄송합니다, 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', []);
        console.error('Error:', error);
    });
}

// 사용자 메시지 화면에 표시 (말풍선 스타일)
function addUserMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user';
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

// 봇 메시지(로딩 등) 화면에 표시 (말풍선 스타일)
function addBotMessage(text, relatedQuestions) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message bot';
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
    return messageElement;
}

// 답변 + 연관 질문 버튼 한꺼번에 말풍선으로 표시
function displayChatMessage(answerText, relatedQuestions) {
    // 봇 답변 메시지 추가
    const botMessage = document.createElement('div');
    botMessage.className = 'message bot';
    botMessage.textContent = answerText;
    messagesContainer.appendChild(botMessage);

    // 연관 질문 컨테이너 (기존에 있으면 삭제하고 새로 만듦)
    let relatedContainer = document.getElementById('relatedQuestionsContainer');
    if (relatedContainer) {
        relatedContainer.remove();
    }
    
    // 첫 사용자 질문이 있었고 연관 질문이 존재할 때만 연관 질문 버튼 표시
    if (isFirstUserMessageSent && relatedQuestions && relatedQuestions.length > 0) {
        relatedContainer = document.createElement('div');
        relatedContainer.id = 'relatedQuestionsContainer';
        relatedContainer.style.marginTop = '10px';
        
        relatedQuestions.forEach(question => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'related-question-btn'; // 스타일링용 클래스
            btn.textContent = question;

            btn.addEventListener('click', () => {
                messageInput.value = question;  // 입력창에 질문 넣기
                sendMessage();                 // 바로 전송
            });

            relatedContainer.appendChild(btn);
        });

        messagesContainer.appendChild(relatedContainer);
    }

    scrollToBottom();
}

// 스크롤 아래로
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
    
    // ------------------- 기본 UI 및 관리자 기능 -------------------
    
    function clearChat() 
    {
        messagesContainer.innerHTML = '';
        const answerElement = document.getElementById('answer-container');
        if (answerElement) {
            answerElement.style.display = 'none';
        }
        isFirstUserMessageSent = false;  // 대화 초기화 시 첫 질문 여부 초기화
        displayChatMessage("안녕하세요! 대구대학교 문헌정보학과 챗봇입니다. 무엇을 도와드릴까요?", []);
    }
    

    
    function toggleLoginForm() {
        loginForm.classList.toggle('show');
    }
    
    function handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                isLoggedIn = true;
                adminBadge.classList.add('show');
                loginBtn.style.display = 'none';
                logoutBtn.style.display = 'block';
                adminMenu.style.display = 'block';
                loginForm.classList.remove('show');
                
                loadAdminData();
            } else {
                alert('로그인 실패: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('로그인 중 오류가 발생했습니다.');
        });
    }
    
    function handleLogout() {
        fetch('/api/logout', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                isLoggedIn = false;
                adminBadge.classList.remove('show');
                loginBtn.style.display = 'block';
                logoutBtn.style.display = 'none';
                adminMenu.style.display = 'none';
                adminContent.style.display = 'none';
                userContent.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
    
    function switchAdminTab(tabName) {
        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        adminTabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        adminContentTabs.forEach(content => {
            if (content.id === tabName + 'Tab') {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        userContent.style.display = 'none';
        adminContent.style.display = 'block';
        
        loadTabData(tabName);
    }
    
    function loadAdminData() {
        switchAdminTab('dashboard');
    }
    
    function loadTabData(tabName) {
        switch(tabName) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'faq':
                loadFaqData();
                break;
            case 'logs':
                loadLogsData();
                break;
            case 'analytics':
                loadAnalyticsData();
                break;
        }
    }
    
    // 상태 메시지를 보여줄 div
    const statusDiv = document.getElementById('statusMessage');
    
    function showStatus(message) {
        if (statusDiv) {
            statusDiv.textContent = message;
        }
        console.log(message);
    }
    
    // 대시보드 데이터 로드 및 표시
    function loadDashboardData() {
        showStatus('대시보드 데이터 로딩 중...');
        
        // 대시보드 컨테이너 가져오기
        const dashboardContainer = document.getElementById('dashboardTab');
        if (!dashboardContainer) return;
        
        // API에서 데이터 가져오기 (모의 데이터 사용)
        fetch('/api/admin/dashboard')
            .then(response => {
                if (!response.ok) {
                    // 서버 연결 실패 시 모의 데이터 사용
                    return {
                        totalQuestions: 1243,
                        answeredQuestions: 1156,
                        unansweredQuestions: 87,
                        activeUsers: 152,
                        topQuestions: [
                            { question: "수강신청은 어떻게 하나요?", count: 78 },
                            { question: "도서관 개방 시간은 언제인가요?", count: 65 },
                            { question: "졸업 요건은 무엇인가요?", count: 52 },
                            { question: "문헌정보학과 전공필수 과목은 무엇인가요?", count: 45 },
                            { question: "학점 이수 체계는 어떻게 되나요?", count: 38 }
                        ]
                    };
                }
                return response.json();
            })
            .then(data => {
                // 대시보드 데이터로 UI 업데이트
                dashboardContainer.innerHTML = `
                    <h2>챗봇 대시보드</h2>
                    
                    <div class="dashboard-stats">
                        <div class="stat-card">
                            <h3>총 질문</h3>
                            <p class="stat-number">${data.totalQuestions || 0}</p>
                        </div>
                        <div class="stat-card">
                            <h3>응답된 질문</h3>
                            <p class="stat-number">${data.answeredQuestions || 0}</p>
                        </div>
                        <div class="stat-card">
                            <h3>미응답 질문</h3>
                            <p class="stat-number">${data.unansweredQuestions || 0}</p>
                        </div>
                        <div class="stat-card">
                            <h3>활성 사용자</h3>
                            <p class="stat-number">${data.activeUsers || 0}</p>
                        </div>
                    </div>
                    
                    <div class="dashboard-section">
                        <h3>최다 질문 TOP 5</h3>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>질문</th>
                                    <th>빈도</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(data.topQuestions || []).map(q => `
                                    <tr>
                                        <td>${q.question}</td>
                                        <td>${q.count}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                
                showStatus('대시보드 데이터 로딩 완료');
            })
            .catch(error => {
                console.error('대시보드 데이터 로딩 실패:', error);
                dashboardContainer.innerHTML = '<p class="error-message">대시보드 데이터를 로드하는 중 오류가 발생했습니다.</p>';
                showStatus('대시보드 데이터 로딩 실패');
            });
    }
    
    // FAQ 데이터 로드 및 표시
    function loadFaqData() {
        showStatus('FAQ 데이터 로딩 중...');
        
        const faqContainer = document.getElementById('faqTab');
        if (!faqContainer) return;
        
        // API에서 FAQ 데이터 가져오기 (모의 데이터 사용)
        fetch('/api/admin/faq')
            .then(response => {
                if (!response.ok) {
                    // 서버 연결 실패 시 모의 데이터 사용
                    return {
                        faqItems: [
                            { id: 1, question: "문헌정보학과는 어떤 학과인가요?", answer: "문헌정보학과는 도서관 및 정보 서비스 분야의 전문가를 양성하는 학과입니다." },
                            { id: 2, question: "졸업 후 진로는 어떻게 되나요?", answer: "도서관 사서, 정보 전문가, 기록물 관리사, 출판 관련 직종 등으로 진출할 수 있습니다." },
                            { id: 3, question: "사서 자격증은 어떻게 취득하나요?", answer: "문헌정보학 전공 필수 과목을 이수하면 2급 정사서 자격증을 취득할 수 있습니다." },
                            { id: 4, question: "도서관 실습은 필수인가요?", answer: "실습은 필수 과목이며, 3학년 때 공공도서관이나 대학도서관에서 진행합니다." },
                            { id: 5, question: "전공 필수 과목은 무엇인가요?", answer: "정보조직론, 정보서비스론, 도서관경영론, 정보검색론 등이 있습니다." }
                        ]
                    };
                }
                return response.json();
            })
            .then(data => {
                // FAQ 관리 UI 생성
                faqContainer.innerHTML = `
                    <h2>QnA 관리 페이지</h2>
                    
                    <div class="faq-controls">
                        <button id="addFaqBtn" class="action-button">새 QnA 추가</button>
                    </div>
                    
                    <div class="faq-list">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 5%">ID</th>
                                    <th style="width: 30%">질문</th>
                                    <th style="width: 50%">답변</th>
                                    <th style="width: 15%">관리</th>
                                </tr>
                            </thead>
                            <tbody id="faqTableBody">
                                ${(data.faqItems || []).map(item => `
                                    <tr data-id="${item.id}">
                                        <td>${item.id}</td>
                                        <td>${item.question}</td>
                                        <td>${item.answer}</td>
                                        <td>
                                            <button class="edit-faq-btn">수정</button>
                                            <button class="delete-faq-btn">삭제</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div id="faqFormContainer" class="form-container" style="display: none;">
                        <h3 id="faqFormTitle">새 QnA 추가</h3>
                        <form id="faqForm">
                            <input type="hidden" id="faqId" value="">
                            <div class="form-group">
                                <label for="faqQuestion">질문:</label>
                                <input type="text" id="faqQuestion" required>
                            </div>
                            <div class="form-group">
                                <label for="faqAnswer">답변:</label>
                                <textarea id="faqAnswer" rows="5" required></textarea>
                            </div>
                            <div class="form-buttons">
                                <button type="submit" id="saveFaqBtn">저장</button>
                                <button type="button" id="cancelFaqBtn">취소</button>
                            </div>
                        </form>
                    </div>
                `;
                
                // FAQ 이벤트 핸들러 등록
                const addFaqBtn = document.getElementById('addFaqBtn');
                const faqForm = document.getElementById('faqForm');
                const cancelFaqBtn = document.getElementById('cancelFaqBtn');
                const faqFormContainer = document.getElementById('faqFormContainer');
                
                if (addFaqBtn) {
                    addFaqBtn.addEventListener('click', () => {
                        document.getElementById('faqFormTitle').textContent = '새 QnA 추가';
                        document.getElementById('faqId').value = '';
                        document.getElementById('faqQuestion').value = '';
                        document.getElementById('faqAnswer').value = '';
                        faqFormContainer.style.display = 'block';
                    });
                }
                
                if (cancelFaqBtn) {
                    cancelFaqBtn.addEventListener('click', () => {
                        faqFormContainer.style.display = 'none';
                    });
                }
                
                if (faqForm) {
                    faqForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        saveFaqItem();
                    });
                }
                
                // 수정 및 삭제 버튼 이벤트 등록
                document.querySelectorAll('.edit-faq-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const row = this.closest('tr');
                        const id = row.getAttribute('data-id');
                        const question = row.cells[1].textContent;
                        const answer = row.cells[2].textContent;
                        
                        document.getElementById('faqFormTitle').textContent = 'QnA 수정';
                        document.getElementById('faqId').value = id;
                        document.getElementById('faqQuestion').value = question;
                        document.getElementById('faqAnswer').value = answer;
                        faqFormContainer.style.display = 'block';
                    });
                });
                
                document.querySelectorAll('.delete-faq-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const row = this.closest('tr');
                        const id = row.getAttribute('data-id');
                        if (confirm('이 QnA를 삭제하시겠습니까?')) {
                            deleteFaqItem(id);
                        }
                    });
                });
                
                showStatus('FAQ 데이터 로딩 완료');
            })
            .catch(error => {
                console.error('FAQ 데이터 로딩 실패:', error);
                faqContainer.innerHTML = '<p class="error-message">FAQ 데이터를 로드하는 중 오류가 발생했습니다.</p>';
                showStatus('FAQ 데이터 로딩 실패');
            });
    }
    
    // FAQ 항목 저장 (추가 또는 수정)
    function saveFaqItem() {
        const id = document.getElementById('faqId').value;
        const question = document.getElementById('faqQuestion').value;
        const answer = document.getElementById('faqAnswer').value;
        
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/faq/${id}` : '/api/admin/faq';
        
        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, answer })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('faqFormContainer').style.display = 'none';
                loadFaqData(); // 데이터 다시 로드
            } else {
                alert('QnA 저장 실패: ' + data.message);
            }
        })
        .catch(error => {
            console.error('QnA 저장 중 오류:', error);
            alert('QnA 저장 중 오류가 발생했습니다.');
        });
    }
    
    // FAQ 항목 삭제
    function deleteFaqItem(id) {
        fetch(`/api/admin/faq/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadFaqData(); // 데이터 다시 로드
            } else {
                alert('QnA 삭제 실패: ' + data.message);
            }
        })
        .catch(error => {
            console.error('QnA 삭제 중 오류:', error);
            alert('QnA 삭제 중 오류가 발생했습니다.');
        });
    }
    
    // 로그 데이터 로드 및 표시
    function loadLogsData() {
        showStatus('로그 데이터 로딩 중...');
        
        const logsContainer = document.getElementById('logsTab');
        if (!logsContainer) return;
        
        // API에서 로그 데이터 가져오기 (모의 데이터 사용)
        fetch('/api/admin/logs')
            .then(response => {
                if (!response.ok) {
                    // 서버 연결 실패 시 모의 데이터 사용
                    return {
                        logs: [
                            { id: 1, userId: "익명", timestamp: "2025-05-15 09:23:45", question: "문헌정보학과 졸업 요건이 어떻게 되나요?", answered: true },
                            { id: 2, userId: "익명", timestamp: "2025-05-15 10:12:36", question: "도서관 개방 시간은 언제인가요?", answered: true },
                            { id: 3, userId: "익명", timestamp: "2025-05-15 11:05:19", question: "이번학기 전공 시간표는 어디서 볼 수 있나요?", answered: true },
                            { id: 4, userId: "익명", timestamp: "2025-05-15 13:27:04", question: "자료 조직론 교수님은 누구신가요?", answered: true },
                            { id: 5, userId: "익명", timestamp: "2025-05-15 14:42:58", question: "학과 사무실 위치가 어디인가요?", answered: true },
                            { id: 6, userId: "익명", timestamp: "2025-05-15 15:18:22", question: "복수전공 신청은 어떻게 하나요?", answered: false },
                            { id: 7, userId: "익명", timestamp: "2025-05-15 16:03:47", question: "사서 자격증 관련 문의", answered: true },
                            { id: 8, userId: "익명", timestamp: "2025-05-15 16:55:11", question: "학과 행사 일정이 어떻게 되나요?", answered: true }
                        ]
                    };
                }
                return response.json();
            })
            .then(data => {
                // 로그 관리 UI 생성
                logsContainer.innerHTML = `
                    <h2>로그 관리</h2>
                    
                    <div class="logs-filter">
                        <div class="filter-group">
                            <label for="dateFilter">날짜 필터:</label>
                            <input type="date" id="dateFilter">
                        </div>
                        <div class="filter-group">
                            <label for="statusFilter">상태 필터:</label>
                            <select id="statusFilter">
                                <option value="all">전체</option>
                                <option value="answered">응답됨</option>
                                <option value="unanswered">미응답</option>
                            </select>
                        </div>
                        <button id="applyFilterBtn" class="action-button">필터 적용</button>
                    </div>
                    
                    <div class="logs-list">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 5%">ID</th>
                                    <th style="width: 15%">사용자</th>
                                    <th style="width: 15%">시간</th>
                                    <th style="width: 45%">질문</th>
                                    <th style="width: 10%">상태</th>
                                    <th style="width: 10%">관리</th>
                                </tr>
                            </thead>
                            <tbody id="logsTableBody">
                                ${(data.logs || []).map(log => `
                                    <tr data-id="${log.id}">
                                        <td>${log.id}</td>
                                        <td>${log.userId}</td>
                                        <td>${log.timestamp}</td>
                                        <td>${log.question}</td>
                                        <td>${log.answered ? '<span class="status-badge answered">응답됨</span>' : '<span class="status-badge unanswered">미응답</span>'}</td>
                                        <td>
                                            <button class="view-log-btn">상세</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div id="logDetailContainer" class="detail-container" style="display: none;">
                        <h3>대화 상세 내역</h3>
                        <div id="logDetailContent" class="detail-content">
                            <!-- 상세 내용이 여기에 로드됨 -->
                        </div>
                        <div class="detail-buttons">
                            <button id="closeLogDetailBtn">닫기</button>
                        </div>
                    </div>
                `;
                
                // 로그 관련 이벤트 핸들러 등록
                const viewLogBtns = document.querySelectorAll('.view-log-btn');
                const closeLogDetailBtn = document.getElementById('closeLogDetailBtn');
                const logDetailContainer = document.getElementById('logDetailContainer');
                const applyFilterBtn = document.getElementById('applyFilterBtn');
                
                viewLogBtns.forEach(btn => {
                    btn.addEventListener('click', function() {
                        const logId = this.closest('tr').getAttribute('data-id');
                        viewLogDetail(logId);
                    });
                });
                
                if (closeLogDetailBtn) {
    closeLogDetailBtn.addEventListener('click', function() {
        logDetailContainer.style.display = 'none';
    });
}

if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', function() {
        const dateFilter = document.getElementById('dateFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        filterLogs(dateFilter, statusFilter);
    });
}

showStatus('로그 데이터 로딩 완료');
})
.catch(error => {
    console.error('로그 데이터 로딩 실패:', error);
    logsContainer.innerHTML = '<p class="error-message">로그 데이터를 로드하는 중 오류가 발생했습니다.</p>';
    showStatus('로그 데이터 로딩 실패');
});
}

// 로그 상세 정보 보기
function viewLogDetail(logId) {
const logDetailContainer = document.getElementById('logDetailContainer');
const logDetailContent = document.getElementById('logDetailContent');

// API에서 로그 상세 정보 가져오기 (모의 데이터 사용)
fetch(`/api/admin/logs/${logId}`)
    .then(response => {
        if (!response.ok) {
            // 서버 연결 실패 시 모의 데이터 사용
            return {
                id: logId,
                userId: "익명",
                timestamp: "2025-05-15 14:42:58",
                question: "학과 사무실 위치가 어디인가요?",
                answer: "문헌정보학과 사무실은 성산홀 3층 317호에 위치하고 있습니다. 운영 시간은 평일 오전 9시부터 오후 6시까지입니다.",
                relatedQuestions: [
                    "학과 교수님 연구실은 어디인가요?",
                    "학과 조교 연락처는 어떻게 되나요?",
                    "성산홀에 가는 셔틀버스 시간은 언제인가요?"
                ]
            };
        }
        return response.json();
    })
    .then(data => {
        // 로그 상세 정보 표시
        logDetailContent.innerHTML = `
            <div class="detail-item">
                <div class="detail-label">ID:</div>
                <div class="detail-value">${data.id}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">사용자:</div>
                <div class="detail-value">${data.userId}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">시간:</div>
                <div class="detail-value">${data.timestamp}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">질문:</div>
                <div class="detail-value">${data.question}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">답변:</div>
                <div class="detail-value">${data.answer || '미응답'}</div>
            </div>
            ${data.relatedQuestions && data.relatedQuestions.length > 0 ? `
                <div class="detail-item">
                    <div class="detail-label">연관 질문:</div>
                    <div class="detail-value">
                        <ul>
                            ${data.relatedQuestions.map(q => `<li>${q}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            ` : ''}
        `;
        
        logDetailContainer.style.display = 'block';
    })
    .catch(error => {
        console.error('로그 상세 정보 로딩 실패:', error);
        logDetailContent.innerHTML = '<p class="error-message">로그 상세 정보를 로드하는 중 오류가 발생했습니다.</p>';
    });
}

// 로그 필터링
function filterLogs(date, status) {
const logsTableBody = document.getElementById('logsTableBody');

// 실제로는 서버에 필터링된 데이터를 요청해야 함
// 여기서는 클라이언트 측 필터링만 시뮬레이션
const rows = logsTableBody.querySelectorAll('tr');

rows.forEach(row => {
    let show = true;
    
    // 날짜 필터 적용
    if (date) {
        const rowDate = row.cells[2].textContent.split(' ')[0]; // 날짜 부분만 추출
        if (rowDate !== date) {
            show = false;
        }
    }
    
    // 상태 필터 적용
    if (status !== 'all') {
        const isAnswered = row.cells[4].querySelector('.status-badge').classList.contains('answered');
        if ((status === 'answered' && !isAnswered) || (status === 'unanswered' && isAnswered)) {
            show = false;
        }
    }
    
    // 표시 여부 설정
    row.style.display = show ? '' : 'none';
});
}

// 통계 데이터 로드 및 표시
function loadAnalyticsData() {
showStatus('통계 데이터 로딩 중...');

const analyticsContainer = document.getElementById('analyticsTab');
if (!analyticsContainer) return;

// API에서 통계 데이터 가져오기 (모의 데이터 사용)
fetch('/api/admin/analytics')
    .then(response => {
        if (!response.ok) {
            // 서버 연결 실패 시 모의 데이터 사용
            return {
                dailyQuestions: [
                    { date: '2025-05-09', count: 45 },
                    { date: '2025-05-10', count: 38 },
                    { date: '2025-05-11', count: 22 },
                    { date: '2025-05-12', count: 57 },
                    { date: '2025-05-13', count: 63 },
                    { date: '2025-05-14', count: 52 },
                    { date: '2025-05-15', count: 41 }
                ],
                categoryDistribution: [
                    { category: '학사 정보', count: 145 },
                    { category: '수강 신청', count: 112 },
                    { category: '도서관', count: 98 },
                    { category: '학과 정보', count: 87 },
                    { category: '행사/활동', count: 56 },
                    { category: '진로/취업', count: 42 },
                    { category: '기타', count: 23 }
                ],
                responseRate: 92.8, // 응답률 (%)
                avgResponseTime: 1.2, // 평균 응답 시간 (초)
                userSatisfaction: 4.7 // 사용자 만족도 (5점 만점)
            };
        }
        return response.json();
    })
    .then(data => {
        // 통계 분석 UI 생성
        analyticsContainer.innerHTML = `
            <h2>챗봇 통계 분석</h2>
            
            <div class="stats-summary">
                <div class="stat-card">
                    <h3>응답률</h3>
                    <p class="stat-number">${data.responseRate || 0}%</p>
                </div>
                <div class="stat-card">
                    <h3>평균 응답 시간</h3>
                    <p class="stat-number">${data.avgResponseTime || 0}초</p>
                </div>
                <div class="stat-card">
                    <h3>사용자 만족도</h3>
                    <p class="stat-number">${data.userSatisfaction || 0}/5</p>
                </div>
            </div>
            
            <div class="analytics-section">
                <h3>일일 질문 통계</h3>
                <div class="chart-container">
                    <canvas id="dailyQuestionsChart"></canvas>
                </div>
            </div>
            
            <div class="analytics-section">
                <h3>카테고리별 질문 분포</h3>
                <div class="chart-container">
                    <canvas id="categoryDistributionChart"></canvas>
                </div>
            </div>
        `;
        
        // 차트 생성 (Chart.js 사용)
        renderCharts(data);
        
        showStatus('통계 데이터 로딩 완료');
    })
    .catch(error => {
        console.error('통계 데이터 로딩 실패:', error);
        analyticsContainer.innerHTML = '<p class="error-message">통계 데이터를 로드하는 중 오류가 발생했습니다.</p>';
        showStatus('통계 데이터 로딩 실패');
    });
}

// 차트 렌더링 함수
function renderCharts(data) {
// Chart.js가 로드되었는지 확인
if (typeof Chart === 'undefined') {
    // Chart.js CDN에서 로드
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = function() {
        createCharts(data);
    };
    document.head.appendChild(script);
} else {
    createCharts(data);
}
}

function createCharts(data) {
// 일일 질문 차트
const dailyCtx = document.getElementById('dailyQuestionsChart');
if (dailyCtx) {
    new Chart(dailyCtx, {
        type: 'line',
        data: {
            labels: data.dailyQuestions.map(item => item.date),
            datasets: [{
                label: '일일 질문 수',
                data: data.dailyQuestions.map(item => item.count),
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 카테고리별 분포 차트
const categoryCtx = document.getElementById('categoryDistributionChart');
if (categoryCtx) {
    new Chart(categoryCtx, {
        type: 'pie',
        data: {
            labels: data.categoryDistribution.map(item => item.category),
            datasets: [{
                data: data.categoryDistribution.map(item => item.count),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(199, 199, 199, 0.7)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}
}

// 최근 질문 업데이트 (관리자 UI)
function updateRecentQuestions() {
// 관리자 대시보드 최근 질문 섹션 업데이트
const recentQuestionsContainer = document.getElementById('recentQuestions');
if (!recentQuestionsContainer) return;

fetch('/api/admin/recent-questions')
    .then(response => response.json())
    .then(data => {
        let html = '';
        if (data.questions && data.questions.length > 0) {
            html = data.questions.map(q => `
                <div class="recent-question-item">
                    <div class="question">${q.question}</div>
                    <div class="timestamp">${q.timestamp}</div>
                </div>
            `).join('');
        } else {
            html = '<p>최근 질문이 없습니다.</p>';
        }
        recentQuestionsContainer.innerHTML = html;
    })
    .catch(error => {
        console.error('최근 질문 로딩 실패:', error);
    });
}

// 챗봇 통계 업데이트 (관리자 UI)
function updateBotStatistics() {
// 관리자 대시보드 챗봇 통계 섹션 업데이트
const botStatsContainer = document.getElementById('botStatistics');
if (!botStatsContainer) return;

fetch('/api/admin/bot-stats')
    .then(response => response.json())
    .then(data => {
        botStatsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">응답 정확도</div>
                <div class="stat-value">${data.accuracy || 0}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">평균 응답 시간</div>
                <div class="stat-value">${data.avgResponseTime || 0}초</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">사용자 만족도</div>
                <div class="stat-value">${data.satisfaction || 0}/5</div>
            </div>
        `;
    })
    .catch(error => {
        console.error('챗봇 통계 로딩 실패:', error);
    });
}

// 초기화: 기본 인사 메시지 표시
addBotMessage("안녕하세요! 대구대학교 문헌정보학과 챗봇입니다. 무엇을 도와드릴까요?", []);

// 디버그 모드 제어
const debug = false;
if (debug) {
    console.log('디버그 모드 활성화됨');
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('JavaScript 오류:', message, 'at', source, ':', lineno, ':', colno);
        console.error(error);
        return true;
    };
}
});