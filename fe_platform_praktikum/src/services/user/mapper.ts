import type { User, UserResponse } from "./types"
import { formatDateOnlyForInput } from "../../shared/utils/dateOnly"

const emptyPersonalData = {
  no_telepon: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  kota: "",
}

export const mapUserResponse = (data: UserResponse): User => {
  const user: User = {
    id: data.id,
    fullname: data.fullname ?? data.full_name ?? "",
    email: data.email,
    role: data.role,
    isActive: data.is_active ?? data.isActive ?? true,
    createdAt: data.created_at ?? data.createdAt ?? "",
    avatarUrl: data.avatar_url ?? data.avatarUrl,
    personalData: {
      no_telepon: data.no_telepon ?? emptyPersonalData.no_telepon,
      tempat_lahir: data.tempat_lahir ?? emptyPersonalData.tempat_lahir,
      tanggal_lahir: formatDateOnlyForInput(data.tanggal_lahir),
      kota: data.kota ?? emptyPersonalData.kota,
    },
    isPasswordChanged: data.is_password_changed ?? false,
  }

  if (data.role === "MAHASISWA") {
    user.studentProfile = {
      nim: data.nim ?? "",
      programStudi: data.program_studi ?? "",
      jurusan: data.jurusan ?? "",
      angkatan: data.angkatan ?? 0,
      semester: data.semester ?? 0,
      status: data.student_status ?? data.status ?? "",
      kelas: data.kelas,
    }
  }

  if (data.role === "DOSEN") {
    user.lecturerProfile = {
      nip: data.nip ?? "",
      programStudi: data.program_studi || "Teknik Informatika",
      jurusan: data.jurusan || "Teknologi Informasi",
    }
  }

  if (data.role === "ADMIN") {
    user.adminProfile = {
      nip: data.nip ?? "",
      programStudi: data.program_studi ?? "",
      jurusan: data.jurusan ?? "",
    }
  }

  return user
}
