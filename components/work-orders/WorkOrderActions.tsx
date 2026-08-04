import {
  Profile,
  WorkOrderRecord,
} from '@/types/work-orders'

type WorkOrderActionsProps = {
  order: WorkOrderRecord
  profile: Profile | null
  onConfirm: (order: WorkOrderRecord) => void
  onStart: (order: WorkOrderRecord) => void
  onFinish: (order: WorkOrderRecord) => void
}

export function WorkOrderActions({
  order,
  profile,
  onConfirm,
  onStart,
  onFinish,
}: WorkOrderActionsProps) {
  const { data } = order

  return (
    <div className="space-y-3">
      {data.whatsapp && (
        <a
          href={`https://wa.me/52${data.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg bg-[#0F3D36] px-3 py-2 text-center text-sm text-white"
        >
          Contactar cliente
        </a>
      )}

      {data.ubicacion && (
        <a
          href={data.ubicacion}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg border border-gray-300 px-3 py-2 text-center text-sm"
        >
          Abrir ubicación
        </a>
      )}

      {profile?.role === 'contratista' &&
        data.estadoOrden === 'emitida' && (
          <button
            type="button"
            onClick={() => onConfirm(order)}
            className="w-full rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-semibold"
          >
            Confirmar orden
          </button>
        )}

      {profile?.role === 'contratista' &&
        (data.estadoOrden === 'emitida' ||
          data.estadoOrden === 'confirmada') && (
          <button
            type="button"
            onClick={() => onStart(order)}
            className="w-full rounded-lg border border-[#0F3D36] px-3 py-2 text-sm font-medium text-[#0F3D36]"
          >
            Iniciar trabajo
          </button>
        )}

      {profile?.role === 'contratista' &&
        data.estadoOrden === 'en_proceso' && (
          <button
            type="button"
            onClick={() => onFinish(order)}
            className="w-full rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-semibold text-black"
          >
            Finalizar trabajo
          </button>
        )}
    </div>
  )
}
