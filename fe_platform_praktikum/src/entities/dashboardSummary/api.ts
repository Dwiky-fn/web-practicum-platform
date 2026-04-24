import { mockCourseList } from "../course/mocks";
import type { DashboardSummary } from "./types";
import type { Jobsheet } from "../../services/jobsheet/types";

export async function getDashboardSummaryData(
  userId: string,
  jobsheets: Jobsheet[]
): Promise<DashboardSummary> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const userCourses = mockCourseList.data.filter(
        (course) => course.userId === userId
      );

      resolve({
        totalCourses: userCourses.length,
        pendingTasks: jobsheets.filter(
          (j) => j.status !== "ACCEPTED" && j.status !== "UNPUBLISHED"
        ).length,
        completedPractikum: jobsheets.filter(
          (j) => j.status === "ACCEPTED"
        ).length,
      });
    }, 400);
  });
}