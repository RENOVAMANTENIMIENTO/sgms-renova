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

type DeliveryData = {
  tipoRegistro: 'entrega_servicio'
  folioEntrega: string

  ordenTrabajoId: string
  folioOrden: string

  servicioId: string
  folioServicio: string

  clienteNombre: string
  tipoServicio: string

  contratistaId: string
  contratistaNombre: string

  montoAnticipo: number
  saldoPendiente: number

  estadoEntrega: string

  pagoContratistaLiberado?: boolean
  pagoContratistaId?: string
}

type DeliveryRecord = {
  id: string
  data: DeliveryData
  assigned_to: string | null
  created_at: string
}

type InternalQuoteData = {
  tipoCotizacion: 'interna'
  servicioId: string
  folioServicio: string
  folioCotizacion: string

  contratistaId: string
  contratistaNombre: string

  costoManoObra?: number
  totalMateriales?: number
  totalAyudantes?: number
  costoHerramientas?: number
  costoViaticos?: number
  otrosCostos?: number

  costoTotalContratista: number

  pagoContratistaLiberado?: boolean
  pagoContratistaId?: string
}

type InternalQuoteRecord = {
  id: string
  data: InternalQuoteData
  created_at: string
}

type WorkOrderData = {
  folioOrden: string
  servicioId: string
  contratistaId: string
  contratistaNombre: string

  estadoOrden: string

  pagoContratistaLiberado?: boolean
  pagoContratistaId?: string
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
  tipoServicio: string
  estado: string

  contratistaId?: string
  contratista?: string

  pagoContratistaLiberado?: boolean
  pagoContratistaId?: string
}

type ServiceRecord = {
  id: string
  data: ServiceData
  assigned_to: string | null
  created_at: string
}

type PaymentReleaseCondition =
  | 'despues_cobro_cliente'
  | 'antes_cobro_cliente'

type PaymentMethod =
  | 'Transferencia'
  | 'Efectivo'
  | 'Cheque'
  | 'Tarjeta'
  | 'Otro'

type ContractorPaymentData = {
  tipoPago: 'pago_contratista'
  folioPago: string

  entregaId: string
  folioEntrega: string

  ordenTrabajoId: string
  folioOrden: string

  servicioId: string
  folioServicio: string

  cotizacionInternaId: string
  folioCotizacionInterna: string

  clienteNombre: string
  tipoServicio: string

  contratistaId: string
  contratistaNombre: string

  costoContratistaOriginal: number
  descuentoContratista: number
  motivoDescuento: string
  bonoContratista: number
  motivoBono: string
  montoLiberado: number

  saldoClientePendiente: number
  clienteLiquidoSaldo: boolean

  condicionLiberacion: PaymentReleaseCondition
  justificacionPagoAnticipado: string

  metodoPago: PaymentMethod
  banco: string
  referencia: string
  fechaPago: string
  horaPago: string
  comprobanteUrl: string

  autorizadoPor: string
  observaciones: string

  estadoPago: 'liberado'
  fechaRegistro: string
}

type ContractorPaymentRecord = {
  id: string
  data: ContractorPaymentData
  created_at: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5)
}

