import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getJobsheets } from "../../../entities/jobsheet/service";
import { getCourseList } from "../../../entities/course/api";
import { useCurrentUser } from "../../../entities/currentUser/useCurrentUser";
import type { Jobsheet } from "../../../entities/jobsheet/types";
import type { Course } from "../../../entities/course/types";
import Navbar from "../../../components/navbar/Navbar";
import JobsheetCard from "./components/JobsheetCard";
import CourseSummarySidebar from "./components/CourseSummary";
import JobsheetCardSkeleton from "./components/loading/JobsheetCardSkeleton";
import CourseSummarySidebarSkeleton from "./components/loading/CourseSummarySkeleton";
import TopProgressBar from "../../../components/loading/TopProgressBar";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useCurrentUser();

  const [jobsheets, setJobsheets] = useState<Jobsheet[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!courseId || !user) {
      setLoading(false);
      return;
    }

    const userId = user.id
    const currentCourseId = courseId

    async function loadData() {
      try {
        const courseResponse = await getCourseList(userId);

        const selectedCourse = courseResponse.data.find(
          (c) => c.id === courseId
        );

        setCourse(selectedCourse || null);

        const jobsheetData = await getJobsheets(currentCourseId);
        setJobsheets(jobsheetData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [courseId, user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">
            {course?.name ?? <TopProgressBar />}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {course?.lecturer}
          </p>
        </div>

        {/* Layout 2 kolom */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* LEFT - Jobsheet List */}
          <div className="lg:col-span-3 space-y-4">

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <JobsheetCardSkeleton key={i} />
                ))}
              </div>
            ) : jobsheets.length === 0 ? (
              <div className="bg-white p-6 rounded-xl shadow-sm text-gray-500">
                Belum ada jobsheet.
              </div>
            ) : (
              jobsheets.map((jobsheet) => (
                <JobsheetCard
                  key={jobsheet.id}
                  jobsheet={jobsheet}
                  onClick={() => navigate(`/courses/${courseId}/jobsheets/${jobsheet.id}`)}
                />
              ))
            )}

          </div>

          {/* RIGHT - Summary Sidebar */}
          <div className="lg:col-span-1">
            {loading ? (
              <CourseSummarySidebarSkeleton />
            ) : (
              <CourseSummarySidebar jobsheets={jobsheets} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
