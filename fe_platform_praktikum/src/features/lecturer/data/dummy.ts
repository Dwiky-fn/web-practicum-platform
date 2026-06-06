export type LecturerCourse = {
  id: string
  name: string
  code: string
  semester: number
  period: string
  classes: LecturerClass[]
}

export type LecturerClass = {
  id: string
  name: string
  studentCount: number
}

export type JobsheetStatus = "Draft" | "Published" | "Nonaktif"

export type LecturerJobsheet = {
  id: string
  courseId: string
  number: number
  title: string
  status: JobsheetStatus
  deadline: string
  usedIn: string[]
  submitted: number
  total: number
}

export type StudentProgress = {
  id: string
  nim: string
  name: string
  reportCount: string
  status: "Belum" | "Sedang" | "Selesai" | "Terkumpul" | "Dinilai" | "Revisi"
  jobsheet: number
  aiScore: number | null
  finalScore: number | null
  runs: number
  edits: number
  lastActive: string
}

export type ReviewSubmission = {
  id: string
  studentId: string
  jobsheetId: string
  similarity: number
  aiSummary: string[]
  validation: string[]
}

export const lecturerCourses: LecturerCourse[] = [
  {
    id: "pbo",
    code: "PBO",
    name: "Pemrograman Berorientasi Objek",
    semester: 5,
    period: "Ganjil 2025/2026",
    classes: [
      { id: "pbo-a", name: "A", studentCount: 30 },
      { id: "pbo-b", name: "B", studentCount: 28 },
      { id: "pbo-e", name: "E", studentCount: 26 },
    ],
  },
  {
    id: "struktur-data",
    code: "STD",
    name: "Struktur Data",
    semester: 3,
    period: "Ganjil 2025/2026",
    classes: [
      { id: "std-a", name: "A", studentCount: 32 },
      { id: "std-b", name: "B", studentCount: 29 },
    ],
  },
  {
    id: "algoritma",
    code: "ALG",
    name: "Algoritma Pemrograman",
    semester: 1,
    period: "Ganjil 2025/2026",
    classes: [
      { id: "alg-a", name: "A", studentCount: 31 },
      { id: "alg-b", name: "B", studentCount: 30 },
    ],
  },
]

export const lecturerJobsheets: LecturerJobsheet[] = [
  {
    id: "js-1",
    courseId: "pbo",
    number: 1,
    title: "Pengenalan OOP",
    status: "Published",
    deadline: "10 Januari 2026",
    usedIn: ["A", "B", "E"],
    submitted: 30,
    total: 30,
  },
  {
    id: "js-2",
    courseId: "pbo",
    number: 2,
    title: "Tipe Data, Variabel, dan Konstanta",
    status: "Draft",
    deadline: "14 Januari 2026",
    usedIn: [],
    submitted: 27,
    total: 30,
  },
  {
    id: "js-3",
    courseId: "pbo",
    number: 3,
    title: "Perulangan",
    status: "Published",
    deadline: "18 Januari 2026",
    usedIn: ["A", "B", "E"],
    submitted: 21,
    total: 30,
  },
  {
    id: "js-4",
    courseId: "pbo",
    number: 4,
    title: "Encapsulation",
    status: "Nonaktif",
    deadline: "20 Januari 2026",
    usedIn: ["A"],
    submitted: 0,
    total: 30,
  },
]

export const studentProgress: StudentProgress[] = [
  { id: "mhs-1", nim: "3202316001", name: "Dwiky Juniardi", reportCount: "4/4", status: "Selesai", jobsheet: 3, aiScore: 89, finalScore: 93, runs: 7, edits: 10, lastActive: "2 jam lalu" },
  { id: "mhs-2", nim: "3202316002", name: "Aisah", reportCount: "4/4", status: "Sedang", jobsheet: 3, aiScore: 96, finalScore: 93, runs: 9, edits: 15, lastActive: "Aktif" },
  { id: "mhs-3", nim: "3202316003", name: "Wahyu Ramdhani", reportCount: "3/4", status: "Selesai", jobsheet: 3, aiScore: 76, finalScore: 80, runs: 6, edits: 11, lastActive: "1 jam lalu" },
  { id: "mhs-4", nim: "3202316004", name: "Muhammad Faisal", reportCount: "4/4", status: "Belum", jobsheet: 3, aiScore: 87, finalScore: 90, runs: 0, edits: 0, lastActive: "1 hari lalu" },
  { id: "mhs-5", nim: "3202316005", name: "Rafiq Kamil", reportCount: "2/4", status: "Belum", jobsheet: 2, aiScore: 83, finalScore: 86, runs: 0, edits: 0, lastActive: "8 hari lalu" },
  { id: "mhs-6", nim: "3202316006", name: "Rizkia Darmawati", reportCount: "2/4", status: "Sedang", jobsheet: 2, aiScore: 74, finalScore: 78, runs: 2, edits: 4, lastActive: "Aktif" },
  { id: "mhs-7", nim: "3202316007", name: "Aulia", reportCount: "1/4", status: "Terkumpul", jobsheet: 2, aiScore: 79, finalScore: 82, runs: 4, edits: 6, lastActive: "30 menit lalu" },
]

export const reviewSubmissions: ReviewSubmission[] = [
  {
    id: "sub-1",
    studentId: "mhs-1",
    jobsheetId: "js-2",
    similarity: 12,
    aiSummary: ["Kesesuaian soal baik", "Struktur kode rapi", "Analisa perlu diperdalam"],
    validation: ["Percobaan 2", "Percobaan 5", "Latihan"],
  },
]

export function getCourse(courseId = "pbo") {
  return lecturerCourses.find((course) => course.id === courseId) ?? lecturerCourses[0]
}

export function getClass(courseId = "pbo", classId = "pbo-a") {
  return getCourse(courseId).classes.find((item) => item.id === classId) ?? getCourse(courseId).classes[0]
}

export function getJobsheet(jobsheetId = "js-1") {
  return lecturerJobsheets.find((jobsheet) => jobsheet.id === jobsheetId) ?? lecturerJobsheets[0]
}
