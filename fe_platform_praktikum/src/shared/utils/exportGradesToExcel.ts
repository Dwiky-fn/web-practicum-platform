import * as XLSX from "xlsx"
import type { JobsheetSubmission } from "../../services/submission/types"

export interface ExportGradeStudent {
  id: string
  nim: string
  fullname: string
  name?: string
}

export interface ExportGradeJobsheet {
  id: string
  number: number | string
  title: string
}

export interface ExportGradeMatrixItem {
  student: { id: string }
  jobsheet: { id: string }
  submission: JobsheetSubmission | null
}

export interface ExportClassGradesOptions {
  className: string
  courseName: string
  students: ExportGradeStudent[]
  jobsheets: ExportGradeJobsheet[]
  matrix: ExportGradeMatrixItem[]
  jobsheetPlan?: number
}

export interface ExportCourseClassData {
  className: string
  students: ExportGradeStudent[]
  jobsheets: ExportGradeJobsheet[]
  matrix: ExportGradeMatrixItem[]
  jobsheetPlan?: number
}

export interface ExportCourseGradesOptions {
  courseName: string
  classesData: ExportCourseClassData[]
}

export function exportClassGradesToExcel(options: ExportClassGradesOptions) {
  const { className, courseName, students, jobsheets, matrix, jobsheetPlan } = options

  // Sort students by NIM numerically or alphabetically
  const sortedStudents = [...students].sort((a, b) =>
    (a.nim || "").localeCompare(b.nim || "", undefined, { numeric: true })
  )

  // Determine total planned jobsheets (minimum is jobsheetPlan or jobsheets.length, fallback 1)
  const totalPlanned = Math.max(jobsheetPlan ?? 0, jobsheets.length, 1)

  // Build planned jobsheet column specifications (JS 1 .. JS N)
  const plannedColumns: Array<{ number: number; title: string; id?: string }> = []
  for (let i = 1; i <= totalPlanned; i++) {
    const foundJs = jobsheets.find((j) => Number(j.number) === i)
    plannedColumns.push({
      number: i,
      title: foundJs ? foundJs.title : "",
      id: foundJs?.id,
    })
  }

  // Build header labels: No, NIM, Nama Mahasiswa, JS 1: Title ..., JS N ..., Nilai Akhir
  const headers = ["No", "NIM", "Nama Mahasiswa"]
  plannedColumns.forEach((col) => {
    headers.push(col.title ? `JS ${col.number}: ${col.title}` : `JS ${col.number}`)
  })
  headers.push("Nilai Akhir")

  // Build rows data
  const dataRows = sortedStudents.map((student, idx) => {
    const row: Record<string, string | number> = {
      "No": idx + 1,
      "NIM": student.nim || "-",
      "Nama Mahasiswa": student.fullname || student.name || "-",
    }

    let totalScore = 0
    let scoredCount = 0

    plannedColumns.forEach((col) => {
      const colHeader = col.title ? `JS ${col.number}: ${col.title}` : `JS ${col.number}`
      
      if (!col.id) {
        // Jobsheet not created/determined yet in database
        row[colHeader] = "-"
        return
      }

      const item = matrix.find(
        (m) => m.student.id === student.id && m.jobsheet.id === col.id
      )
      const sub = item?.submission
      const score = sub?.review?.finalScore ?? sub?.score

      if (score !== undefined && score !== null) {
        const scoreVal = Number(score)
        row[colHeader] = scoreVal
        totalScore += scoreVal
        scoredCount++
      } else if (sub && sub.status && sub.status !== "DRAFT") {
        row[colHeader] = "Belum Dinilai"
      } else {
        row[colHeader] = "-"
      }
    })

    const colFinal = "Nilai Akhir"
    row[colFinal] = scoredCount > 0 ? Number((totalScore / scoredCount).toFixed(2)) : "-"

    return row
  })

  // Create sheet & workbook
  const worksheet = XLSX.utils.json_to_sheet(dataRows, { header: headers })

  // Auto calculate column widths
  const colWidths = headers.map((header) => {
    let maxLen = header.length
    dataRows.forEach((row) => {
      const val = String(row[header] ?? "")
      if (val.length > maxLen) maxLen = val.length
    })
    return { wch: Math.max(maxLen + 3, 10) }
  })
  worksheet["!cols"] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Rekapitulasi Nilai")

  // Format clean class name (e.g. "3A" from "PRAKTIKUM... - 3A")
  let cleanClass = className.trim()
  if (cleanClass.includes(" - ")) {
    cleanClass = cleanClass.split(" - ").pop()?.trim() || cleanClass
  }
  cleanClass = cleanClass.replace(/^Kelas\s+/i, "").trim()
  const cleanCourse = courseName.replace(/^Mata\s+Kuliah\s+/i, "").trim()

  const safeClass = cleanClass.replace(/[:*?"<>|/\\]/g, "").trim()
  const safeCourse = cleanCourse.replace(/[:*?"<>|/\\]/g, "").trim()

  const fileName = `Laporan-Rekapitulasi-Nilai-${safeClass}-${safeCourse}.xlsx`

  XLSX.writeFile(workbook, fileName)
}

export function exportCourseGradesToExcel(options: ExportCourseGradesOptions) {
  const { courseName, classesData } = options
  const workbook = XLSX.utils.book_new()

  classesData.forEach((classData) => {
    const { className, students, jobsheets, matrix, jobsheetPlan } = classData

    const sortedStudents = [...students].sort((a, b) =>
      (a.nim || "").localeCompare(b.nim || "", undefined, { numeric: true })
    )

    const totalPlanned = Math.max(jobsheetPlan ?? 0, jobsheets.length, 1)

    const plannedColumns: Array<{ number: number; title: string; id?: string }> = []
    for (let i = 1; i <= totalPlanned; i++) {
      const foundJs = jobsheets.find((j) => Number(j.number) === i)
      plannedColumns.push({
        number: i,
        title: foundJs ? foundJs.title : "",
        id: foundJs?.id,
      })
    }

    const headers = ["No", "NIM", "Nama Mahasiswa"]
    plannedColumns.forEach((col) => {
      headers.push(col.title ? `JS ${col.number}: ${col.title}` : `JS ${col.number}`)
    })
    headers.push("Nilai Akhir")

    const dataRows = sortedStudents.map((student, idx) => {
      const row: Record<string, string | number> = {
        "No": idx + 1,
        "NIM": student.nim || "-",
        "Nama Mahasiswa": student.fullname || student.name || "-",
      }

      let totalScore = 0
      let scoredCount = 0

      plannedColumns.forEach((col) => {
        const colHeader = col.title ? `JS ${col.number}: ${col.title}` : `JS ${col.number}`
        
        if (!col.id) {
          row[colHeader] = "-"
          return
        }

        const item = matrix.find(
          (m) => m.student.id === student.id && m.jobsheet.id === col.id
        )
        const sub = item?.submission
        const score = sub?.review?.finalScore ?? sub?.score

        if (score !== undefined && score !== null) {
          const scoreVal = Number(score)
          row[colHeader] = scoreVal
          totalScore += scoreVal
          scoredCount++
        } else if (sub && sub.status && sub.status !== "DRAFT") {
          row[colHeader] = "Belum Dinilai"
        } else {
          row[colHeader] = "-"
        }
      })

      const colFinal = "Nilai Akhir"
      row[colFinal] = scoredCount > 0 ? Number((totalScore / scoredCount).toFixed(2)) : "-"

      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(dataRows, { header: headers })

    const colWidths = headers.map((header) => {
      let maxLen = header.length
      dataRows.forEach((row) => {
        const val = String(row[header] ?? "")
        if (val.length > maxLen) maxLen = val.length
      })
      return { wch: Math.max(maxLen + 3, 10) }
    })
    worksheet["!cols"] = colWidths

    let cleanSheetName = className.trim()
    if (cleanSheetName.includes(" - ")) {
      cleanSheetName = cleanSheetName.split(" - ").pop()?.trim() || cleanSheetName
    }
    cleanSheetName = cleanSheetName.replace(/^Kelas\s+/i, "").trim()
    cleanSheetName = cleanSheetName.replace(/[:*?/\\[\]]/g, "").slice(0, 31).trim() || "Kelas"

    XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName)
  })

  const cleanCourse = courseName.replace(/^Mata\s+Kuliah\s+/i, "").trim()
  const safeCourse = cleanCourse.replace(/[:*?"<>|/\\]/g, "").trim()

  const fileName = `${safeCourse}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
