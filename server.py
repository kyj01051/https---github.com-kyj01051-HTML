# 기존 import 문들
from fastapi import FastAPI, Request, HTTPException, Depends # <<< Depends 추가!
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel
import numpy as np
from sentence_transformers import SentenceTransformer, util
import traceback

from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime # text는 현재 필요 없지만, 있어도 무방합니다.
from sqlalchemy.orm import sessionmaker, declarative_base, Session # <<< Session 추가!
from datetime import datetime
import os # 파일 경로 관리를 위해 os 모듈 추가


# --- 데이터베이스 설정 ---
# 프로젝트 루트 폴더에 'chat_data.db' 파일로 데이터베이스를 생성합니다.
# 이 파일은 server.py와 같은 위치에 생성됩니다.
DATABASE_FILE = "chat_data.db"
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # server.py 파일의 디렉토리 경로
DATABASE_PATH = os.path.join(BASE_DIR, DATABASE_FILE)

# SQLite 데이터베이스 엔진 생성
# check_same_thread=False는 FastAPI와 같은 비동기 환경에서 필요합니다.
engine = create_engine(f"sqlite:///{DATABASE_PATH}", connect_args={"check_same_thread": False})

# 세션 생성기 (데이터베이스와 상호작용할 때 사용)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 모든 데이터베이스 모델의 기본 클래스
Base = declarative_base()

# --- 데이터베이스 모델 정의 ---
class UserQuery(Base):
    __tablename__ = "user_queries" # 테이블 이름

    id = Column(Integer, primary_key=True, index=True) # 고유 ID, 기본 키
    question = Column(String, index=True) # 사용자 질문 내용
    answer = Column(String) # <<< 이 라인을 추가하는 것입니다!
    timestamp = Column(DateTime, default=datetime.now) # 질문이 저장된 시간

    def __repr__(self):
        # repr 함수에도 answer를 추가하여 객체 출력 시 답변도 포함되도록 합니다.
        return f"<UserQuery(id={self.id}, question='{self.question}', answer='{self.answer}', timestamp='{self.timestamp}')>"

# --- 데이터베이스 테이블 생성 함수 ---
def init_db():
    print(f"데이터베이스 초기화 중: {DATABASE_PATH}")
    # Base.metadata.create_all(engine)은 정의된 모든 테이블을 데이터베이스에 생성합니다.
    # 이미 테이블이 존재하면 다시 생성하지 않습니다.
    Base.metadata.create_all(bind=engine)
    print("데이터베이스 초기화 완료.")

# --- 의존성 주입을 위한 함수 ---
# 각 요청마다 새로운 데이터베이스 세션을 생성하고, 요청이 끝나면 세션을 닫습니다.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- 이제 기존의 user_queries 리스트는 필요 없습니다. 이 줄은 삭제합니다. ---
# user_queries = []


# FastAPI 앱 인스턴스 생성
app = FastAPI()

init_db() # <<< 이 위치로 옮겨


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# static 파일 마운트
app.mount("/static", StaticFiles(directory="static"), name="static")

# 템플릿 설정
templates = Jinja2Templates(directory="templates")

# --- 여기에 루트 경로 ("/") 엔드포인트 추가 ---
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
# --------------------------------------------------

# 모델 로드
model = SentenceTransformer('snunlp/KR-SBERT-V40K-klueNLI-augSTS')

