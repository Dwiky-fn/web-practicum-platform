export interface Course {
  id: string;
  userId?: string;
  name: string;
  code: string;
  lecturer?: string;
  semester: number;
  sks?: number;
  status?: string;
  created_at?: string;
  progress?: number;
  programmingLanguage?: string;
}

export interface CourseListResponse {
  data: Course[];
}
