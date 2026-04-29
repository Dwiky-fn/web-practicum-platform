import { useUser } from "../../../../../../../services/user/useUser"
import type { Jobsheet } from "../../../../../../../services/jobsheet/types"

interface Props {
  jobsheet: Jobsheet
}

export default function StudentIdentityCard({ jobsheet }: Props) {
  const userId = "1" // sementara
  const { user, loading } = useUser(userId)

  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="bg-white border rounded-xl overflow-hidden">

      <div className="bg-gray-100 px-6 py-3 border-b font-semibold text-gray-800">
        Identitas Mahasiswa
      </div>

      <div className="px-6 py-4 text-sm space-y-3">

        <div className="flex">
          <span className="w-32 text-gray-500">Nama</span>
          <span className="text-gray-800 font-medium">
            : {loading ? "Loading..." : user?.full_name || "-"}
          </span>
        </div>

        <div className="flex">
          <span className="w-32 text-gray-500">NIM</span>
          <span className="text-gray-800 font-medium">
            : {loading ? "Loading..." : user?.nim || "-"}
          </span>
        </div>

        <div className="flex">
          <span className="w-32 text-gray-500">Jobsheet</span>
          <span className="text-gray-800 font-medium">
            : {jobsheet.title}
          </span>
        </div>

        <div className="flex">
          <span className="w-32 text-gray-500">Tanggal</span>
          <span className="text-gray-800 font-medium">
            : {today}
          </span>
        </div>

      </div>
    </div>
  )
}