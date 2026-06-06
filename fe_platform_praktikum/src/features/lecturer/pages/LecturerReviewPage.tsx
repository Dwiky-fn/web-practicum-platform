import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import LecturerLayout from "../components/LecturerLayout"
import { LecturerButton, LecturerPanel, PageHeader } from "../components/LecturerUI"
import { getJobsheet, reviewSubmissions, studentProgress } from "../data/dummy"

const codeSample = `public class BilanganBulat {
  public static void main(String[] args) {
    byte nilaiA;
    short nilaiB;

    nilaiA = 97;
    nilaiB = 30000;

    System.out.println(nilaiA);
    System.out.println(nilaiB);
  }
}`

export default function LecturerReviewPage() {
  const { studentId = "mhs-1" } = useParams()
  const [score, setScore] = useState("96")
  const [decision, setDecision] = useState("")
  const navigate = useNavigate()
  const student = studentProgress.find((item) => item.id === studentId) ?? studentProgress[0]
  const submission = reviewSubmissions[0]
  const jobsheet = getJobsheet(submission.jobsheetId)

  const checklist = useMemo(
    () => submission.validation,
    [submission.validation],
  )

  return (
    <LecturerLayout>
      <PageHeader
        title="Review Laporan Praktikum"
        subtitle={`Jobsheet ${jobsheet.number} - ${jobsheet.title}`}
      />

      {decision && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Keputusan sementara: {decision}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <LecturerPanel className="p-5">
          <section className="border-b border-gray-200 pb-5">
            <h2 className="mb-4 text-lg font-semibold">Identitas Mahasiswa</h2>
            <dl className="grid gap-3 text-sm md:grid-cols-[160px_1fr]">
              <dt className="text-gray-600">Nama</dt><dd>{student.name}</dd>
              <dt className="text-gray-600">NIM</dt><dd>{student.nim}</dd>
              <dt className="text-gray-600">Materi</dt><dd>{jobsheet.title}</dd>
              <dt className="text-gray-600">Jobsheet</dt><dd>{jobsheet.number}</dd>
              <dt className="text-gray-600">Tanggal</dt><dd>12 Januari 2026</dd>
            </dl>
          </section>

          <section className="py-5">
            <h2 className="mb-4 text-lg font-semibold">Percobaan</h2>
            {[1, 2].map((item) => (
              <div key={item} className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="mb-3 text-sm font-semibold">Percobaan {item}</p>
                <pre className="overflow-x-auto rounded-md bg-white p-4 text-xs text-gray-800">
                  <code>{codeSample}</code>
                </pre>
                <div className="mt-3 rounded-md bg-white p-3 text-sm">
                  <p className="font-semibold">Output:</p>
                  <p>Error</p>
                </div>
                <div className="mt-3 rounded-md bg-white p-3 text-sm">
                  <p className="font-semibold">Hasil Analisis:</p>
                  <p>Mahasiswa menjelaskan perubahan tipe data dan batas nilai dengan cukup baik.</p>
                </div>
              </div>
            ))}
          </section>

          <section className="border-t border-gray-200 pt-5">
            <h2 className="mb-3 text-lg font-semibold">Kesimpulan Akhir</h2>
            <div className="rounded-md bg-gray-50 p-4 text-sm">
              Konsep tipe data dipahami, namun analisa pada error overflow masih perlu diperjelas.
            </div>
          </section>
        </LecturerPanel>

        <aside className="space-y-5">
          <LecturerPanel className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Ringkasan Review</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold">Evaluasi Otomatis (AI)</p>
                <ul className="mt-2 space-y-1">
                  {submission.aiSummary.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold">Plagiarisme</p>
                <p>Similarity Score: {submission.similarity}%</p>
              </div>
              <div>
                <p className="font-semibold">Checklist Validasi</p>
                <ul className="mt-2 space-y-1">
                  {checklist.map((item) => (
                    <li key={item}>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked />
                        {item}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </LecturerPanel>

          <LecturerPanel className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Penilaian & Keputusan</h2>
            <label className="mb-3 block text-sm font-medium">
              Nilai AI
              <input className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3" value={student.aiScore ?? ""} readOnly />
            </label>
            <label className="mb-3 block text-sm font-medium">
              Nilai Akhir
              <input className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3" value={score} onChange={(event) => setScore(event.target.value)} />
            </label>
            <label className="block text-sm font-medium">
              Nilai AI
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-gray-300 p-3 text-sm"
                defaultValue="Catatan AI dapat digunakan sebagai bahan pertimbangan sebelum dosen memberi nilai final."
              />
            </label>
            <div className="mt-5 flex gap-3">
              <LecturerButton variant="secondary" className="flex-1" onClick={() => setDecision("Tolak & Revisi")}>
                Tolak & Revisi
              </LecturerButton>
              <LecturerButton className="flex-1" onClick={() => setDecision("Terima")}>
                Terima
              </LecturerButton>
            </div>
            <LecturerButton variant="ghost" className="mt-3 w-full" onClick={() => navigate(-1)}>
              Kembali
            </LecturerButton>
          </LecturerPanel>
        </aside>
      </div>
    </LecturerLayout>
  )
}
