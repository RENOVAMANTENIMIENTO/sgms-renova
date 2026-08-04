'use client'

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type UserRole = 'supervisor' | 'vendedor' | 'contratista'

type Profile = {
  full_name: string
  role: UserRole
}

type WorkOrderStatus =
  | 'emitida'
  | 'confirmada'
  | 'en_proceso'
  | 'pendiente_entrega'
  | 'pausada'
  | 'terminada'
  | 'cancelada'

type WorkOrderData = {
  folioOrden: string
  servicioId: string
  folioServicio: string
  cotizacionOficialId: string
  folioCotizacionOficial: string

  clienteNombre: string
  telefono: string
  whatsapp: string
  direccion: string
  ubicacion: string

  tipoServicio: string
  descripcionTrabajo: string
  alcanceAutorizado: string
  materialesAutorizados: string

  contratistaId: string
  contratistaNombre: string

  fechaInicio: string
  fechaTerminoEstimada: string
  fechaInicioReal?: string
  fechaFinalizacionReal?: string

  montoAnticipo: number
  saldoPendiente: number

  estadoOrden: WorkOrderStatus

  entregaRegistrada?: boolean
  entregaId?: string
}

type WorkOrderRecord = {
  id: string
  data: WorkOrderData
  assigned_to: string | null
  created_at: string
}

type ServiceData = {
  folio: string
  clienteNombre: string
  telefono?: string
  whatsapp?: string
  direccion?: string
  tipoServicio: string
  descripcion: string
  estado: string

  contratista?: string
  contratistaId?: string

  montoAnticipo?: number
  saldoPendiente?: number

  entregaRegistrada?: boolean
  entregaId?: string
}

type ServiceRecord = {
  id: string
  data: ServiceData
  assigned_to: string | null
  created_at: string
}

type ClientSatisfaction =
  | 'satisfecho'
  | 'satisfecho_con_observaciones'
  | 'no_satisfecho'

type DeliveryData = {
  tipoRegistro: 'entrega_servicio'

  folioEntrega: string

  ordenTrabajoId: string
  folioOrden: string

  servicioId: string
  folioServicio: string

  clienteNombre: string
  telefono: string
  direccion: string
  tipoServicio: string

  contratistaId: string
  contratistaNombre: string

  fechaEntrega: string
  horaEntrega: string
  recibidoPor: string
  relacionConCliente: string

  satisfaccionCliente: ClientSatisfaction
  trabajoConforme: boolean
  areaLimpia: boolean
  materialesRetirados: boolean
  funcionamientoExplicado: boolean
  garantiaExplicada: boolean
  saldoInformado: boolean

  observacionesCliente: string
  observacionesSupervisor: string
  pendientesDetectados: string

  evidenciaAntesUrl: string
  evidenciaDuranteUrl: string
  evidenciaFinalUrl: string
  firmaClienteUrl: string

  montoAnticipo: number
  saldoPendiente: number

  entregadoPor: string
  estadoEntrega: 'entregada'
  fechaRegistro: string
}

type DeliveryRecord = {
  id: string
  data: DeliveryData
  created_at: string
}

function currentDate() {
  return new Date().toISOString().slice(0, 10)
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5)
}

