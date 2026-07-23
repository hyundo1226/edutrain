// localStorage 영속성. 브라우저 전용 (SSR 가드). 의존성: types.
import type { Material, SessionRecord, Stats, WeaknessEntry } from "@/types/quiz";
import { EMPTY_STATS } from "@/lib/stats";

const KEYS = {
  materials: "edutrain:materials",
  sessions: "edutrain:sessions",
  stats: "edutrain:stats",
  weaknesses: "edutrain:weaknesses",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ---- Materials ----
export function loadMaterials(): Material[] {
  return read<Material[]>(KEYS.materials, []);
}
export function saveMaterials(materials: Material[]): void {
  write(KEYS.materials, materials);
}
export function addMaterial(material: Material): Material[] {
  const next = [material, ...loadMaterials()];
  saveMaterials(next);
  return next;
}

// ---- Sessions ----
export function loadSessions(): SessionRecord[] {
  return read<SessionRecord[]>(KEYS.sessions, []);
}
export function saveSessions(sessions: SessionRecord[]): void {
  write(KEYS.sessions, sessions);
}
export function addSession(session: SessionRecord): SessionRecord[] {
  const next = [...loadSessions(), session];
  saveSessions(next);
  return next;
}

// ---- Stats ----
export function loadStats(): Stats {
  return read<Stats>(KEYS.stats, EMPTY_STATS);
}
export function saveStats(stats: Stats): void {
  write(KEYS.stats, stats);
}

// ---- Weaknesses ----
export function loadWeaknesses(): WeaknessEntry[] {
  return read<WeaknessEntry[]>(KEYS.weaknesses, []);
}
export function saveWeaknesses(entries: WeaknessEntry[]): void {
  write(KEYS.weaknesses, entries);
}

/** 테스트·초기화용: 모든 EduTrain 로컬 데이터 제거 */
export function clearAll(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
}