# 미리 정의된 FAQ
faq_data = [
    {
        "comment": "문헌정보학에 대해서서",
        "questions": [
            "문헌정보학은 정적인 학문인가요?",
            "문헌정보학과는 지루한 과인가요?",
            "문헌정보학과는 재미없나요?",
            "문헌정보학과는 활동적인 과인가요?",
            "문헌정보학은 조용한 사람들만 어울리나요?",
            "이 과는 딱딱한 분위기인가요?",
            "문헌정보학은 재미있나요?",
            "재미있는 활동이 많은가요?",
            "동적인 학문인가요?",
            "실습이 많나요?",
            "정적인 일만 하나요?"
        ],
        "answer": "문헌정보학은 빠르게 변화하는 정보 사회에서 '정보'를 어떻게 잘 찾고, 정리하고, 활용할지를 배우는 역동적인 학문이에요.\n 빅데이터, AI, 정보 검색 시스템 등 다양한 디지털 기술과도 연결돼 있어서 오히려 매우 **활발한** 분야랍니다.",
        "related_questions": [
            "문헌정보학과는 어떤 학과인가요?",
            "문헌정보학과의 특징이나 강점은 무엇인가요?",
            "문헌정보학과에 잘 맞는 적성은 어떤가요?"
        ]
    },
    {
        "comment": "문헌정보학과에 대해서",
        "questions": [
            "문헌정보학과는 어떤 학과인가요?",
            "문정과는 무슨 과야?",
            "문헌정보학은 뭘 배우는 학문이야?",
            "문헌정보학이 뭐 하는 학문이야?"
        ],
        "answer": "문헌정보학은 정보와 관련된 탐험을 즐기는 학문이며 정보의 폭풍 속에서 나침반 역할을 하는 역동적인 분야입니다. \n문헌정보학과에서는 다양한 정보를 수집하고 분석하여 가치 있는 지식으로 만들어내는 과정을 배울 수 있습니다!",
        "related_questions": [
            "문헌정보학과에서 배우는 과목에는 어떤 것이 있나요?",
            "문헌정보학과를 졸업하면 어떤 진로가 있나요?",
            "문헌정보학의 장점은 무엇인가요?"
        ]
    },
    {
        "comment": "책을 꼭 좋아해야 하나요?",
        "questions": [
            "책을 좋아해야 문헌정보학과에 갈 수 있나요?",
            "책 좋아해야 문정과 갈 수 있어?",
            "문헌정보학과는 책 좋아하는 사람이 가는 곳이야?",
            "책을 싫어해도 문헌정보학과 가능할까요?",
            "책을 안 좋아하면 힘들까요?",
            "독서량이 중요한가요?",
            "내성적인 사람도 괜찮을까요?",
            "책을 즐겨 읽지 않아도 될까요?",
            "독서가 필수인가요?"
        ],
        "answer": "책을 좋아하면 도움이 되긴 하지만, 문헌정보학과에 꼭 필요한 건 **정보**에 대한 관심이에요.\n 정보를 탐색하고, 정리하고, 사람들에게 전달하는 과정이 핵심이기 때문에 컴퓨터 활용 능력, 분석력, 그리고 사람들과 소통하려는 자세가 훨씬 더 중요해요.",
        "related_questions": [
            "문헌정보학과에 잘 맞는 적성은 어떤가요?",
            "문헌정보학은 정적인 학문인가요?",
            "입학 전 준비사항은 무엇인가요?"
        ]
    },
    {
        "comment": "다른 학과와 차별점",
        "questions": [
            "문헌정보학과의 특징이나 강점은 무엇인가요?",
            "문정과 장점이 뭐야?",
            "문헌정보학과의 강점 알려줘",
            "문정과는 어떤 특징이 있어?",
            "다른 과와 뭐가 다른가요?",
            "경쟁 학과랑 차이점이 있나요?",
            "무슨 점이 특이한가요?",
            "차별화되는 게 있나요?",
            "이 학과만의 강점은 뭔가요?"
        ],
        "answer": "문헌정보학과는 정보의 수집부터 활용까지 전 과정을 배우며 실무 중심 교육을 통해 다양한 역량을 기를 수 있습니다.\n 문헌정보학과는 단순히 정보만 배우는 게 아니라, 정보를 어떻게 **활용**할지를 실무 중심으로 배워요. \n예를 들어, 빅데이터 분석, 정보 시스템 설계, 사용자 맞춤 정보 서비스 같은 실제 사회에서 꼭 필요한 능력을 갖출 수 있어요.\n 또 다양한 분야(도서관, 기업, 정부, IT회사 등)로 진출할 수 있기 때문에, 진로 선택의 유연성이 매우 높아요.",
        "related_questions": [
            "문헌정보학과의 장점은 무엇인가요?",
            "문헌정보학과를 졸업하면 어떤 진로가 있나요?",
            "대구대 문헌정보학과는 어떤가요?"
        ]
    },
    {
        "comment": "졸업 후 진로",
        "questions": [
            "문헌정보학과를 졸업하면 어떤 진로가 있나요?",
            "문정과 졸업 후 진로가 뭐야?",
            "문헌정보학과 나오면 무슨 일 해?",
            "문정과 졸업하면 어디로 취업해?",
            "문헌정보학과 졸업하면 어디 가요?",
            "졸업 후 진출 분야는?",
            "사서 외에도 다른 직업도 있나요?",
            "사서 외에도 갈 수 있는 곳이 있나요?",
            "사서는 무슨 일을 하나요?",
            "취업은 어디로 가나요?",
            "전문직으로 일할 수 있나요?",
            "공공기관에 취업 가능한가요?",
            "정보 관련 직업은 뭐가 있나요?"
        ],
        "answer": "진로는 매우 다양해요! \n전통적인 도서관뿐 아니라, IT기업, 정부기관, 방송/출판, 스타트업 등 정보가 필요한 거의 모든 분야로 진출할 수 있어요. \n예를 들어 데이터 분석가, 콘텐츠 기획자, 정보 큐레이터, 지식 관리 전문가 등 미래 유망 직업들과 연결돼요.",
        "related_questions": [
            "문헌정보학과의 취업률은 어떤가요?",
            "문헌정보학과에서 배우는 과목에는 어떤 것이 있나요?",
            "문헌정보학과의 특징이나 강점은 무엇인가요?"
        ]
    },
    {
        "comment": "취업률",
        "questions": [
            "문헌정보학과의 취업률은 어떤가요?",
            "문정과 취업률 높아?",
            "문헌정보학과 졸업하면 잘 취업돼?",
            "문정과 취업 어때?",
            "취업하기 쉬운 편인가요?",
            "졸업 후 일자리 많나요?",
            "취업 경쟁은 어때요?",
            "취업 잘 되나요?"
        ],
        "answer": "문헌정보학과는 정보사회가 발전할수록 전문 인력이 더 필요한 분야라서 수요가 꾸준해요.\n 실제로 매년 높은 취업률을 유지하고 있고, 특히 데이터 기반 기업과 정보기관에서 많이 선호하는 전공이에요.",
        "related_questions": [
            "문헌정보학과를 졸업하면 어떤 진로가 있나요?",
            "문헌정보학과의 장점은 무엇인가요?",
            "대구대 문헌정보학과의 취업 지원은 어떤가요?"
        ]
    },
    {
        "comment": "수학/과학 필요 여부",
        "questions": [
            "문헌정보학과는 수학이나 과학과 관련이 있나요?",
            "문정과는 수학 잘해야 해?",
            "문헌정보학과에 과학이 필요해?",
            "문정과는 수학이나 과학이랑 관련 있어?",
            "수학 못해도 괜찮나요?",
            "문과생도 가능한가요?",
            "문과생도 지원 가능한가요?",
            "수학, 과학 안 해도 되나요?",
            "정보를 다룰 때 수학이 필요해요?",
            "기본적인 과학 지식 있어야 하나요?"
        ],
        "answer": "수학과 과학이 주요 과목은 아니지만, 기초적인 논리력과 분석력은 도움이 돼요.\n 정보 검색, 데이터 분석 등에서 약간의 수학적 사고가 필요할 수 있지만, 전공 수업에서 천천히 배워가니 걱정 안 하셔도 돼요!",
        "related_questions": [
            "문헌정보학과에 잘 맞는 적성은 어떤가요?",
            "입학 전 준비사항은 무엇인가요?",
            "문헌정보학과에서 배우는 과목에는 어떤 것이 있나요?"
        ]
    },
    {
        "comment": "외국어 중요성",
        "questions": [
            "문헌정보학과에서 외국어 실력이 필요한가요?",
            "문정과는 영어 잘해야 해?",
            "문헌정보학과에서 외국어 많이 써?",
            "문정과에 외국어 중요해?",
            "영어 잘해야 하나요?",
            "외국어 능력이 중요해요?",
            "외국어 공부 많이 하나요?",
            "영어 못하면 힘들어요?",
            "외국 자료를 다루나요?"
        ],
        "answer": "외국어 실력이 있다면 확실히 유리해요.\n 정보를 검색하거나 해외 자료를 활용할 때 영어 등 외국어 능력이 많은 도움이 되기 때문이죠.\n 특히 글로벌 정보 시스템, 논문 검색 등에서는 영어 능력이 요구될 수는 있어요. 하지만 기본적인 영어를 읽고 해석할 수 있을 정도라면 영어 실력이 진로에 영향을 주지는 않습니다.",
        "related_questions": [
            "입학 전 준비사항은 무엇인가요?",
            "문헌정보학과에 잘 맞는 적성은 어떤가요?",
            "문헌정보학과에서 배우는 과목에는 어떤 것이 있나요?"
        ]
    },
    {
        "comment": "입학 전 준비사항",
        "questions": [
            "문헌정보학과에 입학하려면 어떤 준비가 필요한가요?",
            "문정과 준비하려면 뭘 해야 해?",
            "문헌정보학과 가려면 어떤 걸 준비해야 해?",
            "문정과 입학 준비 어떻게 해?",
            "어떤 준비를 하면 좋나요?",
            "입학 전 준비는?",
            "입시 준비 어떻게 해야해요?",
            "미리 공부할 게 있을까요?",
            "어떤 경험을 하면 좋을까요?",
            "정보 검색 연습하면 도움되나요?",
            "코딩을 미리 배워야 하나요?",
            "프로그래밍도 하나요?",
            "정보 활용 능력은 어떻게 기르나요?",
            "데이터 분석 미리 해두면 되나요?"
        ],
        "answer": "정보에 대한 관심이 가장 중요해요!\n 예를 들어 자료 검색, 데이터베이스, 컴퓨터 활용 능력을 미리 익혀두면 전공 공부에 큰 도움이 돼요.\n 또, 관련 행사나 체험 프로그램에 참여해서 직접 경험을 쌓는 것도 추천해요.",
        "related_questions": [
            "책을 좋아해야 문헌정보학과에 갈 수 있나요?",
            "문헌정보학과에 잘 맞는 적성은 어떤가요?",
            "문헌정보학과는 수학이나 과학과 관련이 있나요?"
        ]
    },
    {
        "comment": "적합한 학생 유형",
        "questions": [
            "문헌정보학과에 잘 맞는 적성은 어떤가요?",
            "문정과는 어떤 성격이랑 잘 맞아?",
            "문헌정보학과에 어울리는 사람은?",
            "문정과 적성 알려줘",
            "어떤 성격이 맞나요?",
            "문헌정보학과 가려면 어떤 성향이 필요해요?",
            "어떤 사람한테 추천해요?",
            "창의적인 사람도 어울리나요?",
            "소통 좋아하는 사람에게 맞나요?",
            "분석력 중요해요?"
        ],
        "answer": "호기심 많고, 정보를 다루는 걸 좋아하는 학생에게 딱이에요!\n 추리력, 탐구심, 창의성, 소통력이 있는 학생이라면 문헌정보학과에서 크게 성장할 수 있어요.\n 보드게임이나 퀴즈, 논리 퍼즐을 좋아한다면 더 잘 맞을지도 몰라요!",
        "related_questions": [
            "책을 좋아해야 문헌정보학과에 갈 수 있나요?",
            "문헌정보학과는 정적인 학문인가요?",
            "문헌정보학과를 졸업하면 어떤 진로가 있나요?"
        ]
    },
    {
        "comment": "문헌정보학과 장점",
        "questions": [
            "문헌정보학과의 장점은 무엇인가요?",
            "문정과 가면 뭐가 좋아?",
            "문헌정보학과에 다니면 뭐가 장점이야?",
            "문정과 이점 알려줘"
        ],
        "answer": "**대구대학교 문헌정보학과 입학 시 장점은**\n1. 졸업 시 국가공인 정사서 2급 자격증 취득\n2. 취업에 강한 상위권 학과\n3. 교직이수를 통한 사서교사 진출 가능\n4. 현장경험이 풍부한 교수님의 적극적 취업지도 및 상담 등이 있습니다.",
        "related_questions": [
            "문헌정보학과의 특징이나 강점은 무엇인가요?",
            "문헌정보학과의 취업률은 어떤가요?",
            "대구대 문헌정보학과는 어떤가요?"
        ]
    },
    {
        "comment": "배우는 과목",
        "questions": [
            "문헌정보학과에서 배우는 과목에는 어떤 것이 있나요?",
            "문정과에서는 뭐 배워?",
            "문헌정보학과 수업 뭐 들어?",
            "문정과 수업 알려줘",
            "문헌정보학과에서 듣는 수업 알려줘",
            "대구대 문정과 가면 뭐 배워?",
            "어떤 걸 배워?"
        ],
        "answer": "**대구대학교 문헌정보학과에서 배울 수 있는 과목은 다음과 같습니다.** \n**1학년**: 사회과학의 눈으로 세상보기, 도서관문화사, 문헌정보학이해, 사회과학과 디지털 시민 사회, 이용자교육론, 장서관리론\n**2학년**: 공공도서관경영, 문헌정보학연구방법론, 독서지도, 정보학개론, 목록법이해, 자료분류론, 어린이서비스, 정보서비스론\n**3학년**: 대학도서관경영, 자동화목록법, 정보검색이해, 지식정보큐레이션, 학교도서관운영, 정보이용형태, 도서관프로그램운영, 자료분류특강, 취약계층서비스, 메타데이터, 진로·취업설계\n**4학년**: 도서관실무실습, 도서관정보정책, 정보시스템개발, 기록학개론, 도서관마케팅, 계량정보학, 전자출판론\n자세한 사항은 아래의 링크에서 참고 부탁드립니다.\nhttps://lis.daegu.ac.kr/curriculum/detail",
        "related_questions": [
            "문헌정보학과는 어떤 학과인가요?",
            "문헌정보학과를 졸업하면 어떤 진로가 있나요?",
            "문헌정보학과는 수학이나 과학과 관련이 있나요?"
        ]
    },
    {
        "comment": "대구대 문정과 특징",
        "questions": [
            "대구대 문정과 어때?",
            "대구대학교 문헌정보학과의 장점은 뭐야?"
        ],
        "answer": "**대구대학교 문헌정보학과**에서는 학생들의 다양한 활동을 위해 국회도서관 답사, 도서관 봉사 등 여러가지 활동을 할 수 있습니다.",
        "related_questions": [
            "문헌정보학과의 장점은 무엇인가요?",
            "문헌정보학과에서 배우는 과목에는 어떤 것이 있나요?",
            "문헌정보학과의 취업률은 어떤가요?"
        ]
    },
    {
        "comment": "더 많은 정보 얻는 법",
        "questions": [
            "어디서 더 알아볼 수 있나요?",
            "문헌정보학과 홈페이지 있나요?",
            "상담 받을 수 있나요?",
            "상담은 어디서 하나요?",
            "관련 행사에 참여할 수 있나요?",
            "직접 경험할 방법은요?"
        ],
        "answer": "문헌정보학과 홈페이지, 입학처, 진로 설명회 등에서 정보를 얻을 수 있어요.\n 특히 학과에서 진행하는 체험 프로그램, 설명회, 멘토링 등에 참여하면 직접 경험해보고 더 정확한 판단을 할 수 있어요!",
        "related_questions": [
            "대구대 문헌정보학과는 어떤가요?",
            "입학 전 준비사항은 무엇인가요?",
            "문헌정보학과의 장점은 무엇인가요?"
        ]
    }
]

