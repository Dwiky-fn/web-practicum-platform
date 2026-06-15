/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, type FormEvent } from "react";
import type { PersonalData } from "../../../services/user/types";
import { formatDateOnlyForInput } from "../../../shared/utils/dateOnly";

interface Props {
  data: PersonalData;
  saving?: boolean;
  message?: string;
  onSave: (data: PersonalData) => Promise<void>;
}

export default function PersonalDataSection({
  data,
  saving = false,
  message,
  onSave,
}: Props) {
  const [form, setForm] = useState<PersonalData>({
    ...data,
    tanggal_lahir: formatDateOnlyForInput(data.tanggal_lahir),
  });

  useEffect(() => {
    setForm({
      ...data,
      tanggal_lahir: formatDateOnlyForInput(data.tanggal_lahir),
    });
  }, [data]);

  const handleChange = (name: keyof PersonalData, value: string) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8">
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
            value={form.no_telepon}
            onChange={(event) => handleChange("no_telepon", event.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tempat Lahir
          </label>
          <input
            className="w-full border rounded-lg px-4 py-2"
            value={form.tempat_lahir}
            onChange={(event) => handleChange("tempat_lahir", event.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Lahir
          </label>
          <input
            type="date"
            className="w-full border rounded-lg px-4 py-2"
            value={form.tanggal_lahir}
            onChange={(event) => handleChange("tanggal_lahir", event.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kota
          </label>
          <input
            className="w-full border rounded-lg px-4 py-2"
            value={form.kota}
            onChange={(event) => handleChange("kota", event.target.value)}
          />
        </div>

      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              setForm({
                ...data,
                tanggal_lahir: formatDateOnlyForInput(data.tanggal_lahir),
              })
            }
            className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {saving ? "Menyimpan..." : "Simpan Data"}
          </button>
        </div>
      </div>
    </form>
  )
}
