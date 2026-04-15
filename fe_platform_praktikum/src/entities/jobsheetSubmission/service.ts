import { jobsheetSubmissionMocks } from "./mocks";
import type { JobsheetSubmission } from "./types";

export async function getSubmissionByJobsheetId(
  jobsheetId: string
): Promise<JobsheetSubmission | null> {
  const data = jobsheetSubmissionMocks.find(
    (s) => s.jobsheetId === jobsheetId
  );

  return data ?? null;
}