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

export const getCoursesByStudentId = async (studentId: string): Promise<Course[]> => {
  const res = await apiFetch(`/students/${studentId}/mata-kuliah`);

  return res.data.courses;
};
