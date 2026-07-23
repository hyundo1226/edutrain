"use client";

// 클라이언트 셸 + 화면 전환. T6~T9에서 quiz/result/weak-set 화면이 실제 구현으로 교체된다.
import { useEduTrain } from "@/hooks/use-edutrain";
import { CreateSet } from "@/components/edutrain/create-set";
import { Button } from "@/components/ui/button";

export default function Page() {
  const { screen, currentSet, startSet, goTo } = useEduTrain();

  if (screen === "create") {
    return <CreateSet onGenerated={startSet} />;
  }

  if (screen === "quiz" && currentSet) {
    // T6(객관식·단답)·T7(서술형)에서 실제 풀이 화면으로 교체된다.
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p>세트 생성 완료: {currentSet.questions.length}문항</p>
      </div>
    );
  }

  // 홈 (T9에서 실제 통계·저장 자료 화면으로 교체된다)
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="text-xl font-bold">EduTrain</div>
        <Button onClick={() => goTo("create")}>+ 새 세트 만들기</Button>
      </div>
    </div>
  );
}
