import { AdminActionCell, AdminButton, AdminTable, EmptyState } from "../../components/AdminUI"
import type { Kurikulum } from "../../../../services/admin/academicData/service"
import type { AcademicItem, NativeTab } from "../types"

interface KurikulumTabProps {
  data: Kurikulum[]
  page: number
  limit: number
  submitting: boolean
  statusBadgeIndo: (status?: string) => React.ReactNode
  onActivate: (tab: NativeTab, id: string) => void
  onOpenModal: (tab: NativeTab, item?: AcademicItem) => void
  onSetDeleteTarget: (target: { tab: NativeTab; id: string; label: string }) => void
}

export default function KurikulumTab({
  data,
  page,
  limit,
  submitting,
  statusBadgeIndo,
  onActivate,
  onOpenModal,
  onSetDeleteTarget,
}: KurikulumTabProps) {
  if (!data.length) {
    return <EmptyState title="Belum ada data Kurikulum." />
  }

  const displayedData = data.slice((page - 1) * limit, page * limit)

  return (
    <AdminTable
      variant="medium"
      headers={[
        { text: "Tahun Kurikulum", align: "center" },
        { text: "Nama Kurikulum", align: "left" },
        { text: "Status Kurikulum", align: "center" },
        { text: "Aksi", align: "right" },
      ]}
    >
      {displayedData.map((i) => (
        <tr key={i.id} className="hover:bg-blue-50/20 transition-colors">
          <td className="px-4 py-3 text-center text-gray-600 font-medium">{i.tahun_kurikulum}</td>
          <td className="px-4 py-3 font-semibold text-left text-gray-900">{i.nama_kurikulum}</td>
          <td className="px-4 py-3 text-center">{statusBadgeIndo(i.status)}</td>
          <AdminActionCell>
            {i.status !== "active" && (
              <AdminButton
                variant="ghost"
                className="h-8 px-2 text-blue-600 hover:text-blue-700 font-semibold"
                disabled={submitting}
                onClick={() => onActivate("kurikulum", i.id)}
              >
                {submitting ? "Mengaktifkan..." : "Aktifkan"}
              </AdminButton>
            )}
            <AdminButton variant="ghost" className="h-8 px-2" onClick={() => onOpenModal("kurikulum", i)}>
              Edit
            </AdminButton>
            <AdminButton
              variant="danger"
              className="h-8 px-2"
              disabled={submitting}
              onClick={() => onSetDeleteTarget({ tab: "kurikulum", id: i.id, label: i.nama_kurikulum })}
            >
              Hapus
            </AdminButton>
          </AdminActionCell>
        </tr>
      ))}
    </AdminTable>
  )
}
