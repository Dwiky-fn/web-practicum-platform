import { ArrowLeft } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import { AdminPanel } from "../components/AdminUI"
import StudentProfileModal from "../../lecturer/components/StudentProfileModal"

export default function AdminUserProfilePage() {
  const { role, id } = useParams<{ role: "students" | "lecturers"; id: string }>()
  const navigate = useNavigate()

  if (!id) {
    return (
      <AdminLayout>
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          User ID tidak valid.
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <button
        type="button"
        onClick={() => navigate(`/users/${role ?? "students"}`)}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <AdminPanel className="mx-auto max-w-5xl p-6">
        <StudentProfileModal
          studentId={id}
          isInline={true}
          canEdit={true}
        />
      </AdminPanel>
    </AdminLayout>
  )
}
