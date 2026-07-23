import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BadgeList } from "@/components/edutrain/badge-list";

describe("BadgeList", () => {
  it("[S3-2][S5-1] count가 임계값(10) 이상인 태그가 배지로 표시된다", () => {
    render(<BadgeList tagCounts={{ 이진탐색: 10, 재귀: 15 }} />);
    expect(screen.getByText("🏅 이진탐색")).toBeInTheDocument();
    expect(screen.getByText("🏅 재귀")).toBeInTheDocument();
  });

  it("[S4] count가 임계값 미만인 태그는 표시되지 않는다", () => {
    render(<BadgeList tagCounts={{ 이진탐색: 9 }} />);
    expect(screen.queryByText("🏅 이진탐색")).not.toBeInTheDocument();
  });

  it("[S5-2] 배지가 하나도 없으면 안내 문구가 표시된다", () => {
    render(<BadgeList tagCounts={{}} />);
    expect(screen.getByText("아직 획득한 배지가 없습니다")).toBeInTheDocument();
  });
});
