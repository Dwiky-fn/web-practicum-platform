/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, type FormEvent } from "react";
import type { PersonalData } from "../../../services/user/types";
import { formatDateOnlyForInput } from "../../../shared/utils/dateOnly";
import { IdCard, Save } from "lucide-react";

interface Props {
  data: PersonalData;
  saving?: boolean;
  onSave: (data: PersonalData) => Promise<void>;
}

export default function PersonalDataSection({
  data,
  saving = false,
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
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
      <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-6 flex items-center gap-2">
        <IdCard size={18} className="text-blue-700" /> Informasi Data Pribadi
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
            Nomor Telepon
          </label>
          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
            value={form.no_telepon}
            onChange={(event) => handleChange("no_telepon", event.target.value.replace(/\D/g, ""))}
            placeholder="08xxxxxxxxxx"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
            Tempat Lahir
          </label>
          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
            value={form.tempat_lahir}
            onChange={(event) => handleChange("tempat_lahir", event.target.value)}
            placeholder="Kota Tempat Lahir"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
            Tanggal Lahir
          </label>
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
            value={form.tanggal_lahir}
            onChange={(event) => handleChange("tanggal_lahir", event.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
            Kota Domisili
          </label>
          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
            value={form.kota}
            onChange={(event) => handleChange("kota", event.target.value)}
            placeholder="Kota Tempat Tinggal"
          />
        </div>
      </div>

      <div className="mt-8 border-t border-gray-100 pt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            setForm({
              ...data,
              tanggal_lahir: formatDateOnlyForInput(data.tanggal_lahir),
            })
          }
          className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Reset Perubahan
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-800 transition-colors disabled:opacity-50"
        >
          <Save size={15} />
          <span>{saving ? "Menyimpan..." : "Simpan Data Pribadi"}</span>
        </button>
      </div>
    </form>
  );
}
