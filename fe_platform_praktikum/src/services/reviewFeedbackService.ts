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

// LocalStorage Mock Helpers
const STORAGE_KEY = "praktikum_review_feedbacks";

const getStoredFeedbacks = (): ReviewFeedback[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse stored feedbacks", e);
    return [];
  }
};

const saveStoredFeedbacks = (feedbacks: ReviewFeedback[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks));
};

export const getFeedbacks = async (submissionId: string): Promise<ReviewFeedback[]> => {
  // Try network first, fall back to mock
  try {
    const res = await apiFetch(`/submissions/${submissionId}/feedbacks`);
    if (res.data?.feedbacks) {
      return res.data.feedbacks;
    }
  } catch (e) {
    // Ignore network error for mock
  }

  const all = getStoredFeedbacks();
  return all.filter((f) => f.submissionId === submissionId);
};

export const createFeedback = async (payload: Omit<ReviewFeedback, "id" | "createdAt" | "updatedAt">): Promise<ReviewFeedback> => {
  const newFeedback: ReviewFeedback = {
    ...payload,
    id: "fb-" + Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: payload.status === "published" ? new Date().toISOString() : null,
  };

  try {
    const res = await apiFetch(`/submissions/${payload.submissionId}/feedbacks`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.data?.feedback) {
      return res.data.feedback;
    }
  } catch (e) {
    // Mock save
  }

  const all = getStoredFeedbacks();
  all.push(newFeedback);
  saveStoredFeedbacks(all);
  return newFeedback;
};

export const updateFeedback = async (
  feedbackId: string,
  payload: Partial<Omit<ReviewFeedback, "id" | "createdAt" | "updatedAt">>,
): Promise<ReviewFeedback> => {
  try {
    const res = await apiFetch(`/feedbacks/${feedbackId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (res.data?.feedback) {
      return res.data.feedback;
    }
  } catch (e) {
    // Mock update
  }

  const all = getStoredFeedbacks();
  const index = all.findIndex((f) => f.id === feedbackId);
  if (index === -1) throw new Error("Feedback not found");

  const updated: ReviewFeedback = {
    ...all[index],
    ...payload,
    updatedAt: new Date().toISOString(),
    publishedAt:
      payload.status === "published" && !all[index].publishedAt
        ? new Date().toISOString()
        : all[index].publishedAt,
  };

  all[index] = updated;
  saveStoredFeedbacks(all);
  return updated;
};

export const deleteFeedback = async (feedbackId: string): Promise<void> => {
  try {
    await apiFetch(`/feedbacks/${feedbackId}`, {
      method: "DELETE",
    });
    return;
  } catch (e) {
    // Mock delete
  }

  const all = getStoredFeedbacks();
  const filtered = all.filter((f) => f.id !== feedbackId);
  saveStoredFeedbacks(filtered);
};

export const publishFeedback = async (feedbackId: string): Promise<ReviewFeedback> => {
  return updateFeedback(feedbackId, { status: "published" });
};

export const publishMultipleFeedbacks = async (feedbackIds: string[]): Promise<void> => {
  try {
    await apiFetch(`/feedbacks/bulk-publish`, {
      method: "POST",
      body: JSON.stringify({ feedbackIds }),
    });
    return;
  } catch (e) {
    // Mock bulk publish
  }

  const all = getStoredFeedbacks();
  const updated = all.map((f) => {
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
  saveStoredFeedbacks(updated);
};

export const resolveFeedback = async (feedbackId: string): Promise<ReviewFeedback> => {
  return updateFeedback(feedbackId, { status: "resolved" });
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

  // Store in LocalStorage
  const all = getStoredFeedbacks();
  saveStoredFeedbacks([...all, ...aiFeedbacks]);

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

  const all = getStoredFeedbacks();
  saveStoredFeedbacks([...all, ...generated]);

  return generated;
};
