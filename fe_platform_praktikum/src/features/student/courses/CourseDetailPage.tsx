import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { getCourseById } from "../../../services/course/service";
import { getJobsheets } from "../../../services/jobsheet/service";
import { getMappedSubmissionByJobsheetId } from "../../../services/submission/service";
import type { JobsheetSubmission } from "../../../services/submission/types";
import type { Jobsheet } from "../../../services/jobsheet/types";
import type { Course } from "../../../services/course/types";
import Navbar from "../../../components/navbar/Navbar";
import Breadcrumbs from "../../../components/Breadcrumbs";
import BackButton from "../../../components/BackButton";
import JobsheetCard from "./components/JobsheetCard";
import JobsheetCardSkeleton from "./components/loading/JobsheetCardSkeleton";
import TopProgressBar from "../../../components/loading/TopProgressBar";
import { useCurrentUser } from "../../../services/user/useCurrentUser";
import { academicJobsheetPath } from "../../../services/academicScope";

export default function CourseDetailPage() {
  const { courseId, mataKuliahId: routeMataKuliahId } = useParams<{ courseId?: string; mataKuliahId?: string }>();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get("classId") || undefined;
  const mataKuliahId = routeMataKuliahId || searchParams.get("mataKuliahId") || undefined;
  const kelasPraktikumId = searchParams.get("kelasPraktikumId") || undefined;
  const effectiveCourseId = mataKuliahId || courseId;
  const { user } = useCurrentUser();

  const [jobsheets, setJobsheets] = useState<Jobsheet[]>([]);
  const [submissions, setSubmissions] = useState<JobsheetSubmission[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (!effectiveCourseId || !user) {
      setLoading(false);
      return;
    }

    const currentCourseId = effectiveCourseId
    const studentId = user.id

    async function loadData() {
      try {
        setError("");
        const selectedCourse = await getCourseById(currentCourseId);
        setCourse(selectedCourse);

        const scope = { classId, mataKuliahId, kelasPraktikumId };
        const jobsheetData = await getJobsheets(currentCourseId, scope);
        setJobsheets(jobsheetData);

        const submissionList = await Promise.all(
          jobsheetData.map(async (j) => {
            try {
              return await getMappedSubmissionByJobsheetId(
                currentCourseId,
                j.id,
                studentId,
                scope,
              );
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
        setError(error instanceof Error ? error.message : "Gagal memuat detail mata kuliah.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [classId, effectiveCourseId, kelasPraktikumId, mataKuliahId, user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <BackButton to="/mata-kuliah" />
          <Breadcrumbs items={[{ label: "Mata Kuliah", to: "/mata-kuliah" }, { label: course?.name || "Detail Mata Kuliah" }]} />
        </div>
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse mt-2" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">
                {course?.name || "Detail Mata Kuliah"}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {course?.code}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                {course?.description || "Deskripsi mata kuliah belum tersedia."}
              </p>
            </>
          )}
        </div>

        <div className="space-y-4">
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
                    navigate(academicJobsheetPath(effectiveCourseId!, jobsheet.id, { classId, mataKuliahId, kelasPraktikumId }))
                  }
                />
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
