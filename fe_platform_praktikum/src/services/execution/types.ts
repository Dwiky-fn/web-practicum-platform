export type ExecutionClientMessage =
  | {
      type: "run"
      language: string
      code: string
      files?: { path: string; content: string }[]
      mainClass?: string
      entryFile?: string
    }
  | { type: "stdin"; data: string }
  | { type: "input"; value: string }
  | { type: "stop" }

export type ExecutionServerMessage =
  | { type: "start"; message: string }
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "error"; message: string; data?: string }
  | { type: "exit"; code?: number | null; message?: string; data?: string }
  | { type: "started"; data: string }
  | { type: "output"; data: string }
  | { type: "timeout"; data: string }
  | { type: "stopped"; data: string }
  | { type: "runner_closed" }
