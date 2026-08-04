import { Card } from '@/components/ui/Card'
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge'
import { WorkOrderFinancial } from './WorkOrderFinancial'
import { WorkOrderActions } from './WorkOrderActions'

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
           <WorkOrderActions
  order={order}
  profile={profile}
  onConfirm={onConfirm}
  onStart={onStart}
  onFinish={onFinish}
/>

         <WorkOrderFinancial
  montoAnticipo={Number(data.montoAnticipo || 0)}
  saldoPendiente={Number(data.saldoPendiente || 0)}
/>

          <p className="mt-4 text-xs text-gray-400">
            Vista para: {profile?.role || 'sin perfil'}
          </p>
        </div>
      </div>
    </Card>
  )
}
