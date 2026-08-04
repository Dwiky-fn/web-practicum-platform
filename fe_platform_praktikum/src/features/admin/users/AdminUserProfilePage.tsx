import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import { AdminPanel } from "../components/AdminUI"
import StudentProfileModal from "../../lecturer/components/StudentProfileModal"
import { getUserById } from "../../../services/user/service"

export default function AdminUserProfilePage() {
  const { role, id } = useParams<{ role: "students" | "lecturers"; id: string }>()
  const navigate = useNavigate()
  const [fullname, setFullname] = useState<string>("")

  useEffect(() => {
    if (!id) return
    let isMounted = true
    getUserById(id)
      .then((user) => {
        if (isMounted && user?.fullname) {
          setFullname(user.fullname)
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [id])

  if (!id) {
    return (
      <AdminLayout>
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          User ID tidak valid.
        </div>
      </AdminLayout>
    )
  }

  const roleLabel = role === "lecturers" ? "Dosen" : "Mahasiswa"
  const detailLabel = fullname || (role === "lecturers" ? "Profil Dosen" : "Profil Mahasiswa")

  const breadcrumbItems = [
    { label: "Kelola User", to: `/users/${role ?? "students"}` },
    { label: roleLabel, to: `/users/${role ?? "students"}` },
    { label: detailLabel },
  ]

  return (
    <AdminLayout breadcrumbItems={breadcrumbItems}>
      <button
        type="button"
        onClick={() => navigate(`/users/${role ?? "students"}`)}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 cursor-pointer"
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
