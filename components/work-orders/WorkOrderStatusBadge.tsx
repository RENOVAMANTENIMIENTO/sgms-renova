import { WorkOrderStatus } from '@/types/work-orders'

type WorkOrderStatusBadgeProps = {
  status: WorkOrderStatus
}

const statusLabels: Record<WorkOrderStatus, string> = {
  emitida: 'Orden emitida',
  confirmada: 'Confirmada',
  en_proceso: 'En proceso',
  pendiente_entrega: 'Pendiente de entrega',
  pausada: 'Pausada',
  terminada: 'Terminada',
  cancelada: 'Cancelada',
}

export function WorkOrderStatusBadge({
  status,
}: WorkOrderStatusBadgeProps) {
  return (
    <span className="rounded-full bg-[#F4E6AF] px-3 py-1 text-xs font-medium">
      {statusLabels[status]}
    </span>
  )
}
