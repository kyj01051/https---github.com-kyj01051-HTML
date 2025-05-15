const submitLoginBtn = document.getElementById('submitLoginBtn');
const username = document.getElementById('username');
const password = document.getElementById('password');
const adminBadge = document.getElementById('adminBadge');
const adminMenu = document.getElementById('adminMenu');
const adminContent = document.getElementById('adminContent');
const clearChatBtn = document.getElementById('clearChatBtn');

const API_BASE_URL = 'http://127.0.0.1:8000';

const dashboardTab = document.getElementById('dashboardTab');
const faqTab = document.getElementById('faqTab');
const logsTab = document.getElementById('logsTab');
const analyticsTab = document.getElementById('analyticsTab');
const adminTabs = document.querySelectorAll('.admin-tab');
const tabContents = document.querySelectorAll('.admin-content');
const tabs = document.querySelectorAll('.tab');

document.addEventListener('DOMContentLoaded', function() {
    let messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) {
        const chatContainer = document.querySelector('.chat-container');
        const introText = document.querySelector('.intro-text');
        const inputContainer = document.querySelector('.input-container');

        messagesContainer = document.createElement('div');
        messagesContainer.className = 'messages-container';
        messagesContainer.id = 'messagesContainer';

        const initialMessage = document.createElement('div');
        initialMessage.className = 'message-block bot';
        initialMessage.innerHTML = `
            <div class="message bot">안녕하세요! 대구대학교 문헌정보학과 챗봇입니다. 무엇을 도와드릴까요?</div>
        `;
        messagesContainer.appendChild(initialMessage);

        if (introText && inputContainer) {
            chatContainer.insertBefore(messagesContainer, inputContainer);
        } else {
            chatContainer.prepend(messagesContainer);
        }
    }

    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');

    let hasUserAskedQuestion = false;

    async function sendMessage(messageText = null) {
        if (!messagesContainer || !messageInput) {
            console.error('필요한 DOM 요소가 없습니다');
            return;
        }

        if (!messageText) {
            messageText = messageInput.value.trim();
        }

        if (messageText) {
            const userMessageBlock = document.createElement('div');
            userMessageBlock.className = 'message-block user';
            userMessageBlock.innerHTML = `<div class="message user">${messageText}</div>`;
            messagesContainer.appendChild(userMessageBlock);

            messageInput.value = '';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            const loadingBlock = document.createElement('div');
            loadingBlock.className = 'message-block bot loading';
            loadingBlock.innerHTML = `
                <div class="message bot">
                    <div class="loading-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(loadingBlock);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            try {
                const response = await fetch(`${API_BASE_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: messageText })
                });

                if (!response.ok) throw new Error('응답을 받아오는데 실패했습니다');

                const data = await response.json();
                messagesContainer.removeChild(loadingBlock);

                const botMessageBlock = document.createElement('div');
                botMessageBlock.className = 'message-block bot';
                const formattedAnswer = data.answer.replace(/\n/g, '<br>');
                botMessageBlock.innerHTML = `<div class="message bot">${formattedAnswer}</div>`;
                messagesContainer.appendChild(botMessageBlock);

                if (Array.isArray(data.related_questions) && data.related_questions.length > 0) {
                    const relatedBlock = document.createElement('div');
                    relatedBlock.className = 'related-questions';

                    data.related_questions.forEach((q) => {
                        const btn = document.createElement('button');
                        btn.className = 'related-btn';
                        btn.textContent = q;
                        btn.addEventListener('click', () => {
                            sendMessage(q);
                        });
                        relatedBlock.appendChild(btn);
                    });

                    messagesContainer.appendChild(relatedBlock);
                }

            } catch (error) {
                console.error('메시지 전송 오류:', error);
                messagesContainer.removeChild(loadingBlock);

                const errorMessageBlock = document.createElement('div');
                errorMessageBlock.className = 'message-block bot error';
                errorMessageBlock.innerHTML = `
                    <div class="message bot error">
                        죄송합니다, 응답을 받아오는데 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
                    </div>
                `;
                messagesContainer.appendChild(errorMessageBlock);
            }

            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            sendMessage();
        });
    }

    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            messagesContainer.innerHTML = '';
            const initialMessage = document.createElement('div');
            initialMessage.className = 'message-block bot';
            initialMessage.innerHTML = `
                <div class="message bot">안녕하세요! 대구대학교 문헌정보학과 챗봇입니다. 무엇을 도와드릴까요?</div>
            `;
            messagesContainer.appendChild(initialMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }
});

loginBtn.addEventListener('click', function() {
    loginForm.classList.toggle('show');
});