export default function EntregaPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState('')

  const [orders, setOrders] = useState<WorkOrderRecord[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([])

  const [orderId, setOrderId] = useState('')

  const [fechaEntrega, setFechaEntrega] = useState(currentDate())
  const [horaEntrega, setHoraEntrega] = useState(currentTime())
  const [recibidoPor, setRecibidoPor] = useState('')
  const [relacionConCliente, setRelacionConCliente] =
    useState('Cliente titular')

  const [satisfaccionCliente, setSatisfaccionCliente] =
    useState<ClientSatisfaction>('satisfecho')

  const [trabajoConforme, setTrabajoConforme] = useState(true)
  const [areaLimpia, setAreaLimpia] = useState(true)
  const [materialesRetirados, setMaterialesRetirados] =
    useState(true)
  const [funcionamientoExplicado, setFuncionamientoExplicado] =
    useState(true)
  const [garantiaExplicada, setGarantiaExplicada] =
    useState(true)
  const [saldoInformado, setSaldoInformado] = useState(true)

  const [observacionesCliente, setObservacionesCliente] =
    useState('')
  const [observacionesSupervisor, setObservacionesSupervisor] =
    useState('')
  const [pendientesDetectados, setPendientesDetectados] =
    useState('')

  const [evidenciaAntesUrl, setEvidenciaAntesUrl] = useState('')
  const [evidenciaDuranteUrl, setEvidenciaDuranteUrl] =
    useState('')
  const [evidenciaFinalUrl, setEvidenciaFinalUrl] = useState('')
  const [firmaClienteUrl, setFirmaClienteUrl] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.replace('/login')
      return
    }

    setUserId(user.id)

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profileData) {
      setMessage('No fue posible cargar el perfil del usuario.')
      setLoading(false)
      return
    }

    setProfile(profileData as Profile)

    if (profileData.role === 'contratista') {
      window.location.replace('/orden-trabajo')
      return
    }

    const { data: orderData, error: orderError } = await supabase
      .from('sgms_records')
      .select('id, data, assigned_to, created_at')
      .eq('module', 'ordenes_trabajo')
      .order('created_at', { ascending: false })

    if (orderError) {
      setMessage(
        `No fue posible cargar las órdenes: ${orderError.message}`,
      )
    } else {
      setOrders((orderData || []) as WorkOrderRecord[])
    }

    const { data: serviceData, error: serviceError } = await supabase
      .from('sgms_records')
      .select('id, data, assigned_to, created_at')
      .eq('module', 'servicios')
      .order('created_at', { ascending: false })

    if (serviceError) {
      setMessage(
        `No fue posible cargar los servicios: ${serviceError.message}`,
      )
    } else {
      setServices((serviceData || []) as ServiceRecord[])
    }

    const { data: deliveryData, error: deliveryError } =
      await supabase
        .from('sgms_records')
        .select('id, data, created_at')
        .eq('module', 'entregas')
        .order('created_at', { ascending: false })

    if (deliveryError) {
      setMessage(
        `No fue posible cargar las entregas: ${deliveryError.message}`,
      )
    } else {
      setDeliveries((deliveryData || []) as DeliveryRecord[])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const ordersAlreadyDelivered = useMemo(() => {
    return new Set(
      deliveries.map((delivery) => delivery.data.ordenTrabajoId),
    )
  }, [deliveries])

  const availableOrders = orders.filter((order) => {
    const isReady =
      order.data.estadoOrden === 'pendiente_entrega'

    const isNotDelivered =
      order.data.entregaRegistrada !== true &&
      !ordersAlreadyDelivered.has(order.id)

    return isReady && isNotDelivered
  })

  const selectedOrder = orders.find(
    (order) => order.id === orderId,
  )

  const selectedService = services.find(
    (service) =>
      service.id === selectedOrder?.data.servicioId,
  )

  useEffect(() => {
    if (!selectedOrder) {
      setRecibidoPor('')
      return
    }

    setRecibidoPor(selectedOrder.data.clienteNombre || '')
  }, [selectedOrder])

  function generateDeliveryFolio() {
    const year = new Date().getFullYear()
    const reference = Date.now().toString().slice(-6)

    return `REN-ENT-${year}-${reference}`
  }

  function resetForm() {
    setOrderId('')
    setFechaEntrega(currentDate())
    setHoraEntrega(currentTime())
    setRecibidoPor('')
    setRelacionConCliente('Cliente titular')
    setSatisfaccionCliente('satisfecho')

    setTrabajoConforme(true)
    setAreaLimpia(true)
    setMaterialesRetirados(true)
    setFuncionamientoExplicado(true)
    setGarantiaExplicada(true)
    setSaldoInformado(true)

    setObservacionesCliente('')
    setObservacionesSupervisor('')
    setPendientesDetectados('')

    setEvidenciaAntesUrl('')
    setEvidenciaDuranteUrl('')
    setEvidenciaFinalUrl('')
    setFirmaClienteUrl('')
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    if (!profile || !userId) {
      setMessage('No fue posible identificar al usuario.')
      setSaving(false)
      return
    }

    if (!selectedOrder || !selectedService) {
      setMessage(
        'Selecciona una orden pendiente de entrega válida.',
      )
      setSaving(false)
      return
    }

    if (!recibidoPor.trim()) {
      setMessage(
        'Captura el nombre de la persona que recibe el servicio.',
      )
      setSaving(false)
      return
    }

    if (
      satisfaccionCliente === 'no_satisfecho' &&
      !observacionesCliente.trim()
    ) {
      setMessage(
        'Captura las observaciones del cliente antes de cerrar la entrega.',
      )
      setSaving(false)
      return
    }

    const delivery: DeliveryData = {
      tipoRegistro: 'entrega_servicio',

      folioEntrega: generateDeliveryFolio(),

      ordenTrabajoId: selectedOrder.id,
      folioOrden: selectedOrder.data.folioOrden,

      servicioId: selectedService.id,
      folioServicio: selectedService.data.folio,

      clienteNombre: selectedOrder.data.clienteNombre,
      telefono: selectedOrder.data.telefono || '',
      direccion: selectedOrder.data.direccion || '',
      tipoServicio: selectedOrder.data.tipoServicio,

      contratistaId: selectedOrder.data.contratistaId,
      contratistaNombre:
        selectedOrder.data.contratistaNombre,

      fechaEntrega,
      horaEntrega,
      recibidoPor: recibidoPor.trim(),
      relacionConCliente,

      satisfaccionCliente,
      trabajoConforme,
      areaLimpia,
      materialesRetirados,
      funcionamientoExplicado,
      garantiaExplicada,
      saldoInformado,

      observacionesCliente,
      observacionesSupervisor,
      pendientesDetectados,

      evidenciaAntesUrl,
      evidenciaDuranteUrl,
      evidenciaFinalUrl,
      firmaClienteUrl,

      montoAnticipo: Number(
        selectedOrder.data.montoAnticipo || 0,
      ),
      saldoPendiente: Number(
        selectedOrder.data.saldoPendiente || 0,
      ),

      entregadoPor: profile.full_name,
      estadoEntrega: 'entregada',
      fechaRegistro: new Date().toISOString(),
    }

    const { data: insertedDelivery, error: deliveryError } =
      await supabase
        .from('sgms_records')
        .insert({
          module: 'entregas',
          data: delivery,
          created_by: userId,
          assigned_to: selectedOrder.assigned_to,
        })
        .select('id')
        .single()

    if (deliveryError || !insertedDelivery) {
      setMessage(
        `No se pudo registrar la entrega: ${
          deliveryError?.message ||
          'No se recibió el registro creado'
        }`,
      )
      setSaving(false)
      return
    }

    const { error: orderError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedOrder.data,
          estadoOrden: 'terminada',
          entregaRegistrada: true,
          entregaId: insertedDelivery.id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedOrder.id)

    const { error: serviceError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedService.data,
          estado: 'entregado',
          entregaRegistrada: true,
          entregaId: insertedDelivery.id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedService.id)

    if (orderError || serviceError) {
      setMessage(
        'La entrega se registró, pero faltó actualizar parte del flujo.',
      )
    } else {
      setMessage(
        'Servicio entregado correctamente. Ya puede pasar a liberación de pago.',
      )
      resetForm()
      await loadData()
    }

    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  function money(value: number) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value || 0)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F3D36]">
        <p className="text-white">
          Cargando entregas...
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#1B1F1E]">
      <header className="bg-[#0F3D36] px-5 py-5 text-white md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">
              SGMS DIGITAL
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              Entrega del Servicio
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push('/orden-trabajo')}
              className="rounded-xl border border-white/30 px-4 py-2 text-sm"
            >
              Órdenes
            </button>

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-white/30 px-4 py-2 text-sm"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:px-10 xl:grid-cols-[460px_1fr]">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Registrar entrega
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Cierra una orden terminada por el contratista.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-6"
          >
            <Section title="Orden pendiente">
              <SelectField
                label="Orden de trabajo *"
                value={orderId}
                onChange={setOrderId}
                required
              >
                <option value="">
                  Seleccionar orden
                </option>

                {availableOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.data.folioOrden} —{' '}
                    {order.data.clienteNombre}
                  </option>
                ))}
              </SelectField>

              {availableOrders.length === 0 && (
                <p className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                  No hay órdenes pendientes de entrega.
                </p>
              )}

              {selectedOrder && (
                <div className="rounded-xl bg-[#F7F7F5] p-4 text-sm">
                  <p>
                    <strong>Cliente:</strong>{' '}
                    {selectedOrder.data.clienteNombre}
                  </p>

                  <p className="mt-1">
                    <strong>Servicio:</strong>{' '}
                    {selectedOrder.data.tipoServicio}
                  </p>

                  <p className="mt-1">
                    <strong>Contratista:</strong>{' '}
                    {selectedOrder.data.contratistaNombre}
                  </p>

                  <p className="mt-1">
                    <strong>Dirección:</strong>{' '}
                    {selectedOrder.data.direccion}
                  </p>
                </div>
              )}
            </Section>

            <Section title="Datos de recepción">
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Fecha de entrega *"
                  type="date"
                  value={fechaEntrega}
                  onChange={setFechaEntrega}
                />

                <InputField
                  label="Hora *"
                  type="time"
                  value={horaEntrega}
                  onChange={setHoraEntrega}
                />
              </div>

              <InputField
                label="Nombre de quien recibe *"
                value={recibidoPor}
                onChange={setRecibidoPor}
              />

              <SelectField
                label="Relación con el cliente"
                value={relacionConCliente}
                onChange={setRelacionConCliente}
              >
                <option value="Cliente titular">
                  Cliente titular
                </option>
                <option value="Familiar">Familiar</option>
                <option value="Empleado">Empleado</option>
                <option value="Encargado">Encargado</option>
                <option value="Otro">Otro</option>
              </SelectField>

              <SelectField
                label="Satisfacción del cliente"
                value={satisfaccionCliente}
                onChange={(value) =>
                  setSatisfaccionCliente(
                    value as ClientSatisfaction,
                  )
                }
              >
                <option value="satisfecho">
                  Satisfecho
                </option>

                <option value="satisfecho_con_observaciones">
                  Satisfecho con observaciones
                </option>

                <option value="no_satisfecho">
                  No satisfecho
                </option>
              </SelectField>
            </Section>

            <Section title="Checklist de entrega">
              <Checkbox
                label="El trabajo corresponde al alcance autorizado"
                checked={trabajoConforme}
                onChange={setTrabajoConforme}
              />

              <Checkbox
                label="El área quedó limpia"
                checked={areaLimpia}
                onChange={setAreaLimpia}
              />

              <Checkbox
                label="Se retiraron sobrantes y residuos"
                checked={materialesRetirados}
                onChange={setMaterialesRetirados}
              />

              <Checkbox
                label="Se explicó el funcionamiento o mantenimiento"
                checked={funcionamientoExplicado}
                onChange={setFuncionamientoExplicado}
              />

              <Checkbox
                label="Se explicaron las condiciones de garantía"
                checked={garantiaExplicada}
                onChange={setGarantiaExplicada}
              />

              <Checkbox
                label="Se informó el saldo pendiente"
                checked={saldoInformado}
                onChange={setSaldoInformado}
              />
            </Section>

            <Section title="Observaciones">
              <TextAreaField
                label="Observaciones del cliente"
                value={observacionesCliente}
                onChange={setObservacionesCliente}
              />

              <TextAreaField
                label="Observaciones del supervisor"
                value={observacionesSupervisor}
                onChange={setObservacionesSupervisor}
              />

              <TextAreaField
                label="Pendientes o correcciones detectadas"
                value={pendientesDetectados}
                onChange={setPendientesDetectados}
              />
            </Section>

            <Section title="Evidencias">
              <InputField
                label="Enlace de evidencia antes"
                value={evidenciaAntesUrl}
                onChange={setEvidenciaAntesUrl}
                placeholder="Opcional por ahora"
              />

              <InputField
                label="Enlace de evidencia durante"
                value={evidenciaDuranteUrl}
                onChange={setEvidenciaDuranteUrl}
                placeholder="Opcional por ahora"
              />

              <InputField
                label="Enlace de evidencia final"
                value={evidenciaFinalUrl}
                onChange={setEvidenciaFinalUrl}
                placeholder="Opcional por ahora"
              />

              <InputField
                label="Enlace de firma del cliente"
                value={firmaClienteUrl}
                onChange={setFirmaClienteUrl}
                placeholder="La firma digital se agregará después"
              />
            </Section>

            {message && (
              <p className="rounded-xl bg-[#F7F7F5] p-3 text-sm">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !orderId}
              className="w-full rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold disabled:opacity-50"
            >
              {saving
                ? 'Registrando entrega...'
                : 'Entregar servicio'}
            </button>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-[#0F3D36] p-6 text-white shadow-sm">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">
              RESUMEN DE ENTREGA
            </p>

            {selectedOrder ? (
              <>
                <h2 className="mt-3 text-xl font-semibold">
                  {selectedOrder.data.folioOrden}
                </h2>

                <p className="mt-2 text-white/80">
                  {selectedOrder.data.clienteNombre}
                </p>

                <div className="mt-6 space-y-3 text-sm">
                  <p>
                    <strong>Servicio:</strong>{' '}
                    {selectedOrder.data.tipoServicio}
                  </p>

                  <p>
                    <strong>Contratista:</strong>{' '}
                    {selectedOrder.data.contratistaNombre}
                  </p>

                  <p>
                    <strong>Inicio:</strong>{' '}
                    {selectedOrder.data.fechaInicio}
                  </p>

                  <p>
                    <strong>Finalización:</strong>{' '}
                    {selectedOrder.data.fechaFinalizacionReal
                      ? new Date(
                          selectedOrder.data
                            .fechaFinalizacionReal,
                        ).toLocaleString('es-MX')
                      : 'Sin fecha registrada'}
                  </p>
                </div>

                <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm">
                  <p className="flex justify-between gap-3">
                    <span>Anticipo</span>
                    <strong>
                      {money(
                        selectedOrder.data.montoAnticipo,
                      )}
                    </strong>
                  </p>

                  <p className="mt-3 flex justify-between gap-3">
                    <span>Saldo pendiente</span>
                    <strong>
                      {money(
                        selectedOrder.data.saldoPendiente,
                      )}
                    </strong>
                  </p>
                </div>

                <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm">
                  <p className="font-semibold text-[#D4AF37]">
                    Alcance autorizado
                  </p>

                  <p className="mt-2 whitespace-pre-wrap">
                    {selectedOrder.data.alcanceAutorizado}
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-5 text-sm text-white/70">
                Selecciona una orden para ver el resumen.
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Entregas registradas
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {deliveries.length} entrega(s)
            </p>

            <div className="mt-5 space-y-4">
              {deliveries.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No hay entregas registradas.
                </p>
              ) : (
                deliveries.map((delivery) => (
                  <article
                    key={delivery.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-[#0F3D36]">
                        {delivery.data.folioEntrega}
                      </p>

                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                        Entregada
                      </span>
                    </div>

                    <p className="mt-2 font-medium">
                      {delivery.data.clienteNombre}
                    </p>

                    <p className="text-sm text-gray-500">
                      {delivery.data.tipoServicio}
                    </p>

                    <div className="mt-3 space-y-1 text-sm">
                      <p>
                        <strong>Recibió:</strong>{' '}
                        {delivery.data.recibidoPor}
                      </p>

                      <p>
                        <strong>Fecha:</strong>{' '}
                        {delivery.data.fechaEntrega}
                      </p>

                      <p>
                        <strong>Satisfacción:</strong>{' '}
                        {delivery.data.satisfaccionCliente.replace(
                          /_/g,
                          ' ',
                        )}
                      </p>

                      <p>
                        <strong>Saldo:</strong>{' '}
                        {money(
                          delivery.data.saldoPendiente,
                        )}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-4 border-b border-gray-200 pb-2 text-lg font-semibold text-[#0F3D36]">
        {title}
      </h3>

      <div className="space-y-4">{children}</div>
    </section>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  required = false,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <select
        value={value}
        required={required}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
      >
        {children}
      </select>
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <textarea
        value={value}
        rows={4}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
      />
    </div>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />

      {label}
    </label>
  )
}
