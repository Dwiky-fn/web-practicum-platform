import type { Role } from "../../../services/user/types";

export interface FieldConfig {
  name: string;
  label: string;
  type?: 'text' | 'number';
}


export const profileFieldByRole: Record<Role, FieldConfig[]> = {
  MAHASISWA: [
    { name: 'fullname', label: 'Nama Lengkap' },
    { name: 'nim', label: 'Nomor Induk Mahasiswa' },
    { name: 'programStudi', label: 'Program Studi' },
    { name: 'jurusan', label: 'Jurusan' },
    { name: 'angkatan', label: 'Angkatan', type: 'number' },
    { name: 'semester', label: 'Semester', type: 'number' },
    { name: 'status', label: 'Status Mahasiswa' },
  ],
  DOSEN: [
    { name: 'fullname', label: 'Nama Lengkap' },
    { name: 'nip', label: 'Nomor Induk Pegawai' },
    { name: 'programStudi', label: 'Program Studi' },
    { name: 'jurusan', label: 'Jurusan' },
  ],
  ADMIN: [
    { name: 'fullname', label: 'Nama Lengkap' },
    { name: 'nip', label: 'Nomor Induk Pegawai' },
    { name: 'programStudi', label: 'Program Studi' },
    { name: 'jurusan', label: 'Jurusan' },
  ],
}
