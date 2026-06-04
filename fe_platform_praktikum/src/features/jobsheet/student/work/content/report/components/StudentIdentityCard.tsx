import type { Jobsheet } from "../../../../../../../services/jobsheet/types"
import { useCurrentUser } from "../../../../../../../services/user/useCurrentUser"

interface Props {
  jobsheet: Jobsheet
}

export default function StudentIdentityCard({ jobsheet }: Props) {
  const { user, loading } = useCurrentUser()

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
            : {loading ? "Loading..." : user?.fullname || "-"}
          </span>
        </div>

        <div className="flex">
          <span className="w-32 text-gray-500">NIM</span>
          <span className="text-gray-800 font-medium">
            : {loading ? "Loading..." : user?.studentProfile?.nim || "-"}
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
