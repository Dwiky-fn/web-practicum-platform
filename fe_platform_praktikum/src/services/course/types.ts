export interface Course {
  id: string;
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
  jobsheetCount?: number;
  jobsheet_count?: number;
  programmingLanguage?: string;
}

export interface CourseListResponse {
  data: Course[];
}
