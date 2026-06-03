export type ExecutionClientMessage =
  | {
      type: "run"
      language: string
      code: string
      files?: { path: string; content: string }[]
      mainClass?: string
      entryFile?: string
    }
  | { type: "input"; value: string }
  | { type: "stop" }

export type ExecutionServerMessage =
  | { type: "started"; data: string }
  | { type: "output"; data: string }
  | { type: "error"; data: string }
  | { type: "exit"; code?: number; data?: string }
  | { type: "timeout"; data: string }
  | { type: "stopped"; data: string }
  | { type: "runner_closed" }