submitLoginBtn.addEventListener('click', async function() {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username.value,
                password: password.value
            })
        });

        if (!response.ok) {
            throw new Error('로그인 실패');
        }

        const data = await response.json();

        if (!data.success) {
            alert(data.message || '아이디 또는 비밀번호가 올바르지 않습니다.');
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('username', username.value);

        adminBadge.classList.add('show');
        loginForm.classList.remove('show');
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        adminMenu.style.display = 'block';

        alert('관리자로 로그인했습니다.');

        loadDashboardData();
        loadFaqData();
        loadLogsData();
        loadAnalyticsData();

    } catch (error) {
        console.error('로그인 오류:', error);
        alert('로그인 중 오류가 발생했습니다.');
    }
});

logoutBtn.addEventListener('click', function() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');

    adminBadge.classList.remove('show');
    loginBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    adminMenu.style.display = 'none';
    adminContent.style.display = 'none';
    username.value = '';
    password.value = '';

    alert('로그아웃되었습니다.');
});

adminTabs.forEach(tab => {
    tab.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');

        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        tabs.forEach(tab => {
            tab.classList.remove('active');
        });

        document.getElementById(tabId + 'Tab').classList.add('active');
        document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');

        adminContent.style.display = 'block';
    });
});

tabs.forEach(tab => {
    tab.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');

        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        tabs.forEach(tab => {
            tab.classList.remove('active');
        });

        document.getElementById(tabId + 'Tab').classList.add('active');
        this.classList.add('active');
    });
});

// 대시보드 데이터 로드
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('인증 토큰이 없습니다');
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('대시보드 데이터 로드 실패');
        }
        
        const data = await response.json();
        
        // 통계 데이터 업데이트
        document.getElementById('totalConversations').textContent = data.totalConversations.toLocaleString();
        document.getElementById('failureRate').textContent = data.failureRate.toFixed(1) + '%';
        document.getElementById('avgScore').textContent = data.avgSimilarity.toFixed(2);
        
        // 최근 질문 테이블 업데이트
        const recentQuestionsTable = document.getElementById('recentQuestionsTable');
        recentQuestionsTable.innerHTML = '';
        
        data.recentQuestions.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDateTime(item.timestamp)}</td>
                <td>${item.question}</td>
                <td>${item.answer.length > 30 ? item.answer.substring(0, 30) + '...' : item.answer}</td>
                <td>${item.similarity.toFixed(2)}</td>
            `;
            recentQuestionsTable.appendChild(row);
        });
        
        // 자주 묻는 질문 테이블 업데이트
        const frequentQuestionsTable = document.getElementById('frequentQuestionsTable');
        frequentQuestionsTable.innerHTML = '';
        
        data.frequentQuestions.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.question}</td>
                <td>${item.frequency}</td>
            `;
            frequentQuestionsTable.appendChild(row);
        });
        
        // 워드클라우드 이미지 업데이트
        const wordcloud = document.getElementById('wordcloud');
        wordcloud.innerHTML = `<img src="${API_BASE_URL}/admin/wordcloud?token=${token}" alt="워드클라우드">`;
        
    } catch (error) {
        console.error('대시보드 데이터 로드 오류:', error);
        alert('대시보드 데이터를 불러오는데 실패했습니다.');
    }
}

