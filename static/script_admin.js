document.addEventListener('DOMContentLoaded', () => {
    // 이 파일은 admin_dashboard.html 페이지에서만 로드되어야 합니다.
    // 따라서, admin_dashboard.html에 있는 요소들만 여기서 핸들링합니다.

    const navButtons = document.querySelectorAll('.admin-nav .nav-btn');
    const adminContents = document.querySelectorAll('.admin-content');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const targetId = button.dataset.target;
            adminContents.forEach(content => {
                if (content.id === targetId) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
        });
    });

    // 이 아래에 FAQ 관리, 로그 관리, 차트 생성 등
    // 관리자 페이지에만 필요한 모든 코드를 추가하세요.

    // 예시: FAQ 관리 탭 관련 코드
    const faqList = document.getElementById('faqList');
    const newFaqBtn = document.getElementById('newFaqBtn');
    const faqFormContainer = document.getElementById('faqFormContainer');
    const faqForm = document.getElementById('faqForm');
    const saveFaqBtn = document.getElementById('saveFaqBtn');
    const cancelFaqBtn = document.getElementById('cancelFaqBtn');
    const noFaqData = document.getElementById('noFaqData');

    let editingFaqId = null;

    // FAQ 목록 불러오기
    async function loadFaqs() {
        try {
            const response = await fetch('/api/faqs');
            const faqs = await response.json();
            faqList.innerHTML = '';
            
            if (faqs.length === 0) {
                noFaqData.style.display = 'block';
            } else {
                noFaqData.style.display = 'none';
                faqs.forEach(faq => {
                    const faqItem = document.createElement('div');
                    faqItem.classList.add('faq-item');
                    faqItem.innerHTML = `
                        <div class="faq-question">${faq.questions.join(', ')}</div>
                        <div class="faq-answer">${faq.answer}</div>
                        <div class="faq-actions">
                            <button class="action-btn edit-btn" data-id="${faq.id}">수정</button>
                            <button class="action-btn delete-btn" data-id="${faq.id}">삭제</button>
                        </div>
                    `;
                    faqList.appendChild(faqItem);
                });
            }

            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    editFaq(id);
                });
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    deleteFaq(id);
                });
            });
            
        } catch (error) {
            console.error('Error loading FAQs:', error);
        }
    }

    // FAQ 추가/수정 폼 표시
    newFaqBtn.addEventListener('click', () => {
        faqFormContainer.style.display = 'block';
        faqForm.reset();
        editingFaqId = null;
    });

    // FAQ 수정
    async function editFaq(id) {
        try {
            const response = await fetch(`/api/faqs/${id}`);
            const faq = await response.json();
            
            document.getElementById('faqQuestions').value = faq.questions.join('\n');
            document.getElementById('faqAnswer').value = faq.answer;
            document.getElementById('faqRelated').value = faq.related_questions ? faq.related_questions.join('\n') : '';
            
            faqFormContainer.style.display = 'block';
            editingFaqId = id;
        } catch (error) {
            console.error('Error fetching FAQ for edit:', error);
        }
    }

    // FAQ 삭제
    async function deleteFaq(id) {
        if (!confirm('정말로 이 FAQ를 삭제하시겠습니까?')) {
            return;
        }
        try {
            await fetch(`/api/faqs/${id}`, { method: 'DELETE' });
            alert('FAQ가 삭제되었습니다.');
            loadFaqs();
        } catch (error) {
            console.error('Error deleting FAQ:', error);
        }
    }

    // FAQ 저장 (추가/수정)
    faqForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const questions = document.getElementById('faqQuestions').value.split('\n').map(q => q.trim()).filter(q => q);
        const answer = document.getElementById('faqAnswer').value;
        const related_questions = document.getElementById('faqRelated').value.split('\n').map(q => q.trim()).filter(q => q);

        const data = {
            questions: questions,
            answer: answer,
            related_questions: related_questions
        };

        const method = editingFaqId ? 'PUT' : 'POST';
        const url = editingFaqId ? `/api/faqs/${editingFaqId}` : '/api/faqs';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                alert('FAQ가 성공적으로 저장되었습니다.');
                faqFormContainer.style.display = 'none';
                loadFaqs();
            } else {
                alert('저장 실패: ' + response.statusText);
            }
        } catch (error) {
            console.error('Error saving FAQ:', error);
        }
    });

    // 초기 FAQ 목록 로드
    loadFaqs();
});