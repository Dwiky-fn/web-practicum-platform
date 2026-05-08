interface Props {
  data: {
    phone: string;
    birthPlace: string;
    birthDate: string;
    gender: string;
    city: string;
  };
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
            value={data.phone}
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tempat Lahir
          </label>
          <input
            className="w-full border rounded-lg px-4 py-2"
            value={data.birthPlace}
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Lahir
          </label>
          <input
            className="w-full border rounded-lg px-4 py-2"
            value={data.birthDate}
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kota
          </label>
          <input
            className="w-full border rounded-lg px-4 py-2"
            value={data.city}
            readOnly
          />
        </div>

      </div>

    </div>
  )
}