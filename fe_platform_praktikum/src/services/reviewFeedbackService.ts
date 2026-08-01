import { apiFetch } from "./api"

export interface ReviewFeedback {
  id: string;
  submissionId: string;
  experimentId?: string | null;
  codeBlockId?: string | null;
  fileName?: string | null;

  scope: "code" | "experiment" | "jobsheet";

  startLine?: number | null;
  endLine?: number | null;
  selectedCode?: string | null;

  title?: string | null;
  content: string;

  strengths?: string[];
  issues?: string[];
  suggestions?: string[];

  source: "ai" | "lecturer" | "ai_edited_by_lecturer";
  status: "draft" | "published" | "resolved";

  createdBy?: {
    id: string;
    name: string;
    role: string;
  } | null;

  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export const getFeedbacks = async (submissionId: string): Promise<ReviewFeedback[]> => {
  const isLecturer = window.location.pathname.startsWith("/reviews") || window.location.pathname.startsWith("/lecturer");
  if (!isLecturer) {
    try {
      const res = await apiFetch(`/student/submissions/${submissionId}/review`);
      if (res.data?.review?.feedback_details) {
        return res.data.review.feedback_details;
      }
      return [];
    } catch {
      // Fallback
    }
  }

  try {
    const res = await apiFetch(`/submissions/${submissionId}/feedbacks`);
    if (res.data?.feedbacks) {
      return res.data.feedbacks;
    }
  } catch (err) {
    console.warn("Failed to fetch feedbacks:", err);
  }
  return [];
};

export const createFeedback = async (payload: Omit<ReviewFeedback, "id" | "createdAt" | "updatedAt">): Promise<ReviewFeedback> => {
  const newFeedback: ReviewFeedback = {
    ...payload,
    id: "fb-" + Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: payload.status === "published" ? new Date().toISOString() : null,
  };

  const current = await getFeedbacks(payload.submissionId);
  current.push(newFeedback);

  await apiFetch(`/submissions/${payload.submissionId}/feedbacks`, {
    method: "PUT",
    body: JSON.stringify({ feedbacks: current }),
  });

  return newFeedback;
};

export const updateFeedback = async (
  submissionId: string,
  feedbackId: string,
  payload: Partial<Omit<ReviewFeedback, "id" | "createdAt" | "updatedAt">>,
): Promise<ReviewFeedback> => {
  const current = await getFeedbacks(submissionId);
  const index = current.findIndex((f) => f.id === feedbackId);
  if (index === -1) throw new Error("Feedback not found");

  const updated: ReviewFeedback = {
    ...current[index],
    ...payload,
    updatedAt: new Date().toISOString(),
    publishedAt:
      payload.status === "published" && !current[index].publishedAt
        ? new Date().toISOString()
        : current[index].publishedAt,
  };

  current[index] = updated;

  await apiFetch(`/submissions/${submissionId}/feedbacks`, {
    method: "PUT",
    body: JSON.stringify({ feedbacks: current }),
  });

  return updated;
};

export const deleteFeedback = async (submissionId: string, feedbackId: string): Promise<void> => {
  const current = await getFeedbacks(submissionId);
  const filtered = current.filter((f) => f.id !== feedbackId);

  await apiFetch(`/submissions/${submissionId}/feedbacks`, {
    method: "PUT",
    body: JSON.stringify({ feedbacks: filtered }),
  });
};

export const publishFeedback = async (submissionId: string, feedbackId: string): Promise<ReviewFeedback> => {
  return updateFeedback(submissionId, feedbackId, { status: "published" });
};

export const publishMultipleFeedbacks = async (submissionId: string, feedbackIds: string[]): Promise<void> => {
  const current = await getFeedbacks(submissionId);
  const updated = current.map((f) => {
    if (feedbackIds.includes(f.id) && f.status === "draft") {
      return {
        ...f,
        status: "published" as const,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return f;
  });

  await apiFetch(`/submissions/${submissionId}/feedbacks`, {
    method: "PUT",
    body: JSON.stringify({ feedbacks: updated }),
  });
};

export const resolveFeedback = async (submissionId: string, feedbackId: string): Promise<ReviewFeedback> => {
  return updateFeedback(submissionId, feedbackId, { status: "resolved" });
};

// Mock AI evaluation response generator
const generateMockAiFeedbackForExperiment = (
  submissionId: string,
  experimentId: string,
  experimentTitle: string,
  fileName: string,
  code: string,
): ReviewFeedback[] => {
  const feedbacks: ReviewFeedback[] = [];

  // Parse lines to find interesting code blocks for inline commentary
  const lines = code.split("\n");
  let mainLineIndex = lines.findIndex((l) => l.includes("public static void main") || l.includes("def main"));
  if (mainLineIndex === -1) mainLineIndex = 3;

  // 1. Add an inline code feedback draft
  feedbacks.push({
    id: `ai-code-${experimentId}-${Math.random().toString(36).substr(2, 5)}`,
    submissionId,
    experimentId,
    codeBlockId: "code-" + experimentId,
    fileName,
    scope: "code",
    startLine: mainLineIndex + 2,
    endLine: mainLineIndex + 3,
    selectedCode: lines.slice(mainLineIndex + 1, mainLineIndex + 3).join("\n"),
    content: "AI Analysis: Penulisan variabel di sini sudah sesuai dengan penamaan camelCase, tetapi pastikan nilai default diinisialisasi untuk mencegah runtime error.",
    source: "ai",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 2. Add experiment level feedback draft
  feedbacks.push({
    id: `ai-exp-${experimentId}-${Math.random().toString(36).substr(2, 5)}`,
    submissionId,
    experimentId,
    scope: "experiment",
    content: `AI Evaluation untuk ${experimentTitle}: Secara keseluruhan, alur logika program sudah benar. Kode program berhasil dijalankan dan output sesuai dengan spesifikasi yang diminta.`,
    strengths: ["Kode program rapi dan terstruktur", "Output sesuai instruksi"],
    issues: ["Kurang validasi input kosong", "Analisis terlalu singkat"],
    suggestions: ["Tambahkan validasi input menggunakan percabangan", "Tingkatkan kedalaman analisis mahasiswa"],
    source: "ai",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return feedbacks;
};

export const generateAiEvaluation = async (
  submissionId: string,
  experiments: Array<{ id: string; title: string; fileName: string; code: string }>,
  onProgress?: (progress: Record<string, "pending" | "processing" | "success" | "error">) => void,
): Promise<ReviewFeedback[]> => {
  const progress: Record<string, "pending" | "processing" | "success" | "error"> = {};
  
  // Initialize progress
  experiments.forEach((exp) => {
    progress[exp.id] = "pending";
  });
  progress["jobsheet"] = "pending";
  onProgress?.({ ...progress });

  const aiFeedbacks: ReviewFeedback[] = [];

  for (const exp of experiments) {
    progress[exp.id] = "processing";
    onProgress?.({ ...progress });

    // Simulate analysis delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate 10% chance of failure for retry test
    if (Math.random() < 0.1) {
      progress[exp.id] = "error";
      onProgress?.({ ...progress });
      continue;
    }

    const generated = generateMockAiFeedbackForExperiment(
      submissionId,
      exp.id,
      exp.title,
      exp.fileName,
      exp.code,
    );
    aiFeedbacks.push(...generated);
    progress[exp.id] = "success";
    onProgress?.({ ...progress });
  }

  // Jobsheet level feedback
  progress["jobsheet"] = "processing";
  onProgress?.({ ...progress });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  const jobsheetFb: ReviewFeedback = {
    id: `ai-job-${Math.random().toString(36).substr(2, 5)}`,
    submissionId,
    scope: "jobsheet",
    content: "AI Jobsheet Evaluation: Secara umum mahasiswa telah memahami materi modul ini dengan sangat baik. Penggunaan struktur kontrol dan method sudah tepat di semua percobaan. Namun, mahasiswa perlu memperdalam analisis hasil eksperimen pada percobaan terakhir.",
    strengths: [
      "Struktur algoritma terstruktur dengan baik",
      "Kesesuaian format output di seluruh percobaan"
    ],
    issues: [
      "Analisis percobaan terakhir kurang detail",
      "Tidak ada dokumentasi comment di dalam file Main.java"
    ],
    suggestions: [
      "Berikan penjelasan lebih detail mengenai performa program pada bagian analisis",
      "Gunakan comment multi-line untuk menjelaskan method utama"
    ],
    source: "ai",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  aiFeedbacks.push(jobsheetFb);
  progress["jobsheet"] = "success";
  onProgress?.({ ...progress });

  // Store in database
  const current = await getFeedbacks(submissionId);
  const updatedFeedbacks = [...current, ...aiFeedbacks];
  await apiFetch(`/submissions/${submissionId}/feedbacks`, {
    method: "PUT",
    body: JSON.stringify({ feedbacks: updatedFeedbacks }),
  });

  return aiFeedbacks;
};

export const retryAiEvaluation = async (
  submissionId: string,
  target: { id: string; title: string; fileName: string; code: string; type: "experiment" | "jobsheet" },
): Promise<ReviewFeedback[]> => {
  // Delay
  await new Promise((resolve) => setTimeout(resolve, 1200));

  let generated: ReviewFeedback[] = [];
  if (target.type === "experiment") {
    generated = generateMockAiFeedbackForExperiment(
      submissionId,
      target.id,
      target.title,
      target.fileName,
      target.code,
    );
  } else {
    generated = [{
      id: `ai-job-${Math.random().toString(36).substr(2, 5)}`,
      submissionId,
      scope: "jobsheet",
      content: "AI Jobsheet Evaluation: Secara umum mahasiswa telah memahami materi modul ini dengan sangat baik. Penggunaan struktur kontrol dan method sudah tepat di semua percobaan. Namun, mahasiswa perlu memperdalam analisis hasil eksperimen pada percobaan terakhir.",
      strengths: [
        "Struktur algoritma terstruktur dengan baik",
        "Kesesuaian format output di seluruh percobaan"
      ],
      issues: [
        "Analisis percobaan terakhir kurang detail",
        "Tidak ada dokumentasi comment di dalam file Main.java"
      ],
      suggestions: [
        "Berikan penjelasan lebih detail mengenai performa program pada bagian analisis",
        "Gunakan comment multi-line untuk menjelaskan method utama"
      ],
      source: "ai",
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];
  }

  const current = await getFeedbacks(submissionId);
  const updatedFeedbacks = [...current, ...generated];
  await apiFetch(`/submissions/${submissionId}/feedbacks`, {
    method: "PUT",
    body: JSON.stringify({ feedbacks: updatedFeedbacks }),
  });

  return generated;
};
