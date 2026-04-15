export type UserRole = "admin" | "dosen" | "mahasiswa"

interface LoginPayload {
  email: string
  password: string
}

interface LoginResponse {
  token: string
  role: UserRole
}

/**
 * Simulasi login API
 * Nanti tinggal ganti ke fetch/axios
 */
export async function login(
  payload: LoginPayload
): Promise<LoginResponse> {
  const { email, password } = payload

  // simulasi delay biar berasa API
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (!email || !password) {
    throw new Error("Email dan password wajib diisi")
  }

  // AUTO ROLE DETECT (sementara dari email)
  if (email.includes("admin")) {
    return {
      token: "fake-admin-token",
      role: "admin",
    }
  }

  if (email.includes("dosen")) {
    return {
      token: "fake-dosen-token",
      role: "dosen",
    }
  }

  return {
    token: "fake-mahasiswa-token",
    role: "mahasiswa",
  }
}
