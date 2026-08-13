import { apiFetch } from "../api";
import type { Course } from "./types";

export const getCourseById = async (courseId: string): Promise<Course> => {
  const res = await apiFetch(`/mata-kuliah/${courseId}`);

  return res.data.course;
};

export const getAllCourses = async (): Promise<Course[]> => {
  const res = await apiFetch(`/mata-kuliah`);

  return res.data.courses;
};

export const getCoursesByStudentId = async (
  studentId: string,
  options?: { scope?: "active" | "history" }
): Promise<Course[]> => {
  const scope = options?.scope || "active";
  const res = await apiFetch(`/students/${studentId}/mata-kuliah?scope=${scope}`);

  return res.data.courses;
};
