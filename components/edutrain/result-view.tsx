"use client";

// 세트 결과: 점수 + 약점 주제 태그 + 성과 기반 텍스트 추천 + 약점 재출제 진입.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { scoreSet } from "@/lib/scoring";
import { weakTagsFromResults } from "@/lib/weakness";
import type { AnswerResult, QuizSet } from "@/types/quiz";

// S3-1/S4-3 제안 기본값과 일관된 추천 임계값.
const RECOMMEND_THRESHOLD = 80;

export interface ResultViewProps {
  quizSet: QuizSet;
  results: AnswerResult[];
  /**
   * 전역 누적 약점 태그가 하나라도 있는지 (completeSet 이후 상태).
   * "약점만 다시 풀기"가 이동하는 화면은 이 전역 약점을 기준으로 세트를 만들므로,
   * 버튼 활성화 여부도 이번 세션 로컬 약점(weakTags)이 아닌 이 값을 기준으로 해야
   * "버튼은 켜졌는데 다음 화면엔 약점이 없는" 불일치를 막을 수 있다.
   */
  hasActiveWeakTags: boolean;
  onRetryWeak: () => void;
  onHome: () => void;
}

/** 이번 세트에서 맞힌 문항의 태그 중 하나를 골라 심화 학습을 추천한다. */
function recommendationText(quizSet: QuizSet, results: AnswerResult[]): string {
  const byId = new Map(quizSet.questions.map((q) => [q.id, q]));
  const correctTags = new Set<string>();
  for (const r of results) {
    if (!r.correct) continue;
    byId.get(r.questionId)?.tags.forEach((t) => correctTags.add(t));
  }
  const topic = [...correctTags][0];
  return topic
    ? `잘하고 있어요! 다음으로 ${topic} 주제를 심화 학습해보세요.`
    : "잘하고 있어요! 계속 연습해보세요.";
}

export function ResultView({
  quizSet,
  results,
  hasActiveWeakTags,
  onRetryWeak,
  onHome,
}: ResultViewProps) {
  const { score, total, percentage, correctCount, count } = scoreSet(results);
  const weakTags = weakTagsFromResults(quizSet.questions, results);
  const showRecommendation = percentage >= RECOMMEND_THRESHOLD;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-lg font-bold mb-5">세트 결과</h2>

      <div className="text-center mb-5">
        <div className="text-xs text-muted-foreground">이번 세트 점수</div>
        <div className="text-4xl font-bold">{percentage}%</div>
        <div className="text-xs text-muted-foreground">
          {correctCount} / {count} 정답 ({score}/{total})
        </div>
      </div>

      {weakTags.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-bold mb-2">약점 주제</div>
          <div className="flex flex-wrap gap-2">
            {weakTags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {showRecommendation && (
        <div className="mb-5 text-sm">{recommendationText(quizSet, results)}</div>
      )}

      <div className="flex flex-col gap-2 md:flex-row">
        <Button
          className="flex-1"
          onClick={onRetryWeak}
          disabled={!hasActiveWeakTags}
        >
          약점만 다시 풀기
        </Button>
        <Button className="flex-1" variant="outline" onClick={onHome}>
          홈으로
        </Button>
      </div>
    </div>
  );
}
