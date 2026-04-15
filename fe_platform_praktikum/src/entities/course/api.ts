import { mockCourseList } from "./mocks";
import type { CourseListResponse } from "./types";

export async function getCourseList(userId: string): Promise<CourseListResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: mockCourseList.data.filter(
          course => course.userId === userId
        ),
      });
    }, 200);
  });
}
