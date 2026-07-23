"use client";

// 세트 진행 관리: 문항 진행률 표시 + 문항 유형별 분기 + 결과 취합.
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { QuestionObjective } from "@/components/edutrain/question-objective";
import type { AnswerResult, QuizSet } from "@/types/quiz";

export interface QuizRunnerProps {
  quizSet: QuizSet;
  /** 문항 채점 직후 호출 (세션 결과 기록은 호출자가 소유) */
  onGraded: (result: AnswerResult) => void;
  /** 마지막 문항까지 완료 시 호출 */
  onComplete: () => void;
}

export function QuizRunner({ quizSet, onGraded, onComplete }: QuizRunnerProps) {
  const [index, setIndex] = useState(0);

  const question = quizSet.questions[index];
  const total = quizSet.questions.length;
  const isLast = index === total - 1;

  function handleNext() {
    if (isLast) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">
          문항 {index + 1} / {total}
        </span>
        <Badge variant="outline">{question.tags[0]}</Badge>
      </div>
      <Progress value={(index / total) * 100} className="mb-4" />

      {(question.type === "mc" || question.type === "short") && (
        <QuestionObjective
          key={question.id}
          question={question}
          onGraded={onGraded}
          onNext={handleNext}
          nextLabel={isLast ? "결과 보기 →" : "다음 문항 →"}
        />
      )}

      {question.type === "essay" && (
        // T7에서 question-essay.tsx로 교체된다.
        <div key={question.id} className="text-sm text-muted-foreground">
          서술형 문항 (T7에서 구현)
        </div>
      )}
    </div>
  );
}
