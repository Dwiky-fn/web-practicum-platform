import { apiFetch } from "../api"
import type { User, UserResponse } from "./types"

const emptyPersonalData = {
  phone: "",
  birthPlace: "",
  birthDate: "",
  gender: "",
  city: "",
}

const mapUserResponse = (data: UserResponse): User => {
  const user: User = {
    id: data.id,
    fullname: data.fullname ?? data.full_name ?? "",
    email: data.email,
    role: data.role,
    isActive: data.is_active,
    createdAt: data.created_at,
    avatarUrl: data.avatar_url,
    personalData: {
      phone: data.phone ?? emptyPersonalData.phone,
      birthPlace: data.birth_place ?? emptyPersonalData.birthPlace,
      birthDate: data.birth_date ?? emptyPersonalData.birthDate,
      gender: data.gender ?? emptyPersonalData.gender,
      city: data.city ?? emptyPersonalData.city,
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

export const getUserById = async (userId: string): Promise<User> => {
  const res = await apiFetch(`/users/${userId}`)

  return mapUserResponse(res.data.user)
}
