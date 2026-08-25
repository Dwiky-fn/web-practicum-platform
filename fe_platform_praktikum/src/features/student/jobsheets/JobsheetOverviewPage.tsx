import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { getSubmissionByJobsheetId, getSubmissionHistory } from "../../../services/submission/service";
import type { Jobsheet } from "../../../services/jobsheet/types";
import type { JobsheetSubmission } from "../../../services/submission/types";
import { formatAcademicDate } from "../../../shared/utils/formatAcademicDateTime";
import Navbar from "../../../components/navbar/Navbar";
import Breadcrumbs from "../../../components/Breadcrumbs";
import BackButton from "../../../components/BackButton";
import SidebarCard from "./components/SidebarCard";
import TopProgressBar from "../../../components/loading/TopProgressBar";
import SidebarCardSkeleton from "./components/loading/SidebarSkeleton";
import { getJobsheetById } from "../../../services/jobsheet/service";
import { getCourseById } from "../../../services/course/service";
import type { Course } from "../../../services/course/types";
import { useCurrentUser } from "../../../services/user/useCurrentUser";
import { academicCourseBasePath, academicScopeQuery, academicJobsheetWorkPath } from "../../../services/academicScope";

function renderGoal(goal?: string | null) {
  if (!goal) {
    return <p className="text-sm leading-relaxed text-gray-500 italic">Belum ada tujuan praktikum.</p>;
  }

  const items = goal
    .split(/\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (items.length > 1) {
    return (
      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
        {items.map((item, idx) => {
          const cleanItem = item.replace(/^[-*•\d+\.\s]+/, "");
          return <li key={idx}>{cleanItem}</li>;
        })}
      </ul>
    );
  }

  return <p className="text-sm leading-relaxed text-gray-600">{goal}</p>;
}

export default function JobsheetOverviewPage() {
  const { user } = useCurrentUser();
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

  const [course, setCourse] = useState<Course | null>(null);
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null);
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null);
  const [history, setHistory] = useState<Array<{
    submissionId: string;
    attemptNo: number;
    attemptType: "normal" | "remedial";
    attemptLabel?: string | null;
    status: string;
    finalScore: number | null;
    submittedAt: string;
    reviewedAt: string | null;
    remedialId?: string | null;
    remedialStatus?: string | null;
    remedialEndAt?: string | null;
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
        const [raw, sub, historyData, courseData] = await Promise.all([
          getJobsheetById(cId, jId, scope),
          getSubmissionByJobsheetId(cId, jId, studentId, scope),
          getSubmissionHistory(jId, kelasPraktikumId),
          getCourseById(cId).catch(() => null),
        ]);

        setJobsheet(raw);
        setSubmission(sub);
        setHistory(historyData);
        if (courseData) setCourse(courseData);
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
  const mainScore = [...history].reverse().find((item) => item.finalScore !== null && item.finalScore !== undefined)?.finalScore ?? null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <TopProgressBar />

      <main className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <BackButton to={coursePath} />
          <Breadcrumbs items={[{ label: "Mata Kuliah", to: "/mata-kuliah" }, { label: course?.name || "Detail Mata Kuliah", to: coursePath }, { label: jobsheet?.title || "Detail Jobsheet" }]} />
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && (
          <div className="flex flex-col gap-6">
            {/* Header Area */}
            <div>
              {loading ? (
                <>
                  <div className="h-7 w-64 bg-gray-200 rounded animate-pulse mb-1.5" />
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">
                    {jobsheet?.title}
                  </h1>
                  {jobsheet?.programmingLanguageDisplayName && (
                    <span className="inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                      {jobsheet.programmingLanguageDisplayName}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-5 items-start">
              {/* Left Column: Informasi Jobsheet */}
              <div className="space-y-6">
                {loading ? (
                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-4">
                      Informasi Jobsheet
                    </h2>

                    <div className="space-y-5">
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Deskripsi</h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                          {jobsheet?.description ? jobsheet.description : "Belum ada deskripsi jobsheet."}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tujuan Praktikum</h3>
                        <div className="mt-2">
                          {renderGoal(jobsheet?.goal)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Status & Aksi */}
              <div>
                {loading ? (
                  <SidebarCardSkeleton />
                ) : (
                  <SidebarCard
                    jobsheet={jobsheet!}
                    courseId={effectiveCourseId!}
                    jobsheetId={jobsheetId!}
                    submission={submission}
                    mainScore={mainScore}
                    classId={classId}
                    mataKuliahId={mataKuliahId}
                    kelasPraktikumId={kelasPraktikumId}
                  />
                )}
              </div>
            </div>

            {/* History Section */}
            <div>
              {loading ? (
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm h-32 animate-pulse" />
              ) : (
                <SubmissionHistoryCard
                  history={history}
                  jobsheet={jobsheet!}
                  courseId={effectiveCourseId!}
                  jobsheetId={jobsheetId!}
                  classId={classId}
                  mataKuliahId={mataKuliahId}
                  kelasPraktikumId={kelasPraktikumId}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface SubmissionHistoryCardProps {
  history: Array<{
    submissionId: string;
    attemptNo: number;
    attemptType: "normal" | "remedial";
    attemptLabel?: string | null;
    status: string;
    finalScore: number | null;
    submittedAt: string;
    reviewedAt: string | null;
    remedialId?: string | null;
    remedialStatus?: string | null;
    remedialEndAt?: string | null;
  }>;
  jobsheet: Jobsheet;
  courseId: string;
  jobsheetId: string;
  classId?: string;
  mataKuliahId?: string;
  kelasPraktikumId?: string;
}

function SubmissionHistoryCard({
  history,
  jobsheet,
  courseId,
  jobsheetId,
  classId,
  mataKuliahId,
  kelasPraktikumId,
}: SubmissionHistoryCardProps) {
  const navigate = useNavigate();

  const getHistoryStatusLabel = (status: string) => {
    if (status === "ACCEPTED" || status === "REVIEWED") return "Sudah Dinilai";
    if (status === "SUBMITTED" || status === "REVIEWING") return "Menunggu Review";
    if (status === "REVISION") return "Perlu Revisi";
    return "Draft";
  };

  const getHistoryStatusStyle = (status: string) => {
    const label = getHistoryStatusLabel(status);
    switch (label) {
      case "Draft":
        return "text-yellow-700 bg-yellow-50 border border-yellow-100 px-2 py-0.5 rounded text-[10px] font-bold";
      case "Menunggu Review":
        return "text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-[10px] font-bold";
      case "Perlu Revisi":
        return "text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[10px] font-bold";
      case "Sudah Dinilai":
        return "text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded text-[10px] font-bold";
      default:
        return "text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded text-[10px] font-bold";
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4">
        <ClipboardList size={18} className="text-blue-600" />
        <h2 className="text-base font-semibold text-gray-800">Riwayat Pengerjaan</h2>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada riwayat pengerjaan.</p>
      ) : (
        <>
          {/* Desktop/Tablet Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-3">Jenis Pengerjaan</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3 text-right">Nilai</th>
                  <th className="py-2.5 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((item) => {
                  const title = item.attemptLabel || (item.attemptType === "remedial"
                    ? `Remedial ${Math.max(1, Number(item.attemptNo || 2) - 1)}`
                    : "Pengerjaan Reguler");
                  const score = item.finalScore ?? null;
                  const dateStr = item.submittedAt ? formatAcademicDate(new Date(item.submittedAt)) : "-";
                  const scoreStr = score !== null ? `${score} / 100` : "-";
                  const isReviewed = item.status === "REVIEWED" || item.status === "ACCEPTED" || item.finalScore !== null;

                  const isActiveRemedial =
                    jobsheet.access?.accessMode === "editable_remedial" &&
                    jobsheet.access?.remedialId === item.remedialId &&
                    item.status === "DRAFT";

                  return (
                    <tr key={item.submissionId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-gray-800">{title}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={getHistoryStatusStyle(item.status)}>
                            {getHistoryStatusLabel(item.status)}
                          </span>
                          {isActiveRemedial && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                              Aktif sekarang
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-500 font-medium">{dateStr}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`font-semibold ${score !== null ? (score >= 80 ? "text-green-600" : "text-amber-500") : "text-gray-400"}`}>
                          {scoreStr}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex justify-end gap-2">
                          {isActiveRemedial && (
                            <button
                              type="button"
                              onClick={() => navigate(academicJobsheetWorkPath(courseId, jobsheetId, { classId, mataKuliahId, kelasPraktikumId }))}
                              className="inline-flex items-center px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs transition cursor-pointer"
                            >
                              Kerjakan
                            </button>
                          )}
                          {item.status !== "DRAFT" && (
                            isReviewed ? (
                              <button
                                type="button"
                                onClick={() => navigate(`${academicJobsheetWorkPath(courseId, jobsheetId, { classId, mataKuliahId, kelasPraktikumId })}/report/review`)}
                                className="inline-flex items-center px-2.5 py-1 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition cursor-pointer"
                              >
                                Lihat Review
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title="Review belum tersedia (masih menunggu penilaian dosen)"
                                className="inline-flex items-center px-2.5 py-1 rounded border border-gray-200 bg-gray-100 text-gray-400 font-bold text-xs cursor-not-allowed"
                              >
                                Lihat Review
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="block sm:hidden space-y-3">
            {history.map((item) => {
              const title = item.attemptLabel || (item.attemptType === "remedial"
                ? `Remedial ${Math.max(1, Number(item.attemptNo || 2) - 1)}`
                : "Pengerjaan Reguler");
              const score = item.finalScore ?? null;
              const dateStr = item.submittedAt ? formatAcademicDate(new Date(item.submittedAt)) : "-";
              const scoreStr = score !== null ? `${score} / 100` : "-";
              const isReviewed = item.status === "REVIEWED" || item.status === "ACCEPTED" || item.finalScore !== null;

              const isActiveRemedial =
                jobsheet.access?.accessMode === "editable_remedial" &&
                jobsheet.access?.remedialId === item.remedialId &&
                item.status === "DRAFT";

              return (
                <div key={item.submissionId} className="p-3 bg-gray-50/30 rounded-lg border border-gray-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">{title}</span>
                    <span className={`text-sm font-bold ${score !== null ? (score >= 80 ? "text-green-600" : "text-amber-500") : "text-gray-400"}`}>
                      {scoreStr}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={getHistoryStatusStyle(item.status)}>
                        {getHistoryStatusLabel(item.status)}
                      </span>
                      {isActiveRemedial && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                          Aktif sekarang
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {isActiveRemedial && (
                      <button
                        type="button"
                        onClick={() => navigate(academicJobsheetWorkPath(courseId, jobsheetId, { classId, mataKuliahId, kelasPraktikumId }))}
                        className="flex-1 py-1.5 rounded bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition cursor-pointer text-center"
                      >
                        Kerjakan
                      </button>
                    )}
                    {item.status !== "DRAFT" && (
                      isReviewed ? (
                        <button
                          type="button"
                          onClick={() => navigate(`${academicJobsheetWorkPath(courseId, jobsheetId, { classId, mataKuliahId, kelasPraktikumId })}/report/review`)}
                          className="flex-1 py-1.5 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition cursor-pointer text-center"
                        >
                          Lihat Review
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="Review belum tersedia (masih menunggu penilaian dosen)"
                          className="flex-1 py-1.5 rounded border border-gray-200 bg-gray-100 text-gray-400 font-semibold text-xs text-center cursor-not-allowed"
                        >
                          Lihat Review
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
