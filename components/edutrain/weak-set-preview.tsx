"use client";

// 약점 주제 재출제 미리보기 (wireframe screen-weak-set).
// "시작" 클릭 시에만 /api/generate를 약점 태그로 호출해 실제 세트를 생성한다.
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Material, Question, QuizSet } from "@/types/quiz";

const DEFAULT_COUNT = 5;

export interface WeakSetPreviewProps {
  material: Material;
  weakTags: string[];
  count?: number;
  onStart: (material: Material, quizSet: QuizSet) => void;
}

export function WeakSetPreview({
  material,
  weakTags,
  count = DEFAULT_COUNT,
  onStart,
}: WeakSetPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material: material.content,
          types: ["mc", "short", "essay"],
          difficulty: "medium",
          count,
          weakTags,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "세트 생성에 실패했습니다");
        return;
      }
      const questions = json.questions as Question[];
      const quizSet: QuizSet = {
        id: crypto.randomUUID(),
        materialId: material.id,
        questions,
        createdAt: Date.now(),
      };
      onStart(material, quizSet);
    } catch {
      setError("세트 생성에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-lg font-bold mb-5">약점 주제 세트</h2>

      <div className="mb-4">
        <div className="text-sm font-bold mb-2">이 세트가 집중하는 약점 주제</div>
        <div className="flex flex-wrap gap-2">
          {weakTags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mb-4 text-sm text-muted-foreground">
        약점 주제 위주로 문항 {count}개가 출제됩니다.
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <Button className="w-full" onClick={handleStart} disabled={loading}>
        {loading ? "생성 중…" : error ? "다시 시도" : "시작"}
      </Button>
    </div>
  );
}
