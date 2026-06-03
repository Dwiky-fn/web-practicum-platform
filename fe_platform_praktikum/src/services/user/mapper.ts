import type { User, UserResponse } from "./types"

const emptyPersonalData = {
  no_telepon: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  kota: "",
}

function toDateOnly(value?: string) {
  if (!value) return emptyPersonalData.tanggal_lahir

  return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value
}

export const mapUserResponse = (data: UserResponse): User => {
  const user: User = {
    id: data.id,
    fullname: data.fullname ?? data.full_name ?? "",
    email: data.email,
    role: data.role,
    isActive: data.is_active,
    createdAt: data.created_at,
    avatarUrl: data.avatar_url,
    personalData: {
      no_telepon: data.no_telepon ?? emptyPersonalData.no_telepon,
      tempat_lahir: data.tempat_lahir ?? emptyPersonalData.tempat_lahir,
      tanggal_lahir: toDateOnly(data.tanggal_lahir),
      kota: data.kota ?? emptyPersonalData.kota,
    },
  }

  if (data.role === "MAHASISWA") {
    user.studentProfile = {
      nim: data.nim ?? "",
      programStudi: data.program_studi ?? "",
      jurusan: data.jurusan ?? "",
      angkatan: data.angkatan ?? 0,
      semester: data.semester ?? 0,
      status: data.student_status ?? data.status ?? "",
    }
  }

  if (data.role === "DOSEN") {
    user.lecturerProfile = {
      nip: data.nip ?? "",
      programStudi: data.program_studi ?? "",
      jurusan: data.jurusan ?? "",
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
