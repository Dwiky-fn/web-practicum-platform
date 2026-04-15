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
  phone: string;
  birthPlace: string;
  birthDate: string;
  gender: string;
  city: string;
}

export interface CurrentUser {
  id: string;
  fullname: string;
  email: string;
  role: Role;
  avatarUrl?: string;

  studentProfile?: StudentProfile;
  lecturerProfile?: LecturerProfile;
  adminProfile?: AdminProfile;

  personalData: PersonalData;
}
