# AI Evaluation Payload Contract

## Canonical Jobsheet Payload

Backend platform sends jobsheet evaluations using `schemaVersion: "1.0"`.

Required root fields:

- `schemaVersion`: `"1.0"`
- `scope`: `"jobsheet"`
- `submission`: attempt metadata
- `context`: class, student, and programming context
- `jobsheet`: jobsheet identity
- `experiments`: array, may be empty when the jobsheet has only exercises
- `exercises`: array, may be empty when the jobsheet has only experiments
- `rubric.criteria`: array
- `options`: evaluation options

`submission.source` must be one of `manual`, `auto_deadline`, or `remedial`.
`submission.attemptType` must be `normal` or `remedial`.
`submission.remedialId` must be empty for normal attempts and present for remedial attempts.

Each experiment or exercise contains:

- `files`: student files only. Empty means no student code is available.
- `templateFiles`: optional template/reference files. These are not student work.
- `execution.status`: one of `success`, `compiler_error`, `runtime_error`, `timeout`, `failed`, `not_run`, `unknown`, or `not_available`.

The AI evaluator normalizes canonical payloads to its internal request shape by copying `submission.id` into `submissionId`. Legacy payloads with top-level `submissionId` remain supported for older tests and tools.

## Safety Rules

- Never treat `templateFiles` as submitted student code.
- Auto-submit payloads with no files or no execution are valid and should be evaluated as insufficient evidence, not rejected by validation.
- Retry AI review may update AI fields, but must not reset lecturer `final_score`, `feedback`, `feedback_details`, or `decision`.
