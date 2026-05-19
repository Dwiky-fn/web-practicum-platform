export type ExecutionClientMessage =
  | { type: "run"; code: string }
  | { type: "input"; value: string }
  | { type: "stop" }

export type ExecutionServerMessage =
  | { type: "output"; data: string }
  | { type: "error"; data: string }
  | { type: "exit"; code: number }
  | { type: "timeout"; data: string }
  | { type: "runner_closed" }
