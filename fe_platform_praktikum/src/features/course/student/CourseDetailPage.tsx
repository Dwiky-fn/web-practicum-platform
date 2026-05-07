import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourseById } from "../../../services/course/service";
import { getJobsheets } from "../../../services/jobsheet/service";
import { getMappedSubmissionByJobsheetId } from "../../../services/submission/service";
import type { JobsheetSubmission } from "../../../services/submission/types";
import type { Jobsheet } from "../../../services/jobsheet/types";
import type { Course } from "../../../services/course/types";
import Navbar from "../../../components/navbar/Navbar";
import JobsheetCard from "./components/JobsheetCard";
import CourseSummarySidebar from "./components/CourseSummary";
import JobsheetCardSkeleton from "./components/loading/JobsheetCardSkeleton";
import CourseSummarySidebarSkeleton from "./components/loading/CourseSummarySkeleton";
import TopProgressBar from "../../../components/loading/TopProgressBar";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();

  const [jobsheets, setJobsheets] = useState<Jobsheet[]>([]);
  const [submissions, setSubmissions] = useState<JobsheetSubmission[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }

    const currentCourseId = courseId

    async function loadData() {
      try {
        const selectedCourse = await getCourseById(currentCourseId);
        setCourse(selectedCourse);

        const jobsheetData = await getJobsheets(currentCourseId);
        setJobsheets(jobsheetData);

        const submissionList = await Promise.all(
          jobsheetData.map(async (j) => {
            try {
              return await getMappedSubmissionByJobsheetId(currentCourseId, j.id);
            } catch {
              return null;
            }
          })
        );

        // filter null (kalau belum ada submission)
        setSubmissions(
          submissionList.filter(Boolean) as JobsheetSubmission[]
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [courseId]);

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
            {course?.code}
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
              jobsheets.map((jobsheet) => {
                const submission = submissions.find(
                  (s) => s.jobsheetId === jobsheet.id
                );

                return (
                  <JobsheetCard
                    key={jobsheet.id}
                    jobsheet={jobsheet}
                    submission={submission}
                    onClick={() =>
                      navigate(`/courses/${courseId}/jobsheets/${jobsheet.id}`)
                    }
                  />
                );
              })
            )}

          </div>

          {/* RIGHT - Summary Sidebar */}
          <div className="lg:col-span-1">
            {loading ? (
              <CourseSummarySidebarSkeleton />
            ) : (
              <CourseSummarySidebar
                jobsheets={jobsheets}
                submissions={submissions}  
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
