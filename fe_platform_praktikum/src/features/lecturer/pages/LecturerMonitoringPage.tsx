import { useMemo, useState } from "react"
import LecturerLayout from "../components/LecturerLayout"
import { LecturerPanel, LecturerTable, NativeSelect, PageHeader, SearchBox, StatCard } from "../components/LecturerUI"
import { getCourse, lecturerCourses, lecturerJobsheets, studentProgress } from "../data/dummy"

export default function LecturerMonitoringPage() {
  const [courseId, setCourseId] = useState("pbo")
  const [className, setClassName] = useState("A")
  const [jobsheetNumber, setJobsheetNumber] = useState("2")
  const [status, setStatus] = useState("all")
  const [keyword, setKeyword] = useState("")
  const course = getCourse(courseId)
  const jobsheets = lecturerJobsheets.filter((jobsheet) => jobsheet.courseId === course.id)

  const filteredStudents = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return studentProgress.filter((student) => {
      const matchKeyword = !normalized || [student.nim, student.name].some((value) => value.toLowerCase().includes(normalized))
      const matchStatus = status === "all" || student.status === status
      const matchJobsheet = jobsheetNumber === "all" || String(student.jobsheet) === jobsheetNumber
      return matchKeyword && matchStatus && matchJobsheet
    })
  }, [jobsheetNumber, keyword, status])

  const doneCount = filteredStudents.filter((student) => student.status === "Selesai").length
  const workingCount = filteredStudents.filter((student) => student.status === "Sedang").length
  const notStartedCount = filteredStudents.filter((student) => student.status === "Belum").length

  return (
    <LecturerLayout>
      <PageHeader
        title="Monitoring Praktikum"
        subtitle="Pantau aktivitas pengerjaan mahasiswa berdasarkan kelas dan jobsheet."
      />

      <LecturerPanel className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <NativeSelect
            value={courseId}
            onChange={(value) => {
              const nextCourse = getCourse(value)
              setCourseId(value)
              setClassName(nextCourse.classes[0].name)
            }}
            label="Mata kuliah"
          >
            {lecturerCourses.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </NativeSelect>
          <NativeSelect value={className} onChange={setClassName} label="Kelas">
            {course.classes.map((item) => (
              <option key={item.id} value={item.name}>Kelas {item.name}</option>
            ))}
          </NativeSelect>
          <NativeSelect value={jobsheetNumber} onChange={setJobsheetNumber} label="Jobsheet">
            <option value="all">Semua Jobsheet</option>
            {jobsheets.map((jobsheet) => (
              <option key={jobsheet.id} value={jobsheet.number}>Jobsheet {jobsheet.number}</option>
            ))}
          </NativeSelect>
          <NativeSelect value={status} onChange={setStatus} label="Status">
            <option value="all">Semua Status</option>
            <option value="Belum">Belum Mulai</option>
            <option value="Sedang">Sedang Mengerjakan</option>
            <option value="Selesai">Selesai</option>
          </NativeSelect>
        </div>
      </LecturerPanel>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Mahasiswa" value={30} />
        <StatCard label="Belum Mulai" value={notStartedCount} />
        <StatCard label="Sedang Mengerjakan" value={workingCount} />
        <StatCard label="Selesai" value={doneCount} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <LecturerPanel className="p-5">
          <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Insight Praktikum</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>6 mahasiswa belum memulai praktikum</li>
            <li>4 mahasiswa tidak aktif lebih dari 3 hari</li>
            <li>3 mahasiswa berhenti di Percobaan 2</li>
          </ul>
        </LecturerPanel>
        <LecturerPanel className="p-5">
          <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Aktivitas Terbaru</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>Andi menjalankan kode (15 menit lalu)</li>
            <li>Citra mengedit analisa (1 jam lalu)</li>
            <li>Budi membuka jobsheet (2 jam lalu)</li>
          </ul>
        </LecturerPanel>
      </section>

      <LecturerPanel className="mt-6 p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Daftar Mahasiswa</h2>
          <SearchBox value={keyword} onChange={setKeyword} placeholder="Cari Mahasiswa" />
        </div>
        <LecturerTable headers={["NIM", "Nama", "Status", "Aktifitas", "Terakhir Aktif"]}>
          {filteredStudents.map((student) => (
            <tr key={student.id}>
              <td className="px-4 py-3 font-mono">{student.nim}</td>
              <td className="px-4 py-3">{student.name}</td>
              <td className="px-4 py-3 text-center">{student.status}</td>
              <td className="px-4 py-3 text-center">R: {student.runs}x E: {student.edits}x</td>
              <td className="px-4 py-3 text-center">{student.lastActive}</td>
            </tr>
          ))}
        </LecturerTable>
        <p className="mt-4 text-xs text-gray-500">R: Run Kode, E: Edit Kode & Analisa</p>
      </LecturerPanel>
    </LecturerLayout>
  )
}
