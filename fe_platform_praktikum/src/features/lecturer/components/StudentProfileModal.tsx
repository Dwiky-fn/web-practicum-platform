import { useEffect, useState } from "react"
import { Loader2, User as UserIcon, Mail, BookOpen, GraduationCap, Calendar, Phone, MapPin, Pencil, Check, X } from "lucide-react"
import { LecturerModal, LecturerButton, inputClass } from "./LecturerUI"
import { getUserById } from "../../../services/user/service"
import { getAdminSemesters, updateAdminUser } from "../../../services/admin/service"
import type { User } from "../../../services/user/types"
import type { AcademicSemester, AdminStudent, AdminLecturer } from "../../../services/admin/types"
import { getAcademicYearOptions, getActiveSemester, getStudentSemesterOptions } from "../../admin/academic/semesterOptions"

interface StudentProfileModalProps {
  studentId: string
  onClose?: () => void
  isInline?: boolean
  canEdit?: boolean
}

export default function StudentProfileModal({ studentId, onClose, isInline = false, canEdit = false }: StudentProfileModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [profile, setProfile] = useState<User | null>(null)
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [semesters, setSemesters] = useState<AcademicSemester[]>([])
  const [userForm, setUserForm] = useState({
    identifier: "",
    fullname: "",
    email: "",
    angkatan: "",
    semester: "",
    status: "Aktif" as "Aktif" | "Nonaktif"
  })

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true)
      setError("")
      try {
        const data = await getUserById(studentId)
        setProfile(data)
      } catch (err) {
        console.error("Gagal memuat profil:", err)
        setError("Gagal memuat data profil.")
      } finally {
        setLoading(false)
      }
    }

    if (studentId) {
      fetchProfile()
    }
  }, [studentId])

  useEffect(() => {
    if (isEditing && semesters.length === 0) {
      getAdminSemesters()
        .then(setSemesters)
        .catch((err) => console.error("Gagal mengambil data semester:", err))
    }
  }, [isEditing, semesters.length])

  const handleStartEdit = () => {
    if (!profile) return
    const isStudent = profile.role === "MAHASISWA"
    setUserForm({
      identifier: isStudent ? profile.studentProfile?.nim || "" : profile.lecturerProfile?.nip || "",
      fullname: profile.fullname,
      email: profile.email,
      angkatan: isStudent ? String(profile.studentProfile?.angkatan || "") : "",
      semester: isStudent ? String(profile.studentProfile?.semester || "") : "",
      status: (profile.studentProfile?.status || (profile.isActive ? "Aktif" : "Nonaktif")) as "Aktif" | "Nonaktif"
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setError("")
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSubmitting(true)
    setError("")
    try {
      const isStudent = profile.role === "MAHASISWA"
      const updated = await updateAdminUser(profile.id, isStudent ? {
        nim: userForm.identifier,
        fullname: userForm.fullname,
        email: userForm.email,
        angkatan: Number(userForm.angkatan || 0),
        semester: Number(userForm.semester || 0),
        status: userForm.status,
      } : {
        nip: userForm.identifier,
        fullname: userForm.fullname,
        email: userForm.email,
        status: userForm.status,
      })

      setProfile((prev) => {
        if (!prev) return null
        return {
          ...prev,
          fullname: updated.fullname,
          email: updated.email,
          isActive: updated.status === "Aktif",
          studentProfile: isStudent ? {
            ...prev.studentProfile!,
            nim: (updated as AdminStudent).nim,
            angkatan: (updated as AdminStudent).angkatan,
            semester: (updated as AdminStudent).semester,
            status: updated.status,
          } : prev.studentProfile,
          lecturerProfile: !isStudent ? {
            ...prev.lecturerProfile!,
            nip: (updated as AdminLecturer).nip,
          } : prev.lecturerProfile
        }
      })
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui profil")
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate dropdown options for student edit fields
  const activeSemester = getActiveSemester(semesters)
  const studentSemesterOptions = getStudentSemesterOptions(activeSemester?.term)
  const academicYearOptions = getAcademicYearOptions(semesters)
  const fallbackAcademicYears = Array.from({ length: 3 }, (_, index) => new Date().getFullYear() - index)
  
  const userAcademicYearOptions = Array.from(
    new Set([
      ...(academicYearOptions.length ? academicYearOptions : fallbackAcademicYears),
      ...(userForm.angkatan ? [Number(userForm.angkatan)] : []),
    ]),
  )
    .filter((option) => Number.isFinite(option) && option > 0)
    .sort((a, b) => b - a)

  const userSemesterOptions = Array.from(
    new Set([
      ...studentSemesterOptions,
      ...(userForm.semester ? [Number(userForm.semester)] : []),
    ]),
  )
    .filter((option) => Number.isFinite(option) && option > 0)
    .sort((a, b) => a - b)

  const isStudent = profile?.role === "MAHASISWA"

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <Loader2 className="animate-spin text-blue-700" size={32} />
          <span className="text-sm text-gray-500">Memuat profil...</span>
        </div>
      )
    }

    if (error && !isEditing) {
      return <p className="text-center text-sm text-red-500 py-6">{error}</p>
    }

    if (!profile) return null

    return (
      <form onSubmit={handleSaveEdit} className="space-y-6">
        {/* Header/Avatar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullname}
                className="h-16 w-16 rounded-full object-cover border-2 border-blue-100 shadow-sm"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xl">
                {profile.fullname.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    className={`${inputClass} font-bold text-lg h-9 w-64`}
                    value={userForm.fullname}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, fullname: e.target.value }))}
                    placeholder="Nama Lengkap"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase">{isStudent ? "NIM:" : "NIP:"}</span>
                    <input
                      type="text"
                      required
                      className={`${inputClass} text-xs h-7 w-40`}
                      value={userForm.identifier}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, identifier: e.target.value }))}
                      placeholder={isStudent ? "NIM" : "NIP"}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-gray-900">{profile.fullname}</h3>
                  <p className="text-sm font-semibold text-gray-500">
                    {isStudent ? profile.studentProfile?.nim : profile.lecturerProfile?.nip || "-"}
                  </p>
                </>
              )}

              <div className="mt-2">
                {isEditing ? (
                  <select
                    className={`${inputClass} text-xs h-8 px-2 py-1 rounded`}
                    value={userForm.status}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, status: e.target.value as "Aktif" | "Nonaktif" }))}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    profile.isActive ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {profile.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md hover:bg-gray-50 transition"
                  >
                    <X size={14} />
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:bg-blue-400 transition"
                  >
                    <Check size={14} />
                    {submitting ? "Simpan..." : "Simpan"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition"
                >
                  <Pencil size={14} />
                  Edit Profil
                </button>
              )}
            </div>
          )}
        </div>

        {error && isEditing && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Academic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex items-start gap-2.5">
            <GraduationCap className="text-blue-600 mt-0.5 shrink-0" size={18} />
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Program Studi</span>
              <span className="text-sm font-semibold text-gray-800">
                {isStudent ? profile.studentProfile?.programStudi : profile.lecturerProfile?.programStudi || "Teknik Informatika"}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <BookOpen className="text-blue-600 mt-0.5 shrink-0" size={18} />
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jurusan</span>
              <span className="text-sm font-semibold text-gray-800">
                {isStudent ? profile.studentProfile?.jurusan : profile.lecturerProfile?.jurusan || "Teknologi Informasi"}
              </span>
            </div>
          </div>
          {isStudent && (
            <>
              <div className="flex items-start gap-2.5">
                <Calendar className="text-blue-600 mt-0.5 shrink-0" size={18} />
                <div className="w-full">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Angkatan</span>
                  {isEditing ? (
                    <select
                      className={`${inputClass} text-sm mt-1 h-9 w-full max-w-[200px]`}
                      value={userForm.angkatan}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, angkatan: e.target.value }))}
                      required
                    >
                      <option value="" disabled>Pilih angkatan</option>
                      {userAcademicYearOptions.map((year) => (
                        <option key={year}>{year}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm font-semibold text-gray-800">Tahun {profile.studentProfile?.angkatan || "-"}</span>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <UserIcon className="text-blue-600 mt-0.5 shrink-0" size={18} />
                <div className="w-full">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Semester Saat Ini</span>
                  {isEditing ? (
                    <select
                      className={`${inputClass} text-sm mt-1 h-9 w-full max-w-[200px]`}
                      value={userForm.semester}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, semester: e.target.value }))}
                      required
                    >
                      <option value="" disabled>Pilih semester</option>
                      {userSemesterOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm font-semibold text-gray-800">Semester {profile.studentProfile?.semester || "-"}</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Personal Info */}
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kontak & Data Pribadi</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex items-start gap-2.5">
              <Mail className="text-slate-500 mt-0.5 shrink-0" size={16} />
              <div className="w-full">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</span>
                {isEditing ? (
                  <input
                    type="email"
                    required
                    className={`${inputClass} text-sm mt-1 h-9 w-full max-w-[320px]`}
                    value={userForm.email}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                ) : (
                  <span className="text-sm text-gray-700 select-all">{profile.email}</span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Phone className="text-slate-500 mt-0.5 shrink-0" size={16} />
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">No. Telepon</span>
                <span className="text-sm text-gray-700">{profile.personalData?.no_telepon || "-"}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="text-slate-500 mt-0.5 shrink-0" size={16} />
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tempat, Tanggal Lahir</span>
                <span className="text-sm text-gray-700">
                  {[profile.personalData?.tempat_lahir, profile.personalData?.tanggal_lahir].filter(Boolean).join(", ") || "-"}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="text-slate-500 mt-0.5 shrink-0" size={16} />
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kota Tinggal</span>
                <span className="text-sm text-gray-700">{profile.personalData?.kota || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    )
  }

  if (isInline) {
    return (
      <div className="bg-white">
        {renderContent()}
      </div>
    )
  }

  return (
    <LecturerModal
      title="Profil Mahasiswa"
      onClose={onClose || (() => {})}
      footer={
        <LecturerButton variant="secondary" onClick={onClose}>
          Tutup
        </LecturerButton>
      }
    >
      {renderContent()}
    </LecturerModal>
  )
}
