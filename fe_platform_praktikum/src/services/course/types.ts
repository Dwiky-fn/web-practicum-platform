export interface Course {
  id: string;
  mataKuliahId?: string;
  id_mata_kuliah?: string;
  kelasPraktikumId?: string;
  id_kelas_praktikum?: string;
  kelasMahasiswaId?: string;
  id_kelas_mhs?: string;
  userId?: string;
  name: string;
  code: string;
  lecturer?: string;
  description?: string;
  semester: number;
  sks?: number;
  status?: string;
  created_at?: string;
  progress?: number;
  class_id?: string;
  classId?: string;
  jobsheetCount?: number;
  jobsheet_count?: number;
  programmingLanguage?: string;
}

export interface CourseListResponse {
  data: Course[];
}