@app.get("/faq")
async def get_faq_list():
    simplified_faqs = []
    for faq in faq_data:
        simplified_faqs.append({
            "question": faq["questions"][0] if faq["questions"] else "",
            "answer": faq["answer"]
        })
    return JSONResponse(content=simplified_faqs)

# 간단한 Query 클래스 정의
class Query(BaseModel):
    question: str

# 플레이스홀더 이미지 처리
@app.get("/api/placeholder/{width}/{height}")
async def placeholder(width: int, height: int):
    return JSONResponse(
        content={"width": width, "height": height, "message": "플레이스홀더 이미지"}
    )

@app.post("/api/chat")
async def chat_endpoint(request: Request, db: Session = Depends(get_db)):
    try:
        print("Received chat request")
        body = await request.json()
        print(f"Request body: {body}")

        input_question = None
        for key in body:
            if key.lower() in ["question", "message"]:
                input_question = body[key]
                break

        if not input_question:
            print("Question is empty")
            return JSONResponse(
                status_code=400,
                content={"error": "질문이 비어있습니다"}
            )

        print(f"Processing question: {input_question}")

        # --- 1. 사용자 질문과 임베딩 처리 (기존과 동일) ---
        input_embedding = model.encode(input_question, convert_to_tensor=True)

        max_score = -1.0
        best_answer = "답변이 준비되어 있지 않습니다." # 기본 답변 초기화
        best_related = []

        for faq in faq_data:
            faq_questions = faq.get("questions", [])
            if not faq_questions:
                continue

            faq_embeddings = model.encode(faq_questions, convert_to_tensor=True)
            cos_scores = util.cos_sim(input_embedding, faq_embeddings)[0]
            max_idx = cos_scores.argmax().item()
            score = cos_scores[max_idx].item()

            if score > max_score:
                max_score = score
                best_answer = faq.get("answer", "답변이 준비되어 있지 않습니다.")
                related = faq.get("related_questions")
                if related and isinstance(related, list):
                    best_related = related
                else:
                    best_related = []

        print("최종 best_related:", best_related)

        # --- 2. 최종 답변 결정 로직 (여기가 중요!) ---
        threshold = 0.6
        final_response_answer = "" # 최종적으로 사용자에게 보낼 답변 변수
        final_response_related_questions = [] # 최종적으로 사용자에게 보낼 관련 질문 변수

        if max_score < threshold:
            print(f"No good match found. Best score: {max_score}")
            final_response_answer = "죄송합니다. 해당 질문에 대한 적절한 답변을 찾지 못했습니다."
            final_response_related_questions = [] # 관련 질문 없음
        else:
            final_response_answer = best_answer
            final_response_related_questions = best_related


        # --- 3. 사용자 질문과 최종 답변을 데이터베이스에 저장하는 로직 (핵심 변경!) ---
        try:
            new_query = UserQuery(question=input_question, answer=final_response_answer) # <<< 여기에 answer=final_response_answer 추가
            db.add(new_query) # 세션에 새 쿼리 객체 추가
            db.commit()      # 변경사항을 데이터베이스에 저장
            db.refresh(new_query) # 저장된 객체(new_query)의 ID 등을 업데이트 (선택 사항이지만 좋은 습관)
            print(f"질문과 답변이 데이터베이스에 저장되었습니다: 질문='{new_query.question}', 답변='{new_query.answer}'")
        except Exception as db_error:
            db.rollback() # DB 저장 중 오류 발생 시 롤백
            print(f"Error saving to database: {str(db_error)}")
            # 데이터베이스 저장 실패해도 챗봇 응답은 계속되도록 예외 처리
            return JSONResponse(
                status_code=500,
                content={"error": f"데이터베이스 저장 중 오류 발생: {str(db_error)}"}
            )
        # ---------------------------------------------------------------------------------


        # --- 4. 최종 JSON 응답 반환 (결정된 final_response_answer 사용) ---
        return JSONResponse(
            content={
                "question": input_question,
                "answer": final_response_answer, # <<< 이 변수를 사용
                "related_questions": final_response_related_questions, # <<< 이 변수를 사용
                "similarity_score": max_score
            }
        )

    except Exception as e:
        # 이 try-except 블록은 전체 요청 처리 중 발생하는 일반적인 오류를 처리합니다.
        # DB 세션 롤백은 이미 DB 저장 로직 내에서 처리되었습니다.
        print(f"Error processing request: {str(e)}")
        traceback.print_exc()
        return JSONResponse(
            status_code=400,
            content={"error": f"요청 처리 중 오류 발생: {str(e)}"}
        )
    
