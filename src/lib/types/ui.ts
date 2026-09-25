export type ConnectionStatus = "idle" | "connecting" | "connected" | "failed";

export type SourceTab = "library" | "playlist";

export type GenerationState =
  /** 대기 중. `result`는 직전 생성 결과 안내. */
  | { phase: "idle"; result: GenerationResult | null }
  /** 슬라이드 목록 확인 중. */
  | { phase: "collecting" }
  /** 슬라이드 이미지를 PDF에 넣는 중. */
  | { phase: "rendering"; done: number; total: number };

export type GenerationResult = {
  type: "success" | "info" | "error";
  message: string;
};
