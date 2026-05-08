import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, ClipboardList } from "lucide-react";
import { getRecentActivities } from "../../../entities/activity/service";
import { useCurrentUser } from "../../../entities/currentUser/useCurrentUser";
import { getJobsheets } from "../../../entities/jobsheet/service";
import { getCoursesByStudentId } from "../../../services/course/service";
import type { Course } from "../../../entities/course/types";
import type { Activity } from "../../../entities/activity/types";
import type { Jobsheet } from "../../../services/jobsheet/types";
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

        setJobsheets(jobsheetResponses.flat());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const totalCourses = courses.length;

  const completedPractikum = jobsheets.filter(
    (job) => job.status === "ACCEPTED"
  ).length;

  const pendingTasks = jobsheets.filter(
    (job) =>
      job.status !== "ACCEPTED" &&
      job.status !== "UNPUBLISHED"
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
                title="Tugas Belum Dikerjakan"
                value={pendingTasks}
                icon={<ClipboardList size={28} />}
              />

              <SummaryCard
                title="Praktikum Selesai"
                value={completedPractikum}
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
              Upcoming Praktikum
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