export default function LiberacionPagoPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState('')

  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([])
  const [internalQuotes, setInternalQuotes] = useState<
    InternalQuoteRecord[]
  >([])
  const [orders, setOrders] = useState<WorkOrderRecord[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [payments, setPayments] = useState<
    ContractorPaymentRecord[]
  >([])

  const [deliveryId, setDeliveryId] = useState('')

  const [condicionLiberacion, setCondicionLiberacion] =
    useState<PaymentReleaseCondition>('despues_cobro_cliente')

  const [clienteLiquidoSaldo, setClienteLiquidoSaldo] =
    useState(false)

  const [
    justificacionPagoAnticipado,
    setJustificacionPagoAnticipado,
  ] = useState('')

  const [descuentoContratista, setDescuentoContratista] =
    useState(0)
  const [motivoDescuento, setMotivoDescuento] = useState('')

  const [bonoContratista, setBonoContratista] = useState(0)
  const [motivoBono, setMotivoBono] = useState('')

  const [metodoPago, setMetodoPago] =
    useState<PaymentMethod>('Transferencia')
  const [banco, setBanco] = useState('')
  const [referencia, setReferencia] = useState('')
  const [fechaPago, setFechaPago] = useState(today())
  const [horaPago, setHoraPago] = useState(currentTime())
  const [comprobanteUrl, setComprobanteUrl] = useState('')
  const [observaciones, setObservaciones] = useState('')

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
      setMessage('No fue posible cargar el perfil.')
      setLoading(false)
      return
    }

    setProfile(profileData as Profile)

    if (profileData.role === 'contratista') {
      window.location.replace('/orden-trabajo')
      return
    }

    const { data: deliveryData, error: deliveryError } =
      await supabase
        .from('sgms_records')
        .select('id, data, assigned_to, created_at')
        .eq('module', 'entregas')
        .order('created_at', { ascending: false })

    if (deliveryError) {
      setMessage(
        `No fue posible cargar entregas: ${deliveryError.message}`,
      )
    } else {
      setDeliveries((deliveryData || []) as DeliveryRecord[])
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
      const internal = (quoteData || []).filter(
        (record) => record.data?.tipoCotizacion === 'interna',
      ) as InternalQuoteRecord[]

      setInternalQuotes(internal)
    }

    const { data: orderData, error: orderError } = await supabase
      .from('sgms_records')
      .select('id, data, assigned_to, created_at')
      .eq('module', 'ordenes_trabajo')
      .order('created_at', { ascending: false })

    if (orderError) {
      setMessage(
        `No fue posible cargar órdenes: ${orderError.message}`,
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
        `No fue posible cargar servicios: ${serviceError.message}`,
      )
    } else {
      setServices((serviceData || []) as ServiceRecord[])
    }

    const { data: paymentData, error: paymentError } =
      await supabase
        .from('sgms_records')
        .select('id, data, created_at')
        .eq('module', 'pagos')
        .order('created_at', { ascending: false })

    if (paymentError) {
      setMessage(
        `No fue posible cargar pagos: ${paymentError.message}`,
      )
    } else {
      const contractorPayments = (paymentData || []).filter(
        (record) => record.data?.tipoPago === 'pago_contratista',
      ) as ContractorPaymentRecord[]

      setPayments(contractorPayments)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const paidDeliveryIds = useMemo(() => {
    return new Set(
      payments.map((payment) => payment.data.entregaId),
    )
  }, [payments])

  const availableDeliveries = deliveries.filter((delivery) => {
    const delivered =
      delivery.data.estadoEntrega === 'entregada'

    const unpaid =
      delivery.data.pagoContratistaLiberado !== true &&
      !paidDeliveryIds.has(delivery.id)

    return delivered && unpaid
  })

  const selectedDelivery = deliveries.find(
    (delivery) => delivery.id === deliveryId,
  )

  const selectedQuote = internalQuotes.find(
    (quote) =>
      quote.data.servicioId === selectedDelivery?.data.servicioId,
  )

  const selectedOrder = orders.find(
    (order) =>
      order.id === selectedDelivery?.data.ordenTrabajoId,
  )

  const selectedService = services.find(
    (service) =>
      service.id === selectedDelivery?.data.servicioId,
  )

  const costoContratistaOriginal = Number(
    selectedQuote?.data.costoTotalContratista || 0,
  )

  const montoLiberado = Math.max(
    costoContratistaOriginal -
      Number(descuentoContratista || 0) +
      Number(bonoContratista || 0),
    0,
  )

  useEffect(() => {
    if (!selectedDelivery) {
      setClienteLiquidoSaldo(false)
      return
    }

    setClienteLiquidoSaldo(
      Number(selectedDelivery.data.saldoPendiente || 0) === 0,
    )
  }, [selectedDelivery])

  function generatePaymentFolio() {
    const year = new Date().getFullYear()
    const reference = Date.now().toString().slice(-6)

    return `REN-PAG-${year}-${reference}`
  }

  function resetForm() {
    setDeliveryId('')
    setCondicionLiberacion('despues_cobro_cliente')
    setClienteLiquidoSaldo(false)
    setJustificacionPagoAnticipado('')

    setDescuentoContratista(0)
    setMotivoDescuento('')

    setBonoContratista(0)
    setMotivoBono('')

    setMetodoPago('Transferencia')
    setBanco('')
    setReferencia('')
    setFechaPago(today())
    setHoraPago(currentTime())
    setComprobanteUrl('')
    setObservaciones('')
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

    if (
      !selectedDelivery ||
      !selectedQuote ||
      !selectedOrder ||
      !selectedService
    ) {
      setMessage(
        'Selecciona una entrega con información completa.',
      )
      setSaving(false)
      return
    }

    if (costoContratistaOriginal <= 0) {
      setMessage(
        'La cotización interna no tiene un costo válido.',
      )
      setSaving(false)
      return
    }

    if (descuentoContratista > costoContratistaOriginal) {
      setMessage(
        'El descuento no puede ser mayor al costo del contratista.',
      )
      setSaving(false)
      return
    }

    if (
      descuentoContratista > 0 &&
      !motivoDescuento.trim()
    ) {
      setMessage('Captura el motivo del descuento.')
      setSaving(false)
      return
    }

    if (bonoContratista > 0 && !motivoBono.trim()) {
      setMessage('Captura el motivo del bono.')
      setSaving(false)
      return
    }

    if (
      condicionLiberacion === 'despues_cobro_cliente' &&
      !clienteLiquidoSaldo
    ) {
      setMessage(
        'Para liberar después del cobro debes confirmar que el cliente liquidó el saldo.',
      )
      setSaving(false)
      return
    }

    if (
      condicionLiberacion === 'antes_cobro_cliente' &&
      !justificacionPagoAnticipado.trim()
    ) {
      setMessage(
        'Captura la justificación para pagar antes de cobrar el saldo.',
      )
      setSaving(false)
      return
    }

    if (
      condicionLiberacion === 'antes_cobro_cliente'
    ) {
      const confirmed = window.confirm(
        'El cliente todavía tiene saldo pendiente. ¿Confirmas que deseas liberar el pago al contratista?',
      )

      if (!confirmed) {
        setSaving(false)
        return
      }
    }

    const payment: ContractorPaymentData = {
      tipoPago: 'pago_contratista',
      folioPago: generatePaymentFolio(),

      entregaId: selectedDelivery.id,
      folioEntrega: selectedDelivery.data.folioEntrega,

      ordenTrabajoId: selectedOrder.id,
      folioOrden: selectedOrder.data.folioOrden,

      servicioId: selectedService.id,
      folioServicio: selectedService.data.folio,

      cotizacionInternaId: selectedQuote.id,
      folioCotizacionInterna:
        selectedQuote.data.folioCotizacion,

      clienteNombre: selectedDelivery.data.clienteNombre,
      tipoServicio: selectedDelivery.data.tipoServicio,

      contratistaId: selectedDelivery.data.contratistaId,
      contratistaNombre:
        selectedDelivery.data.contratistaNombre,

      costoContratistaOriginal,
      descuentoContratista: Number(descuentoContratista),
      motivoDescuento,
      bonoContratista: Number(bonoContratista),
      motivoBono,
      montoLiberado,

      saldoClientePendiente: Number(
        selectedDelivery.data.saldoPendiente || 0,
      ),
      clienteLiquidoSaldo,

      condicionLiberacion,
      justificacionPagoAnticipado,

      metodoPago,
      banco,
      referencia,
      fechaPago,
      horaPago,
      comprobanteUrl,

      autorizadoPor: profile.full_name,
      observaciones,

      estadoPago: 'liberado',
      fechaRegistro: new Date().toISOString(),
    }

    const { data: insertedPayment, error: paymentError } =
      await supabase
        .from('sgms_records')
        .insert({
          module: 'pagos',
          data: payment,
          created_by: userId,
          assigned_to: selectedDelivery.assigned_to,
        })
        .select('id')
        .single()

    if (paymentError || !insertedPayment) {
      setMessage(
        `No se pudo liberar el pago: ${
          paymentError?.message ||
          'No se recibió el registro creado'
        }`,
      )
      setSaving(false)
      return
    }

    const paymentId = insertedPayment.id
    const updatedAt = new Date().toISOString()

    const { error: deliveryUpdateError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedDelivery.data,
          pagoContratistaLiberado: true,
          pagoContratistaId: paymentId,
        },
        updated_at: updatedAt,
      })
      .eq('id', selectedDelivery.id)

    const { error: orderUpdateError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedOrder.data,
          pagoContratistaLiberado: true,
          pagoContratistaId: paymentId,
        },
        updated_at: updatedAt,
      })
      .eq('id', selectedOrder.id)

    const { error: serviceUpdateError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedService.data,
          pagoContratistaLiberado: true,
          pagoContratistaId: paymentId,
        },
        updated_at: updatedAt,
      })
      .eq('id', selectedService.id)

    const { error: quoteUpdateError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedQuote.data,
          pagoContratistaLiberado: true,
          pagoContratistaId: paymentId,
        },
        updated_at: updatedAt,
      })
      .eq('id', selectedQuote.id)

    if (
      deliveryUpdateError ||
      orderUpdateError ||
      serviceUpdateError ||
      quoteUpdateError
    ) {
      setMessage(
        'El pago se registró, pero faltó actualizar parte del flujo.',
      )
    } else {
      setMessage(
        'Pago al contratista liberado correctamente.',
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
          Cargando liberaciones de pago...
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
              Liberación de Pago
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push('/entrega')}
              className="rounded-xl border border-white/30 px-4 py-2 text-sm"
            >
              Entregas
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

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:px-10 xl:grid-cols-[470px_1fr]">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Autorizar pago
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Selecciona un servicio entregado y pendiente de pago.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-6"
          >
            <Section title="Entrega terminada">
              <SelectField
                label="Entrega *"
                value={deliveryId}
                onChange={setDeliveryId}
                required
              >
                <option value="">
                  Seleccionar entrega
                </option>

                {availableDeliveries.map((delivery) => (
                  <option
                    key={delivery.id}
                    value={delivery.id}
                  >
                    {delivery.data.folioEntrega} —{' '}
                    {delivery.data.clienteNombre}
                  </option>
                ))}
              </SelectField>

              {availableDeliveries.length === 0 && (
                <p className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                  No hay entregas pendientes de pago.
                </p>
              )}

              {selectedDelivery && (
                <div className="rounded-xl bg-[#F7F7F5] p-4 text-sm">
                  <p>
                    <strong>Cliente:</strong>{' '}
                    {selectedDelivery.data.clienteNombre}
                  </p>

                  <p className="mt-1">
                    <strong>Servicio:</strong>{' '}
                    {selectedDelivery.data.tipoServicio}
                  </p>

                  <p className="mt-1">
                    <strong>Contratista:</strong>{' '}
                    {selectedDelivery.data.contratistaNombre}
                  </p>

                  <p className="mt-1">
                    <strong>Costo contratado:</strong>{' '}
                    {money(costoContratistaOriginal)}
                  </p>

                  <p className="mt-1">
                    <strong>Saldo del cliente:</strong>{' '}
                    {money(
                      selectedDelivery.data.saldoPendiente,
                    )}
                  </p>
                </div>
              )}
            </Section>

            <Section title="Condición para liberar">
              <SelectField
                label="Momento de liberación"
                value={condicionLiberacion}
                onChange={(value) =>
                  setCondicionLiberacion(
                    value as PaymentReleaseCondition,
                  )
                }
              >
                <option value="despues_cobro_cliente">
                  Después de cobrar el saldo al cliente
                </option>

                <option value="antes_cobro_cliente">
                  Antes de cobrar el saldo al cliente
                </option>
              </SelectField>

              {condicionLiberacion ===
                'despues_cobro_cliente' && (
                <Checkbox
                  label="Confirmo que el cliente ya liquidó el saldo"
                  checked={clienteLiquidoSaldo}
                  onChange={setClienteLiquidoSaldo}
                />
              )}

              {condicionLiberacion ===
                'antes_cobro_cliente' && (
                <>
                  <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
                    El pago será liberado aunque el cliente aún tenga
                    saldo pendiente. Esta decisión quedará registrada.
                  </div>

                  <TextAreaField
                    label="Justificación obligatoria *"
                    value={justificacionPagoAnticipado}
                    onChange={setJustificacionPagoAnticipado}
                  />
                </>
              )}
            </Section>

            <Section title="Ajustes al pago">
              <NumberField
                label="Descuento al contratista"
                value={descuentoContratista}
                onChange={setDescuentoContratista}
              />

              {descuentoContratista > 0 && (
                <InputField
                  label="Motivo del descuento *"
                  value={motivoDescuento}
                  onChange={setMotivoDescuento}
                />
              )}

              <NumberField
                label="Bono adicional"
                value={bonoContratista}
                onChange={setBonoContratista}
              />

              {bonoContratista > 0 && (
                <InputField
                  label="Motivo del bono *"
                  value={motivoBono}
                  onChange={setMotivoBono}
                />
              )}
            </Section>

            <Section title="Datos del pago">
              <SelectField
                label="Método de pago"
                value={metodoPago}
                onChange={(value) =>
                  setMetodoPago(value as PaymentMethod)
                }
              >
                <option value="Transferencia">
                  Transferencia
                </option>
                <option value="Efectivo">Efectivo</option>
                <option value="Cheque">Cheque</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Otro">Otro</option>
              </SelectField>

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Banco"
                  value={banco}
                  onChange={setBanco}
                />

                <InputField
                  label="Referencia"
                  value={referencia}
                  onChange={setReferencia}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Fecha"
                  type="date"
                  value={fechaPago}
                  onChange={setFechaPago}
                />

                <InputField
                  label="Hora"
                  type="time"
                  value={horaPago}
                  onChange={setHoraPago}
                />
              </div>

              <InputField
                label="Enlace del comprobante"
                value={comprobanteUrl}
                onChange={setComprobanteUrl}
                placeholder="Opcional por ahora"
              />

              <TextAreaField
                label="Observaciones"
                value={observaciones}
                onChange={setObservaciones}
              />
            </Section>

            {message && (
              <p className="rounded-xl bg-[#F7F7F5] p-3 text-sm">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !deliveryId}
              className="w-full rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold disabled:opacity-50"
            >
              {saving
                ? 'Liberando pago...'
                : 'Liberar pago al contratista'}
            </button>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-[#0F3D36] p-6 text-white shadow-sm">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">
              RESUMEN DEL PAGO
            </p>

            <div className="mt-6 space-y-3 text-sm">
              <CostRow
                label="Costo contratado"
                value={costoContratistaOriginal}
              />

              <CostRow
                label="Descuento"
                value={-descuentoContratista}
              />

              <CostRow
                label="Bono"
                value={bonoContratista}
              />
            </div>

            <div className="mt-6 border-t border-white/20 pt-5">
              <p className="text-sm text-white/70">
                Monto a liberar
              </p>

              <p className="mt-1 text-4xl font-semibold text-[#D4AF37]">
                {money(montoLiberado)}
              </p>
            </div>

            {selectedDelivery && (
              <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm">
                <p className="flex justify-between gap-3">
                  <span>Saldo del cliente</span>
                  <strong>
                    {money(
                      selectedDelivery.data.saldoPendiente,
                    )}
                  </strong>
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Pagos liberados
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {payments.length} pago(s)
            </p>

            <div className="mt-5 space-y-4">
              {payments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No hay pagos liberados.
                </p>
              ) : (
                payments.map((payment) => (
                  <article
                    key={payment.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-[#0F3D36]">
                        {payment.data.folioPago}
                      </p>

                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                        Liberado
                      </span>
                    </div>

                    <p className="mt-2 font-medium">
                      {payment.data.contratistaNombre}
                    </p>

                    <p className="text-sm text-gray-500">
                      {payment.data.clienteNombre}
                    </p>

                    <p className="mt-3 text-xl font-semibold">
                      {money(payment.data.montoLiberado)}
                    </p>

                    <div className="mt-3 space-y-1 text-sm">
                      <p>
                        <strong>Método:</strong>{' '}
                        {payment.data.metodoPago}
                      </p>

                      <p>
                        <strong>Fecha:</strong>{' '}
                        {payment.data.fechaPago}
                      </p>

                      <p>
                        <strong>Autorizó:</strong>{' '}
                        {payment.data.autorizadoPor}
                      </p>

                      <p>
                        <strong>Condición:</strong>{' '}
                        {payment.data.condicionLiberacion ===
                        'despues_cobro_cliente'
                          ? 'Después de cobrar al cliente'
                          : 'Antes de cobrar al cliente'}
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
        onChange={(event) => onChange(event.target.value)}
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
        step="0.01"
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
        onChange={(event) => onChange(event.target.value)}
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
        onChange={(event) => onChange(event.target.value)}
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
        onChange={(event) => onChange(event.target.checked)}
      />

      {label}
    </label>
  )
}

function CostRow({
  label,
  value,
}: {
  label: string
  value: number
}) {
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value || 0)

  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/70">{label}</span>
      <span>{formatted}</span>
    </div>
  )
}