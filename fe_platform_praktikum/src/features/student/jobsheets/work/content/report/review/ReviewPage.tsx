import { Navigate, useParams, useSearchParams } from "react-router-dom"
import { useMemo } from "react"
import { academicJobsheetWorkPath, type AcademicScope } from "../../../../../../../services/academicScope"

export default function ReviewPage() {
  const { courseId, mataKuliahId: routeMataKuliahId, jobsheetId } = useParams<{
    courseId?: string
    mataKuliahId?: string
    jobsheetId?: string
  }>()
  const [searchParams] = useSearchParams()
  const classId = searchParams.get("classId") || undefined
  const mataKuliahId = routeMataKuliahId || searchParams.get("mataKuliahId") || undefined
  const kelasPraktikumId = searchParams.get("kelasPraktikumId") || undefined
  const effectiveCourseId = mataKuliahId || courseId

  const academicScope: AcademicScope = useMemo(
    () => ({ classId, mataKuliahId, kelasPraktikumId }),
    [classId, mataKuliahId, kelasPraktikumId],
  )

  const worksPath = jobsheetId && effectiveCourseId
    ? `${academicJobsheetWorkPath(effectiveCourseId, jobsheetId, academicScope)}${window.location.search}`
    : "/mata-kuliah"

  return <Navigate to={worksPath} replace />
}
