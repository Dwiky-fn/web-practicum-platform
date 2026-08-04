import * as XLSX from "xlsx"
import type { AdminStudent, AdminLecturer } from "../../services/admin/types"

function extractCleanFirstName(fullname: string): string {
  if (!fullname) return "Dosen"
  const clean = fullname
    .replace(/(dr\.|ir\.|prof\.|s\.t\.|m\.t\.|m\.kom\.|ph\.d\.|s\.kom\.|m\.cs\.|m\.sc\.)/gi, "")
    .trim()
  const words = clean.split(/\s+/).filter(Boolean)
  const firstWord = words.find((w) => w.length >= 2) || words[0] || "Dosen"
  const alphaOnly = firstWord.replace(/[^a-zA-Z]/g, "")
  if (!alphaOnly) return "Dosen"
  return alphaOnly.charAt(0).toUpperCase() + alphaOnly.slice(1).toLowerCase()
}

export function getLecturerDefaultPasswordDisplay(fullname: string, nip?: string): string {
  const firstName = extractCleanFirstName(fullname)
  if (nip && nip.trim().length >= 4) {
    return `${firstName}${nip.trim().slice(-4)}`
  }
  return `${firstName}1234`
}

export function exportUserListToExcel(
  type: "students" | "lecturers",
  data: (AdminStudent | AdminLecturer)[]
) {
  const isStudent = type === "students"

  let excelRows: Record<string, any>[] = []

  if (isStudent) {
    const students = data as AdminStudent[]
    excelRows = students.map((s, idx) => ({
      No: idx + 1,
      NIM: s.nim || "-",
      "Nama Mahasiswa": s.fullname || "-",
      Angkatan: s.angkatan || "-",
      Semester: s.semester || "-",
      Email: s.email || "-",
      "Password Login (Default)": s.nim || "-",
      Status: s.status || "Aktif",
    }))
  } else {
    const lecturers = data as AdminLecturer[]
    excelRows = lecturers.map((l, idx) => ({
      No: idx + 1,
      NIP: l.nip || "-",
      "Nama Dosen": l.fullname || "-",
      Email: l.email || "-",
      "Password Login (Default)": getLecturerDefaultPasswordDisplay(l.fullname, l.nip),
      Status: l.status || "Aktif",
    }))
  }

  const worksheet = XLSX.utils.json_to_sheet(excelRows)

  // Auto-fit column widths
  const maxCols = Object.keys(excelRows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...excelRows.map((row) => String(row[key] ?? "").length)
    )
    return { wch: Math.min(Math.max(maxLen + 4, 12), 45) }
  })
  worksheet["!cols"] = maxCols

  const workbook = XLSX.utils.book_new()
  const sheetName = isStudent ? "Data Mahasiswa" : "Data Dosen"
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const dateStr = new Date().toISOString().split("T")[0]
  const fileName = `Data_${isStudent ? "Mahasiswa" : "Dosen"}_${dateStr}.xlsx`

  XLSX.writeFile(workbook, fileName)
}

export function downloadUserImportTemplate(type: "students" | "lecturers") {
  const isStudent = type === "students"

  let templateRows: Record<string, any>[] = []

  if (isStudent) {
    templateRows = [
      {
        NIM: "202301001",
        "Nama Mahasiswa": "Ahmad Dani",
        Angkatan: 2023,
        Semester: 3,
        Email: "ahmad@student.polnep.ac.id",
        "Password (Default)": "202301001",
      },
      {
        NIM: "202301002",
        "Nama Mahasiswa": "Budi Gunawan",
        Angkatan: 2023,
        Semester: 3,
        Email: "budi@student.polnep.ac.id",
        "Password (Default)": "202301002",
      },
    ]
  } else {
    templateRows = [
      {
        NIP: "198001012005011001",
        "Nama Dosen": "Dwiky Firmansyah",
        Email: "dwiky@polnep.ac.id",
        "Password (Default)": "Dwiky1001",
      },
      {
        NIP: "198505122008022002",
        "Nama Dosen": "Dr. Budi Santoso",
        Email: "budi@polnep.ac.id",
        "Password (Default)": "Budi2002",
      },
    ]
  }

  const worksheet = XLSX.utils.json_to_sheet(templateRows)

  const maxCols = Object.keys(templateRows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...templateRows.map((row) => String(row[key] ?? "").length)
    )
    return { wch: Math.min(Math.max(maxLen + 4, 15), 45) }
  })
  worksheet["!cols"] = maxCols

  const workbook = XLSX.utils.book_new()
  const sheetName = isStudent ? "Template Mahasiswa" : "Template Dosen"
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const fileName = `Template_Import_${isStudent ? "Mahasiswa" : "Dosen"}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
