export type Role = "MAHASISWA" | "DOSEN" | "ADMIN";

export interface StudentProfile {
  nim: string;
  programStudi: string;
  jurusan: string;
  angkatan: number;
  semester: number;
  status: string;
  kelas?: string;
  nama_kelas?: string;
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
  isPasswordChanged?: boolean
}

export interface UserResponse {
  id: string
  fullname?: string
  full_name?: string
  email: string
  role: Role
  is_active?: boolean
  isActive?: boolean
  is_password_changed?: boolean
  created_at?: string
  createdAt?: string
  avatar_url?: string
  avatarUrl?: string
  nim?: string;
  nip?: string;
  program_studi?: string;
  programStudi?: string;
  jurusan?: string;
  angkatan?: number;
  semester?: number;
  status?: string;
  student_status?: string;
  lp_no_telepon?: string;
  lp_tempat_lahir?: string;
  lp_tanggal_lahir?: string;
  lp_kota?: string;
  no_telepon?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  kota?: string;
  kelas?: string;
}

export interface UpdateUserPayload {
  fullname?: string;
  full_name?: string;
  avatarUrl?: string;
  no_telepon?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  kota?: string;
  personalData?: Partial<PersonalData>;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}
