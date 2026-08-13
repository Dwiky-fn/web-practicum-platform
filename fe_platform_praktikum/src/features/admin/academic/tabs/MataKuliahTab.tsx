import { AdminActionCell, AdminButton, AdminTable, EmptyState } from "../../components/AdminUI"
import type { MataKuliah } from "../../../../services/admin/academicData/service"
import type { AcademicItem, NativeTab } from "../types"

interface MataKuliahTabProps {
  data: MataKuliah[]
  page: number
  limit: number
  submitting: boolean
  onOpenModal: (tab: NativeTab, item?: AcademicItem) => void
  onSetDeleteTarget: (target: { tab: NativeTab; id: string; label: string }) => void
}

export default function MataKuliahTab({
  data,
  page,
  limit,
  submitting,
  onOpenModal,
  onSetDeleteTarget,
}: MataKuliahTabProps) {
  if (!data.length) {
    return <EmptyState title="Belum ada data Mata Kuliah." />
  }

  const displayedData = data.slice((page - 1) * limit, page * limit)

  return (
    <AdminTable
      variant="full"
      headers={[
        { text: "Kode MK", align: "left" },
        { text: "Nama Mata Kuliah", align: "left" },
        { text: "Kurikulum", align: "left" },
        { text: "Semester", align: "center" },
        { text: "SKS", align: "center" },
        { text: "Tipe", align: "center" },
        { text: "Aksi", align: "right" },
      ]}
    >
      {displayedData.map((i) => (
        <tr key={i.id} className="hover:bg-blue-50/20 transition-colors">
          <td className="px-4 py-3 font-mono text-left font-semibold text-blue-700">{i.kode_mk}</td>
          <td className="px-4 py-3 font-semibold text-left text-gray-900">{i.nama_mk}</td>
          <td className="px-4 py-3 text-left text-gray-600 font-medium">{i.nama_kurikulum ?? "-"}</td>
          <td className="px-4 py-3 text-center text-gray-700 font-medium">{i.semester ? `Semester ${i.semester}` : "-"}</td>
          <td className="px-4 py-3 text-center font-mono font-semibold text-gray-800">{i.sks} SKS</td>
          <td className="px-4 py-3 text-center">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10 capitalize">
              {i.tipe}
            </span>
          </td>
          <AdminActionCell>
            <AdminButton variant="ghost" className="h-8 px-2" onClick={() => onOpenModal("mata-kuliah", i)}>
              Edit
            </AdminButton>
            <AdminButton
              variant="danger"
              className="h-8 px-2"
              disabled={submitting}
              onClick={() => onSetDeleteTarget({ tab: "mata-kuliah", id: i.id, label: `${i.kode_mk} - ${i.nama_mk}` })}
            >
              Hapus
            </AdminButton>
          </AdminActionCell>
        </tr>
      ))}
    </AdminTable>
  )
}
