// EduTrain 도메인 타입. 의존성 없음 (Architecture 레이어 1).
// 모든 로컬 저장 엔티티와 엔진 API 계약을 여기서 정의한다.

export type QuestionType = "mc" | "short" | "essay";
export type Difficulty = "easy" | "medium" | "hard";

/** 학습자료 */
export interface Material {
  id: string;
  title: string;
  content: string;
  createdAt: number; // epoch ms
}

/** 문항 */
export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  tags: string[]; // 주제 태그, 항상 1개 이상 (S1-5)
  difficulty: Difficulty;
  choices?: string[]; // mc 전용
  answer?: string; // mc/short 정답
  explanation?: string; // 해설
  rubric?: string; // essay 채점 기준 (생성 시 함께 산출)
}

/** 세트 */
export interface QuizSet {
  id: string;
  materialId: string;
  questions: Question[];
  createdAt: number;
}

/** 문항별 채점 결과 */
export interface AnswerResult {
  questionId: string;
  given: string;
  correct: boolean;
  score: number; // 0~100
  feedback?: string;
}

/** 완료된 세션 기록 */
export interface SessionRecord {
  id: string;
  materialId: string;
  score: number; // 획득 점수 합
  total: number; // 만점 (문항 수 * 100)
  weakTags: string[]; // 이 세션에서 드러난 약점 태그
  completedAt: number; // epoch ms
}

/** 누적 진척 */
export interface Stats {
  cumulativeScore: number;
  streakDays: number;
  lastStudyDate: string; // YYYY-MM-DD (로컬 날짜)
  bestCorrectStreak: number;
}

/** 약점 태그 */
export interface WeaknessEntry {
  tag: string;
  wrongCount: number;
  mastered: boolean;
}

/**
 * 게임화(잔디·관심사 배지·레벨) 상태. 기존 Stats/SessionRecord와 완전히 독립된 저장소 —
 * 이 기능 도입 이전 학습 이력은 담지 않는다(INV-1, artifacts/gamification/spec.md).
 */
export interface GamificationState {
  levelScore: number; // 이 기능 도입 이후 누적 점수 (레벨 계산 전용, cumulativeScore와 별개)
  tagCounts: Record<string, number>; // 태그 → 이 기능 도입 이후 그 태그 문항을 푼 총 횟수(정답/오답 무관)
  dailyActivity: Record<string, number>; // "YYYY-MM-DD" → 그 날 푼 문항 수 합계
}

// ---- 엔진 API 계약 ----

/** POST /api/generate 요청 본문 */
export interface GenerateParams {
  material: string; // 자료 본문
  types: QuestionType[];
  difficulty: Difficulty;
  count: number;
  weakTags?: string[]; // 있으면 우선 출제 (S6-1)
}

/** POST /api/grade 요청 본문 */
export interface GradeEssayParams {
  prompt: string; // 문항
  rubric?: string; // 채점 기준
  answer: string; // 학습자 답안
}

/** 서술형 채점 결과 */
export interface EssayGrade {
  score: number; // 0~100
  feedback: string;
}
