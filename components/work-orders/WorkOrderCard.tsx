import { Card } from '@/components/ui/Card'
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge'
import {
  Profile,
  WorkOrderRecord,
} from '@/types/work-orders'

type WorkOrderCardProps = {
  order: WorkOrderRecord
  profile: Profile | null
  onConfirm: (order: WorkOrderRecord) => void
  onStart: (order: WorkOrderRecord) => void
  onFinish: (order: WorkOrderRecord) => void
}



export function WorkOrderCard({
  order,
  profile,
  onConfirm,
  onStart,
  onFinish,
}: WorkOrderCardProps) {

  const { data } = order

  return (
    <Card className="border border-gray-200">
      <div className="flex flex-col justify-between gap-6 lg:flex-row">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-[#0F3D36]">
              {data.folioOrden}
            </h3>

          <WorkOrderStatusBadge
  status={data.estadoOrden}
/>
          </div>

          <p className="mt-4 text-lg font-semibold">
            {data.clienteNombre}
          </p>

          <p className="text-sm text-gray-500">
            {data.tipoServicio}
          </p>

          <div className="mt-5 grid gap-2 text-sm md:grid-cols-2">
            <p>
              <strong>Servicio:</strong> {data.folioServicio}
            </p>

            <p>
              <strong>Contratista:</strong>{' '}
              {data.contratistaNombre}
            </p>

            <p>
              <strong>Inicio:</strong> {data.fechaInicio} a las{' '}
              {data.horaInicio}
            </p>

            <p>
              <strong>Término estimado:</strong>{' '}
              {data.fechaTerminoEstimada}
            </p>

            <p>
              <strong>Horario:</strong> {data.horarioTrabajo}
            </p>

            <p>
              <strong>Ayudantes:</strong> {data.numeroAyudantes}
            </p>
          </div>

          <p className="mt-3 text-sm">
            <strong>Dirección:</strong> {data.direccion}
          </p>

          <div className="mt-6 rounded-xl bg-[#F7F7F5] p-4">
            <p className="font-semibold text-[#0F3D36]">
              Alcance autorizado
            </p>

            <p className="mt-2 text-sm">
              {data.alcanceAutorizado}
            </p>
          </div>

          <div className="mt-3 rounded-xl bg-[#F7F7F5] p-4">
            <p className="font-semibold text-[#0F3D36]">
              Materiales autorizados
            </p>

            <p className="mt-2 text-sm">
              {data.materialesAutorizados}
            </p>
          </div>
        </div>

        <div className="w-full lg:max-w-xs">
            {data.whatsapp && (
  <a
    href={`https://wa.me/52${data.whatsapp.replace(/\D/g, '')}`}
    target="_blank"
    rel="noreferrer"
    className="mb-3 block rounded-lg bg-[#0F3D36] px-3 py-2 text-center text-sm text-white"
  >
    Contactar cliente
  </a>
)}
{data.ubicacion && (
  <a
    href={data.ubicacion}
    target="_blank"
    rel="noreferrer"
    className="mb-3 block rounded-lg border border-gray-300 px-3 py-2 text-center text-sm"
  >
    Abrir ubicación
  </a>
)}
{profile?.role === 'contratista' &&
  data.estadoOrden === 'emitida' && (
    <button
      type="button"
      onClick={() => onConfirm(order)}
      className="mb-3 w-full rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-semibold"
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
      className="mb-3 w-full rounded-lg border border-[#0F3D36] px-3 py-2 text-sm font-medium text-[#0F3D36]"
    >
      Iniciar trabajo
    </button>
)}
{profile?.role === 'contratista' &&
  data.estadoOrden === 'en_proceso' && (
    <button
      type="button"
      onClick={() => onFinish(order)}
      className="mb-3 w-full rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-semibold text-black"
    >
      Finalizar trabajo
    </button>
)}

          <div className="rounded-xl bg-[#F7F7F5] p-4 text-sm">
            <p className="flex justify-between gap-4">
              <span>Anticipo</span>
              <strong>
                ${Number(data.montoAnticipo || 0).toLocaleString('es-MX')}
              </strong>
            </p>

            <p className="mt-3 flex justify-between gap-4">
              <span>Saldo</span>
              <strong>
                ${Number(data.saldoPendiente || 0).toLocaleString('es-MX')}
              </strong>
            </p>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Vista para: {profile?.role || 'sin perfil'}
          </p>
        </div>
      </div>
    </Card>
  )
}
