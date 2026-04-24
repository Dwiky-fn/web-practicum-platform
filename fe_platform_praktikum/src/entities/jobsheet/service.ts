import { fetchJobsheetsByCourse } from "./api";
import type { Jobsheet } from "../../services/jobsheet/types";

export async function getJobsheets(courseId: string): Promise<Jobsheet[]> {
  const data = await fetchJobsheetsByCourse(courseId);

  return data;
}
