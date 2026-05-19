import type { PersonalData } from "../../../services/user/types";

interface Props {
  data: PersonalData;
}

export default function PersonalDataSection({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow p-8">
      <h2 className="text-xl font-semibold mb-6">
        Data Pribadi
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nomor Telepon
          </label>
          <input
            className="w-full border rounded-lg px-4 py-2"
            value={data.no_telepon}
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tempat Lahir
          </label>
          <input
            className="w-full border rounded-lg px-4 py-2"
            value={data.tempat_lahir}
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Lahir
          </label>
          <input
            className="w-full border rounded-lg px-4 py-2"
            value={
              data.tanggal_lahir
                ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    .format(new Date(data.tanggal_lahir))
                : ''
            }
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kota
          </label>
          <input
            className="w-full border rounded-lg px-4 py-2"
            value={data.kota}
            readOnly
          />
        </div>

      </div>

    </div>
  )
}