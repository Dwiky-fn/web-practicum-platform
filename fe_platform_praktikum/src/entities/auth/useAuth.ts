import { useState } from "react";
import type { User } from "./types";

export function useAuth() {
  // nanti ini dari backend / context
  const [user] = useState<User>({
    id: "1",
    fullName: "Dwiky Juniardi",
    email: "dwiky@email.com",
    role: "MAHASISWA", // ganti ke dosen / admin buat test
  });

  return { user };
}
