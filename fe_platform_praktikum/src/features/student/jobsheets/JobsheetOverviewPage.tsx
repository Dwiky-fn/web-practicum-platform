import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getSubmissionByJobsheetId } from "../../../services/submission/service";
import type { Jobsheet } from "../../../services/jobsheet/types";
import type { JobsheetSubmission } from "../../../services/submission/types";
import Navbar from "../../../components/navbar/Navbar";
import GoalCard from "./components/GoalCard";
import SidebarCard from "./components/SidebarCard";
import TopProgressBar from "../../../components/loading/TopProgressBar";
import GoalCardSkeleton from "./components/loading/GoalSkeleton";
import SidebarCardSkeleton from "./components/loading/SidebarSkeleton";
import { getJobsheetById } from "../../../services/jobsheet/service";
import { useCurrentUser } from "../../../services/user/useCurrentUser";
import { academicCourseBasePath, academicScopeQuery } from "../../../services/academicScope";

export default function JobsheetOverviewPage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get("classId") || undefined;
  const { courseId, mataKuliahId: routeMataKuliahId, jobsheetId } = useParams<{
    courseId?: string;
    mataKuliahId?: string;
    jobsheetId: string;
  }>();
  const mataKuliahId = routeMataKuliahId || searchParams.get("mataKuliahId") || undefined;
  const kelasPraktikumId = searchParams.get("kelasPraktikumId") || undefined;
  const effectiveCourseId = mataKuliahId || courseId;

  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null);
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!effectiveCourseId || !jobsheetId || !user) {
      setLoading(false);
      return;
    }

    const cId = effectiveCourseId;
    const jId = jobsheetId;
    const studentId = user.id;

    const scope = { classId, mataKuliahId, kelasPraktikumId };

    async function loadData() {
      try {
        setError("");
        setLoading(true);
        const [raw, sub] = await Promise.all([
          getJobsheetById(cId, jId, scope),
          getSubmissionByJobsheetId(cId, jId, studentId, scope),
        ]);

        setJobsheet(raw);
        setSubmission(sub);
      } catch (error) {
        console.error(error);
        setError(
          error instanceof Error
            ? error.message
            : "Jobsheet tidak tersedia untuk kelas Anda."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [classId, effectiveCourseId, jobsheetId, kelasPraktikumId, mataKuliahId, user]);

  const scopeQuery = academicScopeQuery({ classId, mataKuliahId, kelasPraktikumId });
  const coursePath = `${academicCourseBasePath(effectiveCourseId, { mataKuliahId })}${scopeQuery}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <button
          type="button"
          onClick={() => navigate(coursePath)}
          className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-white hover:text-blue-600 active:bg-white active:text-blue-600 transition"
        >
          <ArrowLeft size={18} />
          Kembali
        </button>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && (
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <div>
              {loading ? (
                <>
                  <div className="h-6 w-64 bg-gray-200 rounded animate-pulse mb-3" />
                  <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold text-gray-800">
                    {jobsheet?.title}
                  </h1>
                  <div className="mt-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h2 className="font-semibold text-gray-800">Deskripsi</h2>
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {jobsheet?.description || "Deskripsi jobsheet belum tersedia."}
                    </p>
                  </div>
                </>
              )}
            </div>

            {loading ? (
              <>
                <GoalCardSkeleton />
                <SidebarCardSkeleton />
              </>
            ) : (
              <>
                <GoalCard goal={jobsheet!.goal} />
                <SidebarCard
                  jobsheet={jobsheet!}
                  courseId={effectiveCourseId!}
                  jobsheetId={jobsheetId!}
                  submission={submission}
                  classId={classId}
                  mataKuliahId={mataKuliahId}
                  kelasPraktikumId={kelasPraktikumId}
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