async function loadFaqData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('인증 토큰이 없습니다');
        }
        
        const response = await fetch(`${API_BASE_URL}/faq`, {  // /admin/faq → /faq 로 수정
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        
        if (!response.ok) {
            throw new Error('FAQ 데이터 로드 실패');
        }
        
        const faqs = await response.json();
        
        const faqList = document.getElementById('faqList');
        faqList.innerHTML = '';  // 기존 내용 비우기
        
        if (faqs.length === 0) {
            faqList.innerHTML = '<p>등록된 FAQ가 없습니다.</p>';
            return;
        }
        
        faqs.forEach(faq => {
            const faqItem = document.createElement('div');
            faqItem.className = 'faq-item';
            
            const faqQuestion = document.createElement('div');
            faqQuestion.className = 'faq-question';
            faqQuestion.textContent = faq.questions[0] + (faq.questions.length > 1 ? ' 외 ' + (faq.questions.length - 1) + '개 질문' : '');
            
            const faqAnswer = document.createElement('div');
            faqAnswer.className = 'faq-answer';
            faqAnswer.textContent = faq.answer;
            
            const faqRelated = document.createElement('div');
            faqRelated.className = 'faq-related';
            faqRelated.textContent = faq.related && faq.related.length > 0 ? '연관 질문: ' + faq.related.join(', ') : '연관 질문이 없습니다.';
            
            const faqActions = document.createElement('div');
            faqActions.className = 'faq-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', function() {
                document.getElementById('faqQuestions').value = faq.questions.join('\n');
                document.getElementById('faqAnswer').value = faq.answer;
                document.getElementById('faqRelated').value = faq.related ? faq.related.join('\n') : '';
                document.getElementById('cancelEditBtn').style.display = 'inline-block';
                document.getElementById('saveFaqBtn').setAttribute('data-edit-id', faq.id);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', async function() {
                if (confirm('정말 이 FAQ를 삭제하시겠습니까?')) {
                    try {
                        const deleteResponse = await fetch(`${API_BASE_URL}/admin/faq/${faq.id}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (!deleteResponse.ok) {
                            throw new Error('FAQ 삭제 실패');
                        }
                        
                        loadFaqData(); // 삭제 후 목록 다시 로드
                        alert('FAQ가 삭제되었습니다.');
                    } catch (error) {
                        console.error('FAQ 삭제 오류:', error);
                        alert('FAQ 삭제에 실패했습니다.');
                    }
                }
            });
            
            faqActions.appendChild(editBtn);
            faqActions.appendChild(deleteBtn);
            
            faqItem.appendChild(faqQuestion);
            faqItem.appendChild(faqAnswer);
            faqItem.appendChild(faqRelated);
            faqItem.appendChild(faqActions);
            
            faqList.appendChild(faqItem);
        });
        
    } catch (error) {
        console.error('FAQ 데이터 로드 오류:', error);
        alert('FAQ 데이터를 불러오는데 실패했습니다.');
    }
}
  // 함수의 끝에는 닫는 괄호 하나만 있어야 

// FAQ 저장 기능
document.getElementById('saveFaqBtn').addEventListener('click', async function() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('인증 토큰이 없습니다');
        }
        
        const questions = document.getElementById('faqQuestions').value.split('\n').filter(q => q.trim());
        const answer = document.getElementById('faqAnswer').value.trim();
        const related = document.getElementById('faqRelated').value.split('\n').filter(r => r.trim());
        
        if (questions.length === 0 || !answer) {
            alert('질문과 답변을 입력해주세요.');
            return;
        }
        
        const faqData = {
            questions,
            answer,
            related
        };
        
        const editId = this.getAttribute('data-edit-id');
        let url = `${API_BASE_URL}/admin/faq`;
        let method = 'POST';
        
        if (editId) {
            url = `${API_BASE_URL}/admin/faq/${editId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(faqData)
        });
        
        if (!response.ok) {
            throw new Error('FAQ 저장 실패');
        }
        
        // 폼 초기화
        document.getElementById('faqQuestions').value = '';
        document.getElementById('faqAnswer').value = '';
        document.getElementById('faqRelated').value = '';
        document.getElementById('saveFaqBtn').removeAttribute('data-edit-id');
        document.getElementById('cancelEditBtn').style.display = 'none';
        
        // 목록 다시 로드
        loadFaqData();
        alert(editId ? 'FAQ가 수정되었습니다.' : 'FAQ가 추가되었습니다.');
        
    } catch (error) {
        console.error('FAQ 저장 오류:', error);
        alert('FAQ 저장에 실패했습니다.');
    }
});

// FAQ 수정 취소
document.getElementById('cancelEditBtn').addEventListener('click', function() {
    document.getElementById('faqQuestions').value = '';
    document.getElementById('faqAnswer').value = '';
    document.getElementById('faqRelated').value = '';
    document.getElementById('saveFaqBtn').removeAttribute('data-edit-id');
    this.style.display = 'none';
});

// 로그 데이터 로드
async function loadLogsData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('인증 토큰이 없습니다');
        }
        
        // 기간 필터 값 가져오기
        const period = document.getElementById('logPeriod').value;
        
        const response = await fetch(`${API_BASE_URL}/admin/logs?period=${period}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('로그 데이터 로드 실패');
        }
        
        const logs = await response.json();
        
        const logsTable = document.getElementById('logsTable').getElementsByTagName('tbody')[0];
        logsTable.innerHTML = '';
        
        logs.forEach(log => {
            const row = document.createElement('tr');
            
            const timestampCell = document.createElement('td');
            timestampCell.textContent = formatDateTime(log.timestamp);
            
            const questionCell = document.createElement('td');
            questionCell.textContent = log.question;
            
            const answerCell = document.createElement('td');
            answerCell.textContent = log.answer.length > 50 ? log.answer.substring(0, 50) + '...' : log.answer;
            
            // 더보기 버튼 추가
            if (log.answer.length > 50) {
                const viewMoreBtn = document.createElement('button');
                viewMoreBtn.className = 'view-more-btn';
                viewMoreBtn.textContent = '더보기';
                viewMoreBtn.addEventListener('click', function() {
                    showFullAnswerModal(log.answer);
                });
                answerCell.appendChild(viewMoreBtn);
            }
            
            const similarityCell = document.createElement('td');
            similarityCell.textContent = log.similarity ? log.similarity.toFixed(2) : 'N/A';
            
            // 유사도에 따른 색상 표시
            if (log.similarity !== null) {
                if (log.similarity >= 0.9) {
                    similarityCell.classList.add('high-score');
                } else if (log.similarity >= 0.7) {
                    similarityCell.classList.add('medium-score');
                } else {
                    similarityCell.classList.add('low-score');
                }
            }
            
            row.appendChild(timestampCell);
            row.appendChild(questionCell);
            row.appendChild(answerCell);
            row.appendChild(similarityCell);
            
            logsTable.appendChild(row);
        });
        
    } catch (error) {
        console.error('로그 데이터 로드 오류:', error);
        alert('로그 데이터를 불러오는데 실패했습니다.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 로그 필터 이벤트
    const logPeriod = document.getElementById('logPeriod');
    if (logPeriod) {
        logPeriod.addEventListener('change', loadLogsData);
    }
    
    // 모달 닫기 이벤트
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            document.getElementById('answerModal').style.display = 'none';
        });
    }
});

// 전체 답변 모달 표시 함수는 그대로 유지
function showFullAnswerModal(answer) {
    const modal = document.getElementById('answerModal');
    const modalContent = document.getElementById('modalAnswerContent');
    
    if (modal && modalContent) {
        modalContent.textContent = answer;
        modal.style.display = 'block';
    }
}

// 분석 데이터 로드
async function loadAnalyticsData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('인증 토큰이 없습니다');
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/analytics`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('분석 데이터 로드 실패');
        }
        
        const data = await response.json();
        
        // 차트 데이터 업데이트
        renderQuestionsChart(data.dailyQuestions);
        renderSimilarityChart(data.similarityDistribution);
        renderTopCategoriesChart(data.topCategories);
        
    } catch (error) {
        console.error('분석 데이터 로드 오류:', error);
        alert('분석 데이터를 불러오는데 실패했습니다.');
    }
}

// 일별 질문 수 차트 렌더링
function renderQuestionsChart(data) {
    const ctx = document.getElementById('questionsChart').getContext('2d');
    
    // 기존 차트가 있으면 파괴
    if (window.questionsChart) {
        window.questionsChart.destroy();
    }
    
    window.questionsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item.date),
            datasets: [{
                label: '질문 수',
                data: data.map(item => item.count),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// 유사도 분포 차트 렌더링
function renderSimilarityChart(data) {
    const ctx = document.getElementById('similarityChart').getContext('2d');
    
    // 기존 차트가 있으면 파괴
    if (window.similarityChart) {
        window.similarityChart.destroy();
    }
    
    window.similarityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: '질문 수',
                data: Object.values(data),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(255, 205, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(54, 162, 235, 0.7)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// 상위 카테고리 차트 렌더링
function renderTopCategoriesChart(data) {
    const ctx = document.getElementById('categoriesChart').getContext('2d');
    
    // 기존 차트가 있으면 파괴
    if (window.categoriesChart) {
        window.categoriesChart.destroy();
    }
    
    window.categoriesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.category),
            datasets: [{
                data: data.map(item => item.count),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 205, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// 날짜 포맷 함수
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 페이지 로드시 토큰 확인하여 로그인 상태 설정
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    
    if (token && storedUsername) {
        // 로그인 UI 업데이트
        adminBadge.classList.add('show');
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        adminMenu.style.display = 'block';
        
        // 관리자 데이터 로드
        loadDashboardData();
        loadFaqData();
        loadLogsData();
        loadAnalyticsData();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', async function() {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('인증 토큰이 없습니다');
                }
                
                const period = document.getElementById('logPeriod').value;
                const response = await fetch(`${API_BASE_URL}/admin/logs/export?period=${period}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('로그 내보내기 실패');
                }
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `chat_logs_${period}_${formatDateForFilename(new Date())}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
            } catch (error) {
                console.error('로그 내보내기 오류:', error);
                alert('로그 내보내기에 실패했습니다.');
            }
        });
    }
    
    // 다른 이벤트 리스너도 동일한 방식으로 처리
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                const searchQuery = searchInput.value.trim();
                if (searchQuery) {
                    messageInput.value = searchQuery;
                    sendMessage();
                    searchInput.value = '';
                }
            }
        });
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const searchBtn = document.getElementById('searchBtn');
                if (searchBtn) searchBtn.click();
            }
        });
    }
    
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (scrollToTopBtn) {
        document.getElementById('scrollToTopBtn').addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});

// 맨 위로 버튼 스크롤 이벤트는 전역 이벤트이므로 별도 처리
window.addEventListener('scroll', function() {
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (scrollToTopBtn) {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.style.display = 'block';
        } else {
            scrollToTopBtn.style.display = 'none';
        }
    }
});