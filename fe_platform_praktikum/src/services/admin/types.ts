export type AdminTab = "semester" | "courses" | "classes"
export type UserRoleTab = "students" | "lecturers"

export type AdminUserStatus = "Aktif" | "Nonaktif" | "Cuti"

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
  studyProgramId?: string
  isTransferStudent?: boolean
  transferOriginSemester?: number
  transferReason?: string
  avatarUrl?: string
}

export interface AdminLecturer {
  id: string
  nip: string
  fullname: string
  email: string
  initialPassword?: string
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
  kelasPraktikumId?: string
  id_kelas_praktikum?: string
  mataKuliahId?: string
  id_mata_kuliah?: string
  kelasMahasiswaId?: string
  id_kelas_mhs?: string
  name: string
  courseName: string
  courseId: string
  lecturerId: string
  lecturer: string
  academicPeriodId: string
  tahunSemesterId?: string
  id_tahun_semester?: string
  semesterYear: string
  tahunSemesterStatus?: string
  tahun_semester_status?: string
  studentSemester: number
  jumlahMahasiswa?: number
  jumlah_mahasiswa?: number
  jumlahJobsheet?: number
  jumlah_jobsheet?: number
  programmingLanguage: "java" | "python"
  programmingLanguageDisplayName: "Java" | "Python"
  status: "Aktif" | "Nonaktif" | "Draft" | "Arsip" | "Selesai"
}

export interface ClassTemplate {
  id: string
  name: string
  course_id: string
  course_name: string
  lecturer_id: string
  lecturer_name: string
  programming_language: "java" | "python"
  programming_language_display_name: "Java" | "Python"
  study_program_id?: string
  study_program_name?: string
  semester: number
  academic_term: "Ganjil" | "Genap"
  academic_term_value: "GANJIL" | "GENAP"
  academic_period_id: string
  academic_year: string
  jobsheet_count: number
  student_count: number
}

export interface ClassClonePreview {
  source_class: {
    id: string
    name: string
    course_name: string
    lecturer_name: string
    programming_language: "java" | "python"
    programming_language_display_name: "Java" | "Python"
    semester: number
    academic_term: "Ganjil" | "Genap"
    academic_term_value: "GANJIL" | "GENAP"
    academic_year: string
  }
  copyable_data: {
    course: boolean
    lecturer: boolean
    jobsheets: number
    settings: boolean
  }
  excluded_data: string[]
}

export interface ClassJobsheet {
  id: string
  classJobsheetId: string
  kelasPraktikumId?: string
  id_kelas_praktikum?: string
  mataKuliahId?: string
  id_mata_kuliah?: string
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

export interface StudyProgram {
  id: string
  name: string
}

export interface Department {
  id: string
  name: string
  studyPrograms: StudyProgram[]
}

export interface CreateStudentPayload {
  nim: string
  fullname: string
  email: string
  angkatan?: number
  semester?: number
  status?: AdminUserStatus
  programStudi?: string
  jurusan?: string
  studyProgramId?: string
  isTransferStudent?: boolean
  transferOriginSemester?: number
  transferReason?: string
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
  studyProgramId?: string
  isTransferStudent?: boolean
  transferOriginSemester?: number
  transferReason?: string
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
  programmingLanguage?: "java" | "python"
  status?: "Aktif" | "Nonaktif" | "Arsip"
  class_name?: string
  className?: string
}

export interface CloneClassPayload {
  source_class_id: string
  name: string
  academic_period_id?: string
  academic_year?: string
  semester?: string | number
  study_program_id?: string
  generation?: number
  class_name?: string
  lecturer_id?: string
  programming_language?: "java" | "python"
  copy_jobsheets: boolean
  auto_enroll_students: boolean
}

export interface CloneClassResult {
  class_id: string
  students_added: number
  jobsheets_copied: number
}

export interface UpdateClassPayload {
  courseId: string
  name: string
  lecturerId: string
  programmingLanguage?: "java" | "python"
  status: "Aktif" | "Nonaktif" | "Arsip"
}