@app.post("/faq")
async def answer_question(user_question: Query):
    input_question = user_question.question

    try:
        input_embedding = model.encode(input_question, convert_to_tensor=True)

        max_score = -1.0
        best_match_question = None
        best_answer = None
        best_related = []

        for faq in faq_data:
            faq_questions = faq.get("questions", [])
            if not faq_questions:
                continue

            faq_embeddings = model.encode(faq_questions, convert_to_tensor=True)
            cos_scores = util.cos_sim(input_embedding, faq_embeddings)[0]
            max_idx = cos_scores.argmax().item()
            score = cos_scores[max_idx].item()

            if score > max_score:
                max_score = score
                best_match_question = faq_questions[max_idx]
                best_answer = faq.get("answer", "답변이 준비되어 있지 않습니다.")
                best_related = faq.get("related_questions", [])
                print("Best related questions:", best_related)

        threshold = 0.6
        if max_score < threshold:
            return {
                "matched_question": None,
                "answer": "죄송합니다. 해당 질문에 대한 적절한 답변을 찾지 못했습니다.",
                "related_questions": [],
                "score": max_score
            }

        return {
            "matched_question": best_match_question,
            "answer": best_answer,
            "related_questions": best_related,
            "score": max_score
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "error": f"오류가 발생했습니다: {str(e)}"
        }

