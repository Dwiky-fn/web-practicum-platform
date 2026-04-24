import { jobsheetMocks } from "./mocks";
import type { Jobsheet } from "../../services/jobsheet/types";

export async function fetchJobsheetsByCourse(
  courseId: string
): Promise<Jobsheet[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        jobsheetMocks.filter(
          (jobsheet) => jobsheet.courseId === courseId
        )
      );
    }, 500);
  });
}
