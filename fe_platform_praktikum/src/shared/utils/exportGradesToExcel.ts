import * as XLSX from "xlsx"
import type { JobsheetSubmission } from "../../services/submission/types"

export interface ExportGradeStudent {
  id: string
  nim: string
  fullname: string
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
}

export function exportClassGradesToExcel(options: ExportClassGradesOptions) {
  const { className, courseName, students, jobsheets, matrix } = options

  // Sort students by NIM numerically or alphabetically
  const sortedStudents = [...students].sort((a, b) => a.nim.localeCompare(b.nim, undefined, { numeric: true }))

  // Build header labels
  const headers = ["No", "NIM", "Nama Mahasiswa"]
  jobsheets.forEach((js) => {
    headers.push(`Jobsheet ${js.number}: ${js.title}`)
  })
  headers.push("Rata-rata Nilai")

  // Build rows data
  const dataRows = sortedStudents.map((student, idx) => {
    const row: Record<string, string | number> = {
      "No": idx + 1,
      "NIM": student.nim,
      "Nama Mahasiswa": student.fullname,
    }

    let totalScore = 0
    let scoredCount = 0

    jobsheets.forEach((js) => {
      const colName = `Jobsheet ${js.number}: ${js.title}`
      const item = matrix.find(
        (m) => m.student.id === student.id && m.jobsheet.id === js.id
      )
      const sub = item?.submission

      if (sub && sub.score !== undefined && sub.score !== null) {
        const scoreVal = Number(sub.score)
        row[colName] = scoreVal
        totalScore += scoreVal
        scoredCount++
      } else if (sub && sub.status && sub.status !== "DRAFT") {
        row[colName] = "Belum Dinilai"
      } else {
        row[colName] = "-"
      }
    })

    const colAvg = "Rata-rata Nilai"
    row[colAvg] = scoredCount > 0 ? Number((totalScore / scoredCount).toFixed(2)) : "-"

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
    return { wch: Math.max(maxLen + 3, 12) }
  })
  worksheet["!cols"] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Nilai Kelas")

  // Format clean class name (e.g. "3A" from "PRAKTIKUM... - 3A")
  let cleanClass = className.trim()
  if (cleanClass.includes(" - ")) {
    cleanClass = cleanClass.split(" - ").pop()?.trim() || cleanClass
  }
  cleanClass = cleanClass.replace(/^Kelas\s+/i, "").trim()

  // Format clean course name
  const cleanCourse = courseName.replace(/^Mata\s+Kuliah\s+/i, "").trim()

  // Sanitize illegal filename characters (: * ? " < > | / \) while preserving spaces and hyphens
  const safeClass = cleanClass.replace(/[:*?"<>|/\\]/g, "").trim()
  const safeCourse = cleanCourse.replace(/[:*?"<>|/\\]/g, "").trim()

  const fileName = `Rekapnilai-${safeClass}-${safeCourse}.xlsx`

  XLSX.writeFile(workbook, fileName)
}