class LoginRequest(BaseModel):
    username: str
    password: str

# 저장된 사용자 질문을 반환하는 API 엔드포인트
@app.get("/api/user_queries")
async def get_user_queries(db: Session = Depends(get_db)): # db: Session = Depends(get_db) 추가
    # 데이터베이스에서 모든 UserQuery 객체를 가져옵니다.
    # order_by(UserQuery.timestamp.desc())를 사용하여 최신 질문이 먼저 오도록 정렬합니다.
    queries = db.query(UserQuery).order_by(UserQuery.timestamp.desc()).all()

    # SQLAlchemy 객체를 JSON 응답을 위해 딕셔너리 리스트로 변환합니다.
    # datetime 객체는 문자열로 변환해야 JSON 직렬화가 가능합니다.
    queries_data = [
        {"id": q.id, "question": q.question, "answer": q.answer, "timestamp": q.timestamp.isoformat()} # <<< answer 추가
        for q in queries
    ]
    return JSONResponse(content=queries_data)

@app.post("/login")
async def login(request: LoginRequest):
    if request.username == "kyj0928" and request.password == "sakwa03!!":
        return {"success": True, "message": "로그인 성공"}
    return {"success": False, "message": "아이디 또는 비밀번호가 올바르지 않습니다."}

@app.post("/logout")
async def logout():
    return {"success": True, "message": "로그아웃 성공"}

@app.get("/admin/faq")
async def admin_get_faq():
    # 기존 /faq와 같은 내용을 반환
    return await get_faq_list()

# /admin/dashboard 함수
@app.get("/admin/dashboard", response_class=HTMLResponse)
async def get_admin_dashboard(request: Request):
    # templates 폴더에 admin_dashboard.html 파일이 있어야 합니다.
    return templates.TemplateResponse("admin_dashboard.html", {"request": request})

# /admin/analytics 함수 (중복 제거)
@app.get("/admin/analytics", response_class=HTMLResponse)
async def get_admin_analytics(request: Request):
    # templates 폴더에 admin_analytics.html 파일이 있어야 합니다.
    return templates.TemplateResponse("admin_analytics.html", {"request": request})

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000) # 이 부분은 보통 파일 맨 아래에 있습니다.