export interface Course {
  id: string;
  userId: string;
  name: string;
  code: string;
  lecturer: string;
  semester: number;
  progress: number;
  programmingLanguage: string;
}

export interface CourseListResponse {
  data: Course[];
}
