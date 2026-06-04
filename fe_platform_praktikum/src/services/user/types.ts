export type Role = "MAHASISWA" | "DOSEN" | "ADMIN";

export interface StudentProfile {
  nim: string;
  programStudi: string;
  jurusan: string;
  angkatan: number;
  semester: number;
  status: string;
}

export interface LecturerProfile {
  nip: string;
  programStudi: string;
  jurusan: string;
}

export interface AdminProfile {
  nip: string;
  programStudi: string;
  jurusan: string;
}

export interface PersonalData {
  no_telepon: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  kota: string;
}

export interface User {
  id: string
  fullname: string
  email: string
  role: Role
  isActive: boolean
  createdAt: string
  avatarUrl?: string
  studentProfile?: StudentProfile
  lecturerProfile?: LecturerProfile
  adminProfile?: AdminProfile
  personalData: PersonalData
}

export interface UserResponse {
  id: string
  fullname?: string
  full_name?: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
  avatar_url?: string
  nim?: string
  nip?: string
  program_studi?: string
  jurusan?: string
  angkatan?: number
  semester?: number
  status?: string
  student_status?: string
  no_telepon?: string
  tempat_lahir?: string
  tanggal_lahir?: string
  kota?: string
}

export interface UpdateUserPayload {
  isActive?: boolean
  avatarUrl?: string
  personalData?: Partial<PersonalData>
}

export interface UpdateEmailPayload {
  email: string
  currentPassword: string
}

export interface UpdatePasswordPayload {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
