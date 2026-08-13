import { AdminActionCell, AdminButton, AdminTable, EmptyState } from "../../components/AdminUI"
import type { TahunSemester } from "../../../../services/admin/academicData/service"
import type { AcademicItem, NativeTab } from "../types"

interface TahunSemesterTabProps {
  data: TahunSemester[]
  page: number
  limit: number
  submitting: boolean
  statusBadgeIndo: (status?: string) => React.ReactNode
  onSetActivateTarget: (target: { tab: NativeTab; id: string; label: string }) => void
  onOpenModal: (tab: NativeTab, item?: AcademicItem) => void
  onSetDeleteTarget: (target: { tab: NativeTab; id: string; label: string }) => void
}

export default function TahunSemesterTab({
  data,
  page,
  limit,
  submitting,
  statusBadgeIndo,
  onSetActivateTarget,
  onOpenModal,
  onSetDeleteTarget,
}: TahunSemesterTabProps) {
  if (!data.length) {
    return <EmptyState title="Belum ada data Tahun Semester." />
  }

  const displayedData = data.slice((page - 1) * limit, page * limit)

  return (
    <AdminTable
      variant="medium"
      headers={[
        { text: "Tahun Semester", align: "left" },
        { text: "Status Semester", align: "center" },
        { text: "Aksi", align: "right" },
      ]}
    >
      {displayedData.map((i) => (
        <tr key={i.id} className="hover:bg-blue-50/20 transition-colors">
          <td className="px-4 py-3 font-semibold text-left text-gray-900">{i.tahun_semester}</td>
          <td className="px-4 py-3 text-center">{statusBadgeIndo(i.status)}</td>
          <AdminActionCell>
            {i.status !== "active" && (
              <AdminButton
                variant="ghost"
                className="h-8 px-2 text-blue-600 hover:text-blue-700 font-semibold"
                disabled={submitting}
                onClick={() => onSetActivateTarget({ tab: "tahun", id: i.id, label: i.tahun_semester })}
              >
                Aktifkan
              </AdminButton>
            )}
            <AdminButton variant="ghost" className="h-8 px-2" onClick={() => onOpenModal("tahun", i)}>
              Edit
            </AdminButton>
            <AdminButton
              variant="danger"
              className="h-8 px-2"
              disabled={submitting}
              onClick={() => onSetDeleteTarget({ tab: "tahun", id: i.id, label: i.tahun_semester })}
            >
              Hapus
            </AdminButton>
          </AdminActionCell>
        </tr>
      ))}
    </AdminTable>
  )
}
