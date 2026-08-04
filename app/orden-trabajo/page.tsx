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
import { Card } from '@/components/ui/Card'
import { WorkOrderCard } from '@/components/work-orders/WorkOrderCard'
import { useWorkOrders } from '@/hooks/useWorkOrders'



type UserRole = 'supervisor' | 'vendedor' | 'contratista'

type Profile = {
  full_name: string
  role: UserRole
}

type ServiceData = {
  folio: string
  clienteNombre: string
  telefono?: string
  whatsapp?: string
  direccion?: string
  ubicacion?: string
  tipoServicio: string
  descripcion: string
  estado: string

  contratista?: string
  contratistaId?: string

  anticipoRegistrado?: boolean
  montoAnticipo?: number
  saldoPendiente?: number

  ordenTrabajoGenerada?: boolean
  ordenTrabajoId?: string
}

type ServiceRecord = {
  id: string
  data: ServiceData
  assigned_to: string | null
  created_at: string
}

type OfficialQuoteData = {
  tipoCotizacion: 'oficial'
  servicioId: string
  folioServicio: string
  folioCotizacionOficial: string

  alcanceServicio?: string
  materialesIncluidos?: string
  tiempoEstimado?: string
  garantia?: string

  precioTotal: number
  saldoActual?: number
  estadoCotizacion: string
}

type OfficialQuoteRecord = {
  id: string
  data: OfficialQuoteData
  created_at: string
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
  tipoRegistro: 'orden_trabajo'

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
  numeroAyudantes: number

  fechaInicio: string
  fechaTerminoEstimada: string
  horaInicio: string
  horarioTrabajo: string
  duracionEstimada: string

  instruccionesEspeciales: string
  condicionesAcceso: string
  observaciones: string

  materialCompleto: boolean
  herramientaCompleta: boolean
  equipoSeguridad: boolean
  clienteAvisado: boolean
  anticipoRecibido: boolean
  accesoConfirmado: boolean

  precioTotalServicio: number
  montoAnticipo: number
  saldoPendiente: number

  estadoOrden: WorkOrderStatus
  confirmadaContratista: boolean
  fechaConfirmacion?: string
  fechaInicioReal?: string
  fechaFinalizacionReal?: string


  emitidaPor: string
  fechaEmision: string
}

type WorkOrderRecord = {
  id: string
  data: WorkOrderData
  assigned_to: string | null
  created_at: string
}

