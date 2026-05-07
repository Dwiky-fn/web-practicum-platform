import { apiFetch } from "../api";
import type { Course } from "./types";

export const getCourseById = async (courseId: string): Promise<Course> => {
  const res = await apiFetch(`/courses/${courseId}`);

  return res.data.course;
};
