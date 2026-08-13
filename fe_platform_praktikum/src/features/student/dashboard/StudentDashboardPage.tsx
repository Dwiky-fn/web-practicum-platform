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
import { academicCoursePath, getCourseAcademicScope } from "../../../services/academicScope";
import CourseCard from "../../../components/CourseCard";
import Navbar from "../../../components/navbar/Navbar";
import Breadcrumbs from "../../../components/Breadcrumbs";
import SummaryCard from "../../../components/dashboard/SummaryCard";
import UpcomingTaskSection from "./components/UpcomingTaskSection";
import WelcomeSection from "./components/WelcomeSection";
import CourseCardSkeleton from "../../../components/loading/CourseSkeleton";
import SummaryCardSkeleton from "../../../components/dashboard/loading/SummarySkeleton";
import TopProgressBar from "../../../components/loading/TopProgressBar";

export default function StudentDashboardPage() {
  const { user } = useCurrentUser();

  const [courses, setCourses] = useState<Course[]>([]);
  const [jobsheets, setJobsheets] = useState<Jobsheet[]>([]);
  const [submissions, setSubmissions] = useState<JobsheetSubmission[]>([]);
  const [_activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setError("");
        const [courseData, activityResponse] = await Promise.all([
          getCoursesByStudentId(user.id, { scope: "active" }),
          getRecentActivities(user.id),
        ]);

        setCourses(courseData);
        setActivities(activityResponse);

        const jobsheetResponses = await Promise.all(
          courseData.map((course) => {
            const scope = getCourseAcademicScope(course)
            return getJobsheets(course.id, scope)
          })
        );

        const allJobsheets = jobsheetResponses.flat();
        setJobsheets(allJobsheets);

        const submissionResponses = await Promise.all(
          allJobsheets.map(async (jobsheet) => {
            try {
              const courseScope = courseData.find((course) => course.id === jobsheet.courseId)
              const scope = courseScope ? getCourseAcademicScope(courseScope) : {
                mataKuliahId: jobsheet.mataKuliahId,
                kelasPraktikumId: jobsheet.kelasPraktikumId,
              }
              return await getMappedSubmissionByJobsheetId(
                jobsheet.courseId,
                jobsheet.id,
                user.id,
                scope,
              )
            } catch {
              return null
            }
          })
        )

        setSubmissions(submissionResponses.filter(Boolean) as JobsheetSubmission[])
      } catch (error) {
        setError(error instanceof Error ? error.message : "Gagal memuat dashboard mahasiswa.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const totalCourses = courses.length;
  const jobsheetCountByCourse = jobsheets.reduce<Record<string, number>>((acc, jobsheet) => {
    const key = jobsheet.mataKuliahId || jobsheet.courseId;
    acc[key] = (acc[key] ?? 0) + 1;
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        <Breadcrumbs items={[{ label: "Dashboard" }]} />
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {/* Welcome Banner */}
        <section>
          <WelcomeSection user={user} />
        </section>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                title="Jobsheet Belum Selesai"
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

        {/* Mata Kuliah & Upcoming Task */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Mata Kuliah */}
          <div className="lg:col-span-3 flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Mata Kuliah
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <CourseCardSkeleton key={i} />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-12 px-6 text-center shadow-sm min-h-[260px]">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                  <BookOpen className="text-gray-400" size={32} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Belum Ada Mata Kuliah</h3>
                <p className="mt-1.5 max-w-sm text-sm text-gray-500">
                  Anda belum terdaftar pada mata kuliah atau kelas praktikum apapun pada semester ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <CourseCard
                    key={`${course.id}-${course.kelasPraktikumId}`}
                    course={course}
                    jobsheetCount={jobsheetCountByCourse[course.mataKuliahId || course.id] ?? 0}
                    onClick={() => navigate(academicCoursePath(course))}
                    hideProgress={true}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Task */}
          <div className="lg:col-span-2 flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Praktikum Sedang Berlangsung
            </h2>

            <UpcomingTaskSection
              jobsheets={jobsheets}
              submissions={submissions}
              loading={loading}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