type WorkOrderForm = {
  serviceId: string

  fechaInicio: string
  fechaTerminoEstimada: string
  horaInicio: string
  horarioTrabajo: string
  duracionEstimada: string

  alcanceAutorizado: string
  materialesAutorizados: string

  numeroAyudantes: number
  instruccionesEspeciales: string
  condicionesAcceso: string
  observaciones: string

  materialCompleto: boolean
  herramientaCompleta: boolean
  equipoSeguridad: boolean
  clienteAvisado: boolean
  anticipoRecibido: boolean
  accesoConfirmado: boolean
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const emptyForm: WorkOrderForm = {
  serviceId: '',

  fechaInicio: today(),
  fechaTerminoEstimada: '',
  horaInicio: '08:00',
  horarioTrabajo: '08:00 a 18:00',
  duracionEstimada: '',

  alcanceAutorizado: '',
  materialesAutorizados: '',

  numeroAyudantes: 0,
  instruccionesEspeciales: '',
  condicionesAcceso: '',
  observaciones: '',

  materialCompleto: false,
  herramientaCompleta: false,
  equipoSeguridad: false,
  clienteAvisado: false,
  anticipoRecibido: true,
  accesoConfirmado: false,
}

export default function OrdenTrabajoPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState('')
  const {
  confirmOrder: confirmOrderFromHook,
  startWork: startWorkFromHook,
  finishWork: finishWorkFromHook,
} = useWorkOrders({
  profile,
  userId,
})

  const [services, setServices] = useState<ServiceRecord[]>([])
  const [officialQuotes, setOfficialQuotes] = useState<
    OfficialQuoteRecord[]
  >([])
  const [orders, setOrders] = useState<WorkOrderRecord[]>([])

  const [form, setForm] = useState<WorkOrderForm>(emptyForm)

  const [search, setSearch] = useState('')
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

    let serviceQuery = supabase
      .from('sgms_records')
      .select('id, data, assigned_to, created_at')
      .eq('module', 'servicios')
      .order('created_at', { ascending: false })

    if (profileData.role === 'contratista') {
      serviceQuery = serviceQuery.eq('assigned_to', user.id)
    }

    const { data: serviceData, error: serviceError } =
      await serviceQuery

    if (serviceError) {
      setMessage(
        `No fue posible cargar los servicios: ${serviceError.message}`,
      )
    } else {
      setServices((serviceData || []) as ServiceRecord[])
    }

    const { data: quoteData, error: quoteError } = await supabase
      .from('sgms_records')
      .select('id, data, created_at')
      .eq('module', 'cotizaciones')
      .order('created_at', { ascending: false })

    if (quoteError) {
      setMessage(
        `No fue posible cargar cotizaciones: ${quoteError.message}`,
      )
    } else {
      const official = (quoteData || []).filter(
        (record) => record.data?.tipoCotizacion === 'oficial',
      ) as OfficialQuoteRecord[]

      setOfficialQuotes(official)
    }

    let orderQuery = supabase
      .from('sgms_records')
      .select('id, data, assigned_to, created_at')
      .eq('module', 'ordenes_trabajo')
      .order('created_at', { ascending: false })

    if (profileData.role === 'contratista') {
      orderQuery = orderQuery.eq('assigned_to', user.id)
    }

    const { data: orderData, error: orderError } = await orderQuery

    if (orderError) {
      setMessage(
        `No fue posible cargar órdenes: ${orderError.message}`,
      )
    } else {
      setOrders((orderData || []) as WorkOrderRecord[])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const selectedService = services.find(
    (service) => service.id === form.serviceId,
  )

  const selectedQuote = officialQuotes.find(
    (quote) => quote.data.servicioId === form.serviceId,
  )

  const servicesWithOrder = useMemo(() => {
    return new Set(
      orders.map((order) => order.data.servicioId),
    )
  }, [orders])

  const availableServices = services.filter((service) => {
    const ready =
      service.data.estado === 'listo_para_trabajo' ||
      service.data.anticipoRegistrado === true

    const withoutOrder =
      !servicesWithOrder.has(service.id) &&
      service.data.ordenTrabajoGenerada !== true

    return ready && withoutOrder
  })

  useEffect(() => {
    if (!selectedService) return

    const quote = officialQuotes.find(
      (record) => record.data.servicioId === selectedService.id,
    )

    setForm((current) => ({
      ...current,

      alcanceAutorizado:
        quote?.data.alcanceServicio ||
        selectedService.data.descripcion ||
        '',

      materialesAutorizados:
        quote?.data.materialesIncluidos || '',

      duracionEstimada:
        quote?.data.tiempoEstimado || '',

      anticipoRecibido:
        selectedService.data.anticipoRegistrado === true,
    }))
  }, [selectedService, officialQuotes])

  function updateField<K extends keyof WorkOrderForm>(
    field: K,
    value: WorkOrderForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function generateOrderFolio() {
    const year = new Date().getFullYear()
    const reference = Date.now().toString().slice(-6)

    return `REN-OT-${year}-${reference}`
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      fechaInicio: today(),
    })
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

    if (profile.role === 'contratista') {
      setMessage('El contratista no puede emitir órdenes.')
      setSaving(false)
      return
    }

    if (!selectedService) {
      setMessage('Selecciona un servicio listo para trabajar.')
      setSaving(false)
      return
    }

    if (!selectedService.assigned_to) {
      setMessage(
        'Este servicio no tiene un contratista asignado.',
      )
      setSaving(false)
      return
    }

    if (!selectedQuote) {
      setMessage(
        'No se encontró la cotización oficial relacionada.',
      )
      setSaving(false)
      return
    }

    if (!form.fechaInicio || !form.fechaTerminoEstimada) {
      setMessage(
        'Captura la fecha de inicio y la fecha estimada de término.',
      )
      setSaving(false)
      return
    }

    if (
      new Date(form.fechaTerminoEstimada) <
      new Date(form.fechaInicio)
    ) {
      setMessage(
        'La fecha de término no puede ser anterior al inicio.',
      )
      setSaving(false)
      return
    }

    if (!form.alcanceAutorizado.trim()) {
      setMessage('Captura el alcance autorizado.')
      setSaving(false)
      return
    }

    const orderData: WorkOrderData = {
      tipoRegistro: 'orden_trabajo',

      folioOrden: generateOrderFolio(),
      servicioId: selectedService.id,
      folioServicio: selectedService.data.folio,

      cotizacionOficialId: selectedQuote.id,
      folioCotizacionOficial:
        selectedQuote.data.folioCotizacionOficial,

      clienteNombre: selectedService.data.clienteNombre,
      telefono: selectedService.data.telefono || '',
      whatsapp: selectedService.data.whatsapp || '',
      direccion: selectedService.data.direccion || '',
      ubicacion: selectedService.data.ubicacion || '',

      tipoServicio: selectedService.data.tipoServicio,
      descripcionTrabajo: selectedService.data.descripcion,
      alcanceAutorizado: form.alcanceAutorizado,
      materialesAutorizados: form.materialesAutorizados,

      contratistaId: selectedService.assigned_to,
      contratistaNombre:
        selectedService.data.contratista || 'Contratista asignado',

      numeroAyudantes: Number(form.numeroAyudantes),

      fechaInicio: form.fechaInicio,
      fechaTerminoEstimada: form.fechaTerminoEstimada,
      horaInicio: form.horaInicio,
      horarioTrabajo: form.horarioTrabajo,
      duracionEstimada: form.duracionEstimada,

      instruccionesEspeciales: form.instruccionesEspeciales,
      condicionesAcceso: form.condicionesAcceso,
      observaciones: form.observaciones,

      materialCompleto: form.materialCompleto,
      herramientaCompleta: form.herramientaCompleta,
      equipoSeguridad: form.equipoSeguridad,
      clienteAvisado: form.clienteAvisado,
      anticipoRecibido: form.anticipoRecibido,
      accesoConfirmado: form.accesoConfirmado,

      precioTotalServicio: Number(
        selectedQuote.data.precioTotal || 0,
      ),

      montoAnticipo: Number(
        selectedService.data.montoAnticipo || 0,
      ),

      saldoPendiente: Number(
        selectedService.data.saldoPendiente ??
          selectedQuote.data.saldoActual ??
          selectedQuote.data.precioTotal ??
          0,
      ),

      estadoOrden: 'emitida',
      confirmadaContratista: false,

      emitidaPor: profile.full_name,
      fechaEmision: new Date().toISOString(),
    }

    const { data: insertedOrder, error: orderError } =
      await supabase
        .from('sgms_records')
        .insert({
          module: 'ordenes_trabajo',
          data: orderData,
          created_by: userId,
          assigned_to: selectedService.assigned_to,
        })
        .select('id')
        .single()

    if (orderError || !insertedOrder) {
      setMessage(
        `No se pudo generar la orden: ${
          orderError?.message || 'No se recibió el registro'
        }`,
      )
      setSaving(false)
      return
    }

    const { error: serviceError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedService.data,
          estado: 'orden_emitida',
          ordenTrabajoGenerada: true,
          ordenTrabajoId: insertedOrder.id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedService.id)

    if (serviceError) {
      setMessage(
        `La orden fue creada, pero no se actualizó el servicio: ${serviceError.message}`,
      )
    } else {
      setMessage(
        'Orden de trabajo emitida y enviada al contratista.',
      )
      resetForm()
      await loadData()
    }

    setSaving(false)
  }

  async function confirmOrder(order: WorkOrderRecord) {
    if (!profile || profile.role !== 'contratista') return

    const relatedService = services.find(
      (service) => service.id === order.data.servicioId,
    )

    const { error: orderError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...order.data,
          estadoOrden: 'confirmada',
          confirmadaContratista: true,
          fechaConfirmacion: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (orderError) {
      setMessage(
        `No se pudo confirmar la orden: ${orderError.message}`,
      )
      return
    }

    if (relatedService) {
      await supabase
        .from('sgms_records')
        .update({
          data: {
            ...relatedService.data,
            estado: 'orden_confirmada',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', relatedService.id)
    }

    setMessage('Orden confirmada por el contratista.')
    await loadData()
  }

  async function startWork(order: WorkOrderRecord) {
    if (!profile || profile.role !== 'contratista') return

    const relatedService = services.find(
      (service) => service.id === order.data.servicioId,
    )

    const { error: orderError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...order.data,
          estadoOrden: 'en_proceso',
          confirmadaContratista: true,
          fechaConfirmacion:
            order.data.fechaConfirmacion ||
            new Date().toISOString(),
          fechaInicioReal: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (orderError) {
      setMessage(
        `No se pudo iniciar el trabajo: ${orderError.message}`,
      )
      return
    }

    if (relatedService) {
      const { error: serviceError } = await supabase
        .from('sgms_records')
        .update({
          data: {
            ...relatedService.data,
            estado: 'en_proceso',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', relatedService.id)

      if (serviceError) {
        setMessage(
          `La orden inició, pero no se actualizó el servicio: ${serviceError.message}`,
        )
        return
      }
    }

    setMessage('Trabajo iniciado correctamente.')
    await loadData()
  }
  async function finishWork(order: WorkOrderRecord) {
  if (!profile || profile.role !== 'contratista') return

  const confirmed = window.confirm(
    '¿Confirmas que el trabajo fue terminado y está listo para revisión del cliente?'
  )

  if (!confirmed) return

  setMessage('')

  const relatedService = services.find(
    (service) => service.id === order.data.servicioId,
  )

  const { error: orderError } = await supabase
    .from('sgms_records')
    .update({
      data: {
        ...order.data,
        estadoOrden: 'pendiente_entrega',
        fechaFinalizacionReal: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (orderError) {
    setMessage(`No se pudo finalizar: ${orderError.message}`)
    return
  }

  if (relatedService) {
    await supabase
      .from('sgms_records')
      .update({
        data: {
          ...relatedService.data,
          estado: 'pendiente_entrega',
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', relatedService.id)
  }

  setMessage('Trabajo finalizado correctamente.')

  await loadData()
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

  const filteredOrders = orders.filter((order) => {
    const text = [
      order.data.folioOrden,
      order.data.folioServicio,
      order.data.clienteNombre,
      order.data.tipoServicio,
      order.data.contratistaNombre,
      order.data.estadoOrden,
    ]
      .join(' ')
      .toLowerCase()

    return text.includes(search.toLowerCase())
  })

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F3D36]">
        <p className="text-white">
          Cargando órdenes de trabajo...
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
              Órdenes de Trabajo
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push('/anticipos')}
              className="rounded-xl border border-white/30 px-4 py-2 text-sm"
            >
              Anticipos
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

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:px-10 xl:grid-cols-[440px_1fr]">
        {profile?.role !== 'contratista' && (
          <Card>

            <h2 className="text-xl font-semibold">
              Emitir orden
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Selecciona un servicio con anticipo recibido.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-6"
            >
              <Section title="Servicio autorizado">
                <SelectField
                  label="Servicio listo para trabajar *"
                  value={form.serviceId}
                  onChange={(value) =>
                    updateField('serviceId', value)
                  }
                  required
                >
                  <option value="">
                    Seleccionar servicio
                  </option>

                  {availableServices.map((service) => (
                    <option
                      key={service.id}
                      value={service.id}
                    >
                      {service.data.folio} —{' '}
                      {service.data.clienteNombre}
                    </option>
                  ))}
                </SelectField>

                {availableServices.length === 0 && (
                  <p className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                    No hay servicios pendientes de orden.
                  </p>
                )}

                {selectedService && (
                  <div className="rounded-xl bg-[#F7F7F5] p-4 text-sm">
                    <p>
                      <strong>Cliente:</strong>{' '}
                      {selectedService.data.clienteNombre}
                    </p>

                    <p className="mt-1">
                      <strong>Servicio:</strong>{' '}
                      {selectedService.data.tipoServicio}
                    </p>

                    <p className="mt-1">
                      <strong>Contratista:</strong>{' '}
                      {selectedService.data.contratista}
                    </p>

                    <p className="mt-1">
                      <strong>Anticipo:</strong>{' '}
                      {money(
                        selectedService.data.montoAnticipo || 0,
                      )}
                    </p>

                    <p className="mt-1">
                      <strong>Saldo:</strong>{' '}
                      {money(
                        selectedService.data.saldoPendiente || 0,
                      )}
                    </p>
                  </div>
                )}
              </Section>

              <Section title="Programación">
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="Fecha de inicio *"
                    type="date"
                    value={form.fechaInicio}
                    onChange={(value) =>
                      updateField('fechaInicio', value)
                    }
                  />

                  <InputField
                    label="Término estimado *"
                    type="date"
                    value={form.fechaTerminoEstimada}
                    onChange={(value) =>
                      updateField(
                        'fechaTerminoEstimada',
                        value,
                      )
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="Hora de inicio"
                    type="time"
                    value={form.horaInicio}
                    onChange={(value) =>
                      updateField('horaInicio', value)
                    }
                  />

                  <NumberField
                    label="Ayudantes"
                    value={form.numeroAyudantes}
                    onChange={(value) =>
                      updateField('numeroAyudantes', value)
                    }
                  />
                </div>

                <InputField
                  label="Horario de trabajo"
                  value={form.horarioTrabajo}
                  onChange={(value) =>
                    updateField('horarioTrabajo', value)
                  }
                />

                <InputField
                  label="Duración estimada"
                  value={form.duracionEstimada}
                  onChange={(value) =>
                    updateField('duracionEstimada', value)
                  }
                />
              </Section>

              <Section title="Alcance autorizado">
                <TextAreaField
                  label="Actividades autorizadas *"
                  value={form.alcanceAutorizado}
                  onChange={(value) =>
                    updateField('alcanceAutorizado', value)
                  }
                />

                <TextAreaField
                  label="Materiales autorizados"
                  value={form.materialesAutorizados}
                  onChange={(value) =>
                    updateField(
                      'materialesAutorizados',
                      value,
                    )
                  }
                />
              </Section>

              <Section title="Instrucciones">
                <TextAreaField
                  label="Instrucciones especiales"
                  value={form.instruccionesEspeciales}
                  onChange={(value) =>
                    updateField(
                      'instruccionesEspeciales',
                      value,
                    )
                  }
                />

                <TextAreaField
                  label="Condiciones de acceso"
                  value={form.condicionesAcceso}
                  onChange={(value) =>
                    updateField('condicionesAcceso', value)
                  }
                />

                <TextAreaField
                  label="Observaciones"
                  value={form.observaciones}
                  onChange={(value) =>
                    updateField('observaciones', value)
                  }
                />
              </Section>

              <Section title="Checklist de liberación">
                <Checkbox
                  label="Material completo"
                  checked={form.materialCompleto}
                  onChange={(value) =>
                    updateField('materialCompleto', value)
                  }
                />

                <Checkbox
                  label="Herramienta completa"
                  checked={form.herramientaCompleta}
                  onChange={(value) =>
                    updateField('herramientaCompleta', value)
                  }
                />

                <Checkbox
                  label="Equipo de seguridad preparado"
                  checked={form.equipoSeguridad}
                  onChange={(value) =>
                    updateField('equipoSeguridad', value)
                  }
                />

                <Checkbox
                  label="Cliente avisado"
                  checked={form.clienteAvisado}
                  onChange={(value) =>
                    updateField('clienteAvisado', value)
                  }
                />

                <Checkbox
                  label="Anticipo recibido"
                  checked={form.anticipoRecibido}
                  onChange={(value) =>
                    updateField('anticipoRecibido', value)
                  }
                />

                <Checkbox
                  label="Acceso confirmado"
                  checked={form.accesoConfirmado}
                  onChange={(value) =>
                    updateField('accesoConfirmado', value)
                  }
                />
              </Section>

              {message && (
                <p className="rounded-xl bg-[#F7F7F5] p-3 text-sm">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || !form.serviceId}
                className="w-full rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold disabled:opacity-50"
              >
                {saving
                  ? 'Generando orden...'
                  : 'Generar Orden de Trabajo'}
              </button>
            </form>
          </Card>
        )}

        <Card
  className={`${
            profile?.role === 'contratista'
              ? 'xl:col-span-2'
              : ''
          }`}
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold">
                {profile?.role === 'contratista'
                  ? 'Mis órdenes de trabajo'
                  : 'Órdenes emitidas'}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {filteredOrders.length} orden(es)
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar orden..."
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
            />
          </div>

          {message && profile?.role === 'contratista' && (
            <p className="mt-5 rounded-xl bg-[#F7F7F5] p-3 text-sm">
              {message}
            </p>
          )}

          <div className="mt-6 space-y-5">
            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center">
                <p className="font-medium text-[#0F3D36]">
                  No hay órdenes para mostrar
                </p>
              </div>
            ) : (
           filteredOrders.map((order) => (
  <WorkOrderCard
  key={order.id}
  order={order}
  profile={profile}
  onConfirm={confirmOrderFromHook}
  onStart={startWork}
  onFinish={finishWork}
/>
))
)}
              </div>      
        </Card>
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
      />
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
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

function StatusBadge({
  status,
}: {
  status: WorkOrderStatus
}) {
  const labels: Record<WorkOrderStatus, string> = {
  emitida: 'Orden emitida',
  confirmada: 'Confirmada',
  en_proceso: 'En proceso',
  pendiente_entrega: 'Pendiente de entrega',
  pausada: 'Pausada',
  terminada: 'Terminada',
  cancelada: 'Cancelada',
}
  return (
    <span className="rounded-full bg-[#F4E6AF] px-3 py-1 text-xs font-medium">
      {labels[status]}
    </span>
  )
}