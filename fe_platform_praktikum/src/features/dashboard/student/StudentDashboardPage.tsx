import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, ClipboardList } from "lucide-react";
import { getRecentActivities } from "../../../services/activity/service";
import { useCurrentUser } from "../../../services/user/useCurrentUser";
import { getJobsheets } from "../../../services/jobsheet/service";
import { getCoursesByStudentId } from "../../../services/course/service";
import { getMappedSubmissionByJobsheetId } from "../../../services/submission/service";
import type { Course } from "../../../services/course/types";
import type { Activity } from "../../../services/activity/types";
import type { Jobsheet } from "../../../services/jobsheet/types";
import type { JobsheetSubmission } from "../../../services/submission/types";
import CourseCard from "../../../components/CourseCard";
import Navbar from "../../../components/navbar/Navbar";
import SummaryCard from "../components/SummaryCard";
import UpcomingTaskSection from "./components/UpcomingTaskSection";
import ActivitySection from "./components/ActivitySection";
import WelcomeSection from "./components/WelcomeSection";
import CourseCardSkeleton from "../../../components/loading/CourseSkeleton";
import SummaryCardSkeleton from "../components/loading/SummarySkeleton";
import TopProgressBar from "../../../components/loading/TopProgressBar";

export default function StudentDashboardPage() {
  const { user } = useCurrentUser();

  const [courses, setCourses] = useState<Course[]>([]);
  const [jobsheets, setJobsheets] = useState<Jobsheet[]>([]);
  const [submissions, setSubmissions] = useState<JobsheetSubmission[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [courseData, activityResponse] = await Promise.all([
          getCoursesByStudentId(user.id),
          getRecentActivities(user.id),
        ]);

        setCourses(courseData);
        setActivities(activityResponse);

        const jobsheetResponses = await Promise.all(
          courseData.map((course) =>
            getJobsheets(course.id)
          )
        );

        const allJobsheets = jobsheetResponses.flat();
        setJobsheets(allJobsheets);

        const submissionResponses = await Promise.all(
          allJobsheets.map(async (jobsheet) => {
            try {
              return await getMappedSubmissionByJobsheetId(jobsheet.courseId, jobsheet.id)
            } catch {
              return null
            }
          })
        )

        setSubmissions(submissionResponses.filter(Boolean) as JobsheetSubmission[])
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const totalCourses = courses.length;
  const jobsheetCountByCourse = jobsheets.reduce<Record<string, number>>((acc, jobsheet) => {
    acc[jobsheet.courseId] = (acc[jobsheet.courseId] ?? 0) + 1;
    return acc;
  }, {});

  const completedJobsheets = submissions.filter(
    (submission) =>
      submission.status === "SUBMITTED" ||
      submission.status === "REVIEWING" ||
      submission.status === "ACCEPTED"
  ).length;

  const activeJobsheets = jobsheets.filter(
    (jobsheet) => {
      if (jobsheet.status === "UNPUBLISHED") return false

      const submission = submissions.find((item) => item.jobsheetId === jobsheet.id)

      return !submission || submission.status === "DRAFT" || submission.status === "REVISION"
    }
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />

      <main className="max-w-7xl mx-auto px-10 py-8">

        {/* Welcome */}
        <section className="mb-8">
          <WelcomeSection user={user} />
        </section>

        {/* Summary */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <>
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
            </>
          ) : (
            <>
              <SummaryCard
                title="Total Mata Kuliah"
                value={totalCourses}
                icon={<BookOpen size={28} />}
              />

              <SummaryCard
                title="Jobsheet Aktif"
                value={activeJobsheets}
                icon={<ClipboardList size={28} />}
              />

              <SummaryCard
                title="Jobsheet Selesai"
                value={completedJobsheets}
                icon={<CheckCircle size={28} />}
              />
            </>
          )}
        </section>

        {/* Recent Activity */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Apa yang Baru Hari Ini
          </h2>

          <ActivitySection
            activities={activities}
            loading={loading}
          />
        </section>

        {/* Mata Kuliah & Upcoming Task */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">

          {/* Mata Kuliah */}
          <div className="lg:col-span-3">
            <h2 className="text-lg font-semibold mb-4">
              Mata Kuliah Aktif
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <CourseCardSkeleton key={i} />
                ))
              ) : (
                courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    jobsheetCount={jobsheetCountByCourse[course.id] ?? 0}
                    onClick={() =>
                      navigate(`/courses/${course.id}`)
                    }
                  />
                ))
              )}
            </div>
          </div>

          {/* Upcoming Task */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">
              Praktikum sedang berlangsung
            </h2>

            <UpcomingTaskSection
              jobsheets={jobsheets}
              loading={loading}
            />
          </div>

        </section>
      </main>
    </div>
  );
}
