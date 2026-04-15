export type Role = 'MAHASISWA' | 'DOSEN' | 'ADMIN'

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}
