export type AdminTab = "semester" | "courses" | "classes"
export type UserRoleTab = "students" | "lecturers"

export type AdminUserStatus = "Aktif" | "Nonaktif"

export interface AdminStudent {
  id: string
  nim: string
  fullname: string
  email: string
  angkatan: number
  semester: number
  status: AdminUserStatus
  programStudi: string
  jurusan: string
  avatarUrl?: string
}

export interface AdminLecturer {
  id: string
  nip: string
  fullname: string
  email: string
  status: AdminUserStatus
  programStudi: string
  jurusan: string
  phone: string
  birthInfo: string
  gender: string
  city: string
  avatarUrl?: string
}

export interface AcademicSemester {
  id: string
  year: string
  term: "Ganjil" | "Genap"
  status: AdminUserStatus
}

export interface AcademicCourse {
  id: string
  code: string
  name: string
  semester: number
  sks: number
  status: AdminUserStatus
}

export interface AcademicClass {
  id: string
  name: string
  courseName: string
  courseId: string
  lecturerId: string
  lecturer: string
  academicPeriodId: string
  semesterYear: string
  studentSemester: number
  status: "Aktif" | "Nonaktif" | "Draft" | "Arsip" | "Selesai"
}

export interface ClassJobsheet {
  id: string
  classJobsheetId: string
  title: string
  deadline: string
  status: "Selesai" | "Aktif" | "Draft" | "Nonaktif" | "Arsip"
}

export interface AdminClassDetail extends AcademicClass {
  students: AdminStudent[]
  jobsheets: ClassJobsheet[]
}

export interface AdminDashboardSummary {
  activeSemester: {
    id: string
    year: string
    term: "Ganjil" | "Genap"
  } | null
  stats: {
    students: { total: number; active: number }
    lecturers: { total: number; active: number }
    courses: { total: number; active: number }
    classes: { total: number; active: number }
    assignedStudents: number
    unassignedStudents: number
  }
  activities: Array<{
    time: string
    activity: string
  }>
}

export interface CreateStudentPayload {
  nim: string
  fullname: string
  email: string
  angkatan?: number
  semester?: number
  status?: AdminUserStatus
}

export interface CreateLecturerPayload {
  nip: string
  fullname: string
  email: string
  status?: AdminUserStatus
}

export interface UpdateAdminUserPayload {
  fullname: string
  email: string
  status: AdminUserStatus
  nim?: string
  nip?: string
  angkatan?: number
  semester?: number
  programStudi?: string
  jurusan?: string
}

export interface CreateSemesterPayload {
  year: string
  term: "Ganjil" | "Genap"
  status?: AdminUserStatus
}

export interface CreateCoursePayload {
  code: string
  name: string
  semester: number
  sks: number
  status?: AdminUserStatus
}

export interface CreateClassPayload {
  courseId: string
  name: string
  lecturerId: string
  academicPeriodId?: string
  status?: "Aktif" | "Nonaktif" | "Arsip"
}

export interface UpdateClassPayload {
  courseId: string
  name: string
  lecturerId: string
  status: "Aktif" | "Nonaktif" | "Arsip"
}
