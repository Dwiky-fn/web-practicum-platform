import { getCourseList } from "./api";
import type { Course } from "./types";

export async function getCourses(userId: string): Promise<Course[]> {
  const response = await getCourseList(userId);
  return response.data;
}
