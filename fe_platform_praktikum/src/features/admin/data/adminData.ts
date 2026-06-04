export type AdminTab = "semester" | "courses" | "classes"
export type UserRoleTab = "students" | "lecturers"

export interface AdminStudent {
  id: string
  nim: string
  fullname: string
  email: string
  angkatan: number
  semester: number
  status: "Aktif" | "Nonaktif"
  programStudi: string
  jurusan: string
  avatarUrl?: string
}

export interface AdminLecturer {
  id: string
  nip: string
  fullname: string
  email: string
  status: "Aktif" | "Nonaktif"
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
  status: "Aktif" | "Nonaktif"
}

export interface AcademicCourse {
  id: string
  code: string
  name: string
  semester: number
  sks: number
  status: "Aktif" | "Nonaktif"
}

export interface AcademicClass {
  id: string
  name: string
  courseName: string
  courseId: string
  lecturer: string
  semesterYear: string
  studentSemester: number
  status: "Aktif" | "Nonaktif" | "Draft" | "Arsip"
}

export interface ClassJobsheet {
  id: string
  title: string
  deadline: string
  status: "Selesai" | "Aktif" | "Draft"
}

export const adminStudents: AdminStudent[] = [
  {
    id: "mhs-1",
    nim: "3202316001",
    fullname: "Dwiky Juniardi",
    email: "dwikyjuniardi@polnep.ac.id",
    angkatan: 2023,
    semester: 3,
    status: "Aktif",
    programStudi: "Teknik Informatika",
    jurusan: "Teknik Elektro",
    avatarUrl: "https://res.cloudinary.com/praktikum/image/upload/v1780497165/platform-praktikum/avatars/bwwgewbehn2v9u5pxvuc.jpg",
  },
  {
    id: "mhs-2",
    nim: "3202316002",
    fullname: "Aisah",
    email: "aisah@polnep.ac.id",
    angkatan: 2023,
    semester: 3,
    status: "Aktif",
    programStudi: "Teknik Informatika",
    jurusan: "Teknik Elektro",
  },
  {
    id: "mhs-3",
    nim: "3202316003",
    fullname: "Wahyu Ramdhani",
    email: "wahyu@polnep.ac.id",
    angkatan: 2023,
    semester: 3,
    status: "Aktif",
    programStudi: "Teknik Informatika",
    jurusan: "Teknik Elektro",
  },
]

export const availableStudents: AdminStudent[] = [
  {
    id: "mhs-4",
    nim: "3202316004",
    fullname: "Rafiq Kamil",
    email: "rafiq@polnep.ac.id",
    angkatan: 2023,
    semester: 3,
    status: "Aktif",
    programStudi: "Teknik Informatika",
    jurusan: "Teknik Elektro",
  },
  {
    id: "mhs-5",
    nim: "3202316005",
    fullname: "Aulia",
    email: "aulia@polnep.ac.id",
    angkatan: 2023,
    semester: 3,
    status: "Aktif",
    programStudi: "Teknik Informatika",
    jurusan: "Teknik Elektro",
  },
  {
    id: "mhs-6",
    nim: "3202316006",
    fullname: "Rizkia",
    email: "rizkia@polnep.ac.id",
    angkatan: 2023,
    semester: 3,
    status: "Aktif",
    programStudi: "Teknik Informatika",
    jurusan: "Teknik Elektro",
  },
  {
    id: "mhs-7",
    nim: "3202316007",
    fullname: "Muhammad Faisal",
    email: "faisal@polnep.ac.id",
    angkatan: 2023,
    semester: 3,
    status: "Aktif",
    programStudi: "Teknik Informatika",
    jurusan: "Teknik Elektro",
  },
]

export const adminLecturers: AdminLecturer[] = [
  {
    id: "dosen-1",
    nip: "1978xxxx",
    fullname: "Suheri",
    email: "suheri@kampus.ac.id",
    status: "Aktif",
    programStudi: "Teknik Informatika",
    jurusan: "Teknik Elektro",
    phone: "081234567890",
    birthInfo: "Sintang, 23 Juni 2005",
    gender: "Laki-laki",
    city: "Pontianak",
  },
  {
    id: "dosen-2",
    nip: "1979xxxx",
    fullname: "Nenny Ferdyanti",
    email: "nenny@kampus.ac.id",
    status: "Aktif",
    programStudi: "Teknik Informatika",
    jurusan: "Teknik Elektro",
    phone: "081234567891",
    birthInfo: "Pontianak, 12 Mei 1980",
    gender: "Perempuan",
    city: "Pontianak",
  },
  {
    id: "dosen-3",
    nip: "1980xxxx",
    fullname: "Suharsono",
    email: "suharsono@kampus.ac.id",
    status: "Aktif",
    programStudi: "Teknik Informatika",
    jurusan: "Teknik Elektro",
    phone: "081234567892",
    birthInfo: "Ketapang, 4 Januari 1979",
    gender: "Laki-laki",
    city: "Pontianak",
  },
]

export const semesters: AcademicSemester[] = [
  { id: "sem-1", year: "2025/2026", term: "Ganjil", status: "Aktif" },
  { id: "sem-2", year: "2024/2025", term: "Genap", status: "Nonaktif" },
  { id: "sem-3", year: "2024/2025", term: "Ganjil", status: "Nonaktif" },
]

export const academicCourses: AcademicCourse[] = [
  { id: "mk-1", code: "TIF21818", name: "Pemrograman Berorientasi Objek", semester: 5, sks: 2, status: "Aktif" },
  { id: "mk-2", code: "TIF21618", name: "Basis Data", semester: 3, sks: 2, status: "Nonaktif" },
  { id: "mk-3", code: "TIF21718", name: "Struktur Data", semester: 3, sks: 2, status: "Nonaktif" },
]

export const academicClasses: AcademicClass[] = [
  {
    id: "kelas-a",
    name: "A",
    courseName: "Pemrograman Berorientasi Objek",
    courseId: "mk-1",
    lecturer: "Suheri",
    semesterYear: "2025/2026 - Ganjil",
    studentSemester: 3,
    status: "Aktif",
  },
  {
    id: "kelas-b",
    name: "B",
    courseName: "Basis Data",
    courseId: "mk-2",
    lecturer: "Nenny Ferdyanti",
    semesterYear: "2025/2026 - Ganjil",
    studentSemester: 3,
    status: "Nonaktif",
  },
  {
    id: "kelas-c",
    name: "A",
    courseName: "Struktur Data",
    courseId: "mk-3",
    lecturer: "Suharsono",
    semesterYear: "2025/2026 - Ganjil",
    studentSemester: 3,
    status: "Nonaktif",
  },
]

export const classJobsheets: ClassJobsheet[] = [
  { id: "job-1", title: "Pengenalan OOP", deadline: "20 Okt 2025 - 23:59", status: "Selesai" },
  { id: "job-2", title: "Tipe Data, Variabel, dan Konstanta", deadline: "20 Okt 2025 - 23:59", status: "Aktif" },
  { id: "job-3", title: "Perulangan", deadline: "20 Okt 2025 - 23:59", status: "Draft" },
]

export const adminActivities = [
  ["12.23", "Dosen Suheri mempublish Jobsheet PBO"],
  ["11.45", "Admin menambahkan Kelas B"],
  ["11.40", "Mahasiswa mengumpulkan laporan"],
  ["11.04", "Admin menambahkan Kelas D"],
  ["10.54", "Mahasiswa mengumpulkan laporan"],
]
