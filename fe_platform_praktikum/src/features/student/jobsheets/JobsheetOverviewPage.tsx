import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { getSubmissionByJobsheetId, getSubmissionHistory } from "../../../services/submission/service";
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
  const [history, setHistory] = useState<Array<{
    submissionId: string;
    attemptNo: number;
    attemptType: "normal" | "remedial";
    attemptLabel?: string | null;
    status: string;
    finalScore: number | null;
    submittedAt: string;
    reviewedAt: string | null;
  }>>([]);
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
        const [raw, sub, historyData] = await Promise.all([
          getJobsheetById(cId, jId, scope),
          getSubmissionByJobsheetId(cId, jId, studentId, scope),
          getSubmissionHistory(jId, kelasPraktikumId),
        ]);

        setJobsheet(raw);
        setSubmission(sub);
        setHistory(historyData);
      } catch (error) {
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
                <SubmissionHistoryCard history={history} />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function SubmissionHistoryCard({
  history,
}: {
  history: Array<{
    submissionId: string;
    attemptNo: number;
    attemptType: "normal" | "remedial";
    attemptLabel?: string | null;
    status: string;
    finalScore: number | null;
    submittedAt: string;
    reviewedAt: string | null;
  }>;
}) {
  const statusLabel = (status: string) => {
    if (status === "ACCEPTED" || status === "REVIEWED") return "Sudah dinilai";
    if (status === "SUBMITTED" || status === "REVIEWING") return "Menunggu review";
    if (status === "REVISION") return "Perlu revisi";
    return "Draf";
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <ClipboardList size={20} className="text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-800">Riwayat Pengerjaan</h2>
      </div>

      {history.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">Belum ada riwayat pengerjaan.</p>
      ) : (
        <div className="mt-8">
          <div className="grid grid-cols-[1fr_auto] gap-6 px-3 text-base font-semibold text-gray-800">
            <span>Pengerjaan</span>
            <span>Nilai</span>
          </div>

          <div className="mt-4 space-y-6">
          {history.map((item) => {
            const submittedAt = item.submittedAt ? new Date(item.submittedAt) : null;
            const title = item.attemptType === "remedial"
              ? "Remedial"
              : "Pengumpulan Jobsheet";
            const score = item.finalScore ?? null;
            return (
              <div key={item.submissionId} className="grid grid-cols-[1fr_auto] items-start gap-6 px-3">
                <div className="min-w-0">
                  <p className="text-base font-medium text-gray-800">{title}</p>
                  <p className="mt-2 text-sm text-gray-500">
                    {submittedAt
                      ? submittedAt.toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Belum dikumpulkan"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{statusLabel(item.status)}</p>
                </div>
                <div className="pt-8 text-right">
                  <p className={`text-lg font-semibold ${
                    score == null
                      ? "text-gray-400"
                      : score >= 80
                      ? "text-green-600"
                      : "text-amber-500"
                  }`}>
                    {score == null ? "-" : `${score}%`}
                  </p>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
