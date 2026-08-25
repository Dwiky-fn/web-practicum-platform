import { useNavigate } from "react-router-dom";
import { getDeadlineState } from "../../../../shared/utils/deadline";
import { academicJobsheetWorkPath, type AcademicScope } from "../../../../services/academicScope";
import type { Jobsheet } from "../../../../services/jobsheet/types";
import type { JobsheetSubmission } from "../../../../services/submission/types";
import { formatAcademicDateTime } from "../../../../shared/utils/formatAcademicDateTime";
import { formatScore } from "../../../../shared/utils/formatScore";

interface Props {
  jobsheet: Jobsheet;
  submission: JobsheetSubmission | null;
  courseId: string;
  jobsheetId: string;
  classId?: string;
  mataKuliahId?: string;
  kelasPraktikumId?: string;
  mainScore?: number | null;
}

export default function SidebarCard({
  jobsheet,
  submission,
  courseId,
  jobsheetId,
  classId,
  mataKuliahId,
  kelasPraktikumId,
  mainScore,
}: Props) {
  const navigate = useNavigate();

  const now = new Date();
  const deadlineState = getDeadlineState(jobsheet.deadline, now);
  const isOverdue = deadlineState.isOverdue;
  const status = submission?.status;
  const access = jobsheet.access || { accessMode: "editable_normal" };
  const accessMode = access.accessMode;
  const isLockedByDeadline = accessMode === "locked_deadline";
  const isLockedBySequence = accessMode === "locked_sequence";
  const displayScore = mainScore ?? submission?.review?.finalScore ?? submission?.score;
  const scope: AcademicScope = { classId, mataKuliahId, kelasPraktikumId };

  function goTo() {
    if (isLockedByDeadline || isLockedBySequence) return;
    navigate(academicJobsheetWorkPath(courseId, jobsheetId, scope));
  }

  function getDisplayStatus() {
    if (accessMode === "editable_remedial") return "Remedial Aktif";
    if (!status) return "Belum Mulai";

    switch (status) {
      case "DRAFT":
        return "Draft";
      case "SUBMITTED":
      case "REVIEWING":
        return "Menunggu Review";
      case "REVISION":
        return "Perlu Revisi";
      case "ACCEPTED":
        return "Sudah Dinilai";
      default:
        return status;
    }
  }

  function getStatusStyle(displayStatus: string) {
    switch (displayStatus) {
      case "Remedial Aktif":
        return "text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs font-semibold";
      case "Belum Mulai":
        return "text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-xs font-semibold";
      case "Draft":
        return "text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded text-xs font-semibold";
      case "Menunggu Review":
        return "text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs font-semibold";
      case "Perlu Revisi":
        return "text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-xs font-semibold";
      case "Sudah Dinilai":
        return "text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded text-xs font-semibold";
      default:
        return "text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-xs font-semibold";
    }
  }

  function getActionLabel() {
    if (accessMode === "editable_remedial") return "Kerjakan Remedial";
    if (isLockedBySequence) return "Terkunci";
    if (isLockedByDeadline) return "Deadline Berakhir";
    if (submission && status && status !== "DRAFT") return "Lihat";
    if (accessMode === "readonly_submitted" || accessMode === "readonly_reviewed") return "Lihat";
    if (status === "DRAFT") return "Lanjutkan Pengerjaan";
    return "Mulai Mengerjakan";
  }

  function getLatestReviewComment() {
    const comments = submission?.review?.comments ?? [];
    const latestComment = comments[comments.length - 1]?.comment?.trim();

    return submission?.review?.lecturerFeedback?.trim() || latestComment || "";
  }

  const latestReviewComment = getLatestReviewComment();
  const displayStatus = getDisplayStatus();

  return (
    <div className="w-full rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-4">
        Status Pengerjaan
      </h2>
      
      <div className="space-y-4">
        {/* STATUS */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">Status</p>
          <span className={getStatusStyle(displayStatus)}>
            {displayStatus}
          </span>
        </div>

        {/* DEADLINE */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              {jobsheet.access?.attemptType === "remedial" ? "Deadline Remedial" : "Deadline"}
            </p>
            <p
              className={`text-sm font-semibold ${
                isOverdue
                  ? "text-red-600"
                  : deadlineState.label === "Deadline hari ini"
                  ? "text-yellow-600"
                  : "text-gray-800"
              }`}
            >
              {jobsheet.deadline
                ? formatAcademicDateTime(jobsheet.deadline)
                : "Belum diatur"}
            </p>
          </div>

          {jobsheet.normalDeadline && jobsheet.normalDeadline !== jobsheet.deadline && (
            <p className="text-[11px] text-gray-400 text-right mt-0.5">
              Deadline Reguler: {formatAcademicDateTime(jobsheet.normalDeadline)}
            </p>
          )}

          {!isOverdue && deadlineState.date && (
            <p className="text-[10px] text-gray-400 text-right mt-0.5">
              {deadlineState.label}
            </p>
          )}
        </div>

        {/* REMEDIAL TIME & STATUS INFO */}
        {(jobsheet.access?.remedialStartAt || jobsheet.access?.remedialEndAt) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1.5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Sesi Remedial</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                jobsheet.access.remedialStatus === "not_started" || accessMode === "locked_remedial_not_started"
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : jobsheet.access.remedialStatus === "active" || accessMode === "editable_remedial"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-rose-100 text-rose-800 border border-rose-300"
              }`}>
                {jobsheet.access.remedialStatus === "not_started" || accessMode === "locked_remedial_not_started"
                  ? "Belum Dimulai"
                  : jobsheet.access.remedialStatus === "active" || accessMode === "editable_remedial"
                  ? "Sedang Berlangsung"
                  : "Sudah Berakhir"}
              </span>
            </div>
            <div className="text-[11px] text-amber-900 space-y-0.5">
              {jobsheet.access.remedialStartAt && (
                <p><span className="font-medium text-amber-700">Mulai:</span> {formatAcademicDateTime(jobsheet.access.remedialStartAt)}</p>
              )}
              {jobsheet.access.remedialEndAt && (
                <p><span className="font-medium text-amber-700">Berakhir:</span> {formatAcademicDateTime(jobsheet.access.remedialEndAt)}</p>
              )}
            </div>
          </div>
        )}

        {/* NILAI */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">
            {accessMode === "editable_remedial" ? "Nilai Terakhir" : "Nilai"}
          </p>
          <p className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
            {formatScore(displayScore)}
          </p>
        </div>

        {submission?.updatedAt && (
          <p className="text-[11px] text-gray-400 text-right mt-1">
            Terakhir diperbarui: {formatAcademicDateTime(submission.updatedAt)}
          </p>
        )}

        {isLockedBySequence && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-700 mt-2">
            {access.message || "Selesaikan jobsheet sebelumnya terlebih dahulu."}
          </div>
        )}

        {accessMode === "editable_remedial" && (
          <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 text-xs text-amber-800 mt-2">
            <span className="font-semibold">Informasi:</span> Remedial tersedia sesuai waktu yang ditentukan dosen.
          </div>
        )}

        {latestReviewComment && status === "REVISION" && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-2.5 text-xs text-red-700 mt-2">
            <span className="font-semibold">Catatan revisi:</span> {latestReviewComment}
          </div>
        )}

        {/* ACTION */}
        <button
          type="button"
          onClick={goTo}
          disabled={isLockedByDeadline || isLockedBySequence}
          className={`w-full py-2 rounded-lg font-semibold text-sm transition mt-2 cursor-pointer ${
            isLockedByDeadline || isLockedBySequence
              ? "cursor-not-allowed bg-gray-200 text-gray-500"
              : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
          }`}
        >
          {getActionLabel()}
        </button>
      </div>
    </div>
  );
}
