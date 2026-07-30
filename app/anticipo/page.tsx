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

type Profile = {
  full_name: string
  role: 'supervisor' | 'vendedor' | 'contratista'
}

type OfficialQuoteData = {
  tipoCotizacion: 'oficial'
  cotizacionInternaId: string
  servicioId: string
  folioServicio: string
  folioCotizacionOficial: string

  clienteNombre: string
  telefono: string
  direccion: string
  tipoServicio: string
  descripcionTrabajo: string

  precioTotal: number
  anticipoPorcentaje: number
  anticipoRequerido: number
  saldoPendiente: number

  formaPago: string
  aceptacionCliente: 'pendiente' | 'aceptada' | 'rechazada'
  estadoCotizacion: string

  anticipoRegistrado?: boolean
  montoAnticipoRecibido?: number
  saldoActual?: number
}

type OfficialQuoteRecord = {
  id: string
  data: OfficialQuoteData
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

  anticipoRegistrado?: boolean
  montoAnticipo?: number
  saldoPendiente?: number
}

type ServiceRecord = {
  id: string
  data: ServiceData
  assigned_to: string | null
  created_at: string
}

type PaymentMethod =
  | 'Efectivo'
  | 'Transferencia'
  | 'Tarjeta'
  | 'Cheque'
  | 'Otro'

type AdvancePaymentData = {
  tipoPago: 'anticipo'
  folioRecibo: string

  cotizacionOficialId: string
  folioCotizacionOficial: string

  servicioId: string
  folioServicio: string

  clienteNombre: string
  telefono: string
  tipoServicio: string
  concepto: string

  precioTotal: number
  anticipoRequerido: number
  montoRecibido: number
  saldoAnterior: number
  saldoPendiente: number

  metodoPago: PaymentMethod
  banco: string
  referencia: string
  fechaPago: string
  horaPago: string

  recibidoPor: string
  observaciones: string
  comprobanteUrl: string

  estadoPago: 'registrado'
  fechaRegistro: string
}

type AdvancePaymentRecord = {
  id: string
  data: AdvancePaymentData
  created_at: string
}

export default function AnticiposPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState('')

  const [quotes, setQuotes] = useState<OfficialQuoteRecord[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [payments, setPayments] = useState<AdvancePaymentRecord[]>([])

  const [quoteId, setQuoteId] = useState('')
  const [montoRecibido, setMontoRecibido] = useState(0)
  const [metodoPago, setMetodoPago] =
    useState<PaymentMethod>('Transferencia')
  const [banco, setBanco] = useState('')
  const [referencia, setReferencia] = useState('')
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [horaPago, setHoraPago] = useState(
    new Date().toTimeString().slice(0, 5),
  )
  const [observaciones, setObservaciones] = useState('')
  const [comprobanteUrl, setComprobanteUrl] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadData = useCallback(async () => {
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

    setProfile(profileData)

    if (profileData.role === 'contratista') {
      window.location.replace('/agenda')
      return
    }

    const { data: serviceData, error: serviceError } =
      await supabase
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
      const officialQuotes = (quoteData || []).filter(
        (record) =>
          record.data?.tipoCotizacion === 'oficial' &&
          record.data?.aceptacionCliente === 'aceptada',
      ) as OfficialQuoteRecord[]

      setQuotes(officialQuotes)
    }

    const { data: paymentData, error: paymentError } =
      await supabase
        .from('sgms_records')
        .select('id, data, created_at')
        .eq('module', 'pagos')
        .order('created_at', { ascending: false })

    if (paymentError) {
      setMessage(
        `No fue posible cargar anticipos: ${paymentError.message}`,
      )
    } else {
      const advances = (paymentData || []).filter(
        (record) => record.data?.tipoPago === 'anticipo',
      ) as AdvancePaymentRecord[]

      setPayments(advances)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const quotesWithAdvance = useMemo(() => {
    return new Set(
      payments.map(
        (payment) => payment.data.cotizacionOficialId,
      ),
    )
  }, [payments])

  const availableQuotes = quotes.filter(
    (quote) =>
      !quotesWithAdvance.has(quote.id) &&
      quote.data.anticipoRegistrado !== true,
  )

  const selectedQuote = quotes.find(
    (quote) => quote.id === quoteId,
  )

  const selectedService = services.find(
    (service) =>
      service.id === selectedQuote?.data.servicioId,
  )

  useEffect(() => {
    if (!selectedQuote) {
      setMontoRecibido(0)
      return
    }

    setMontoRecibido(
      Number(selectedQuote.data.anticipoRequerido || 0),
    )
  }, [selectedQuote])

  const precioTotal = Number(
    selectedQuote?.data.precioTotal || 0,
  )

  const saldoAnterior = Number(
    selectedQuote?.data.saldoActual ??
      selectedQuote?.data.precioTotal ??
      0,
  )

  const saldoPendiente = Math.max(
    saldoAnterior - Number(montoRecibido || 0),
    0,
  )

  function generateReceiptFolio() {
    const year = new Date().getFullYear()
    const reference = Date.now().toString().slice(-6)

    return `REN-ANT-${year}-${reference}`
  }

  function resetForm() {
    setQuoteId('')
    setMontoRecibido(0)
    setMetodoPago('Transferencia')
    setBanco('')
    setReferencia('')
    setFechaPago(new Date().toISOString().slice(0, 10))
    setHoraPago(new Date().toTimeString().slice(0, 5))
    setObservaciones('')
    setComprobanteUrl('')
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    if (
      !selectedQuote ||
      !selectedService ||
      !profile ||
      !userId
    ) {
      setMessage('Selecciona una cotización aceptada válida.')
      setSaving(false)
      return
    }

    if (montoRecibido <= 0) {
      setMessage('El monto recibido debe ser mayor a cero.')
      setSaving(false)
      return
    }

    if (montoRecibido > saldoAnterior) {
      setMessage(
        'El anticipo no puede ser mayor al saldo pendiente.',
      )
      setSaving(false)
      return
    }

    const payment: AdvancePaymentData = {
      tipoPago: 'anticipo',
      folioRecibo: generateReceiptFolio(),

      cotizacionOficialId: selectedQuote.id,
      folioCotizacionOficial:
        selectedQuote.data.folioCotizacionOficial,

      servicioId: selectedService.id,
      folioServicio: selectedService.data.folio,

      clienteNombre: selectedQuote.data.clienteNombre,
      telefono: selectedQuote.data.telefono || '',
      tipoServicio: selectedQuote.data.tipoServicio,
      concepto: `Anticipo por servicio de ${selectedQuote.data.tipoServicio}`,

      precioTotal,
      anticipoRequerido: Number(
        selectedQuote.data.anticipoRequerido || 0,
      ),
      montoRecibido: Number(montoRecibido),
      saldoAnterior,
      saldoPendiente,

      metodoPago,
      banco,
      referencia,
      fechaPago,
      horaPago,

      recibidoPor: profile.full_name,
      observaciones,
      comprobanteUrl,

      estadoPago: 'registrado',
      fechaRegistro: new Date().toISOString(),
    }

    const { error: paymentError } = await supabase
      .from('sgms_records')
      .insert({
        module: 'pagos',
        data: payment,
        created_by: userId,
        assigned_to: selectedService.assigned_to,
      })

    if (paymentError) {
      setMessage(
        `No se pudo registrar el anticipo: ${paymentError.message}`,
      )
      setSaving(false)
      return
    }

    const { error: quoteError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedQuote.data,
          anticipoRegistrado: true,
          montoAnticipoRecibido: Number(montoRecibido),
          saldoActual: saldoPendiente,
          estadoCotizacion: 'anticipo_recibido',
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedQuote.id)

    const { error: serviceError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedService.data,
          estado: 'listo_para_trabajo',
          anticipoRegistrado: true,
          montoAnticipo: Number(montoRecibido),
          saldoPendiente,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedService.id)

    if (quoteError || serviceError) {
      setMessage(
        'El anticipo se guardó, pero faltó actualizar parte del flujo.',
      )
    } else {
      setMessage(
        'Anticipo registrado. El servicio está listo para generar la orden de trabajo.',
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
          Cargando anticipos...
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#1B1F1E]">
      <header className="bg-[#0F3D36] px-5 py-5 text-white md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">
              SGMS DIGITAL
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              Registro de Anticipos
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                router.push('/cotizacion-oficial')
              }
              className="rounded-xl border border-white/30 px-4 py-2 text-sm"
            >
              Cotizaciones
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

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:px-10 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Registrar pago inicial
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Selecciona una cotización aceptada por el cliente.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-6"
          >
            <Section title="Cotización aceptada">
              <SelectField
                label="Cotización oficial *"
                value={quoteId}
                onChange={setQuoteId}
                required
              >
                <option value="">
                  Seleccionar cotización
                </option>

                {availableQuotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {quote.data.folioCotizacionOficial} —{' '}
                    {quote.data.clienteNombre} —{' '}
                    {money(quote.data.precioTotal)}
                  </option>
                ))}
              </SelectField>

              {availableQuotes.length === 0 && (
                <p className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                  No hay cotizaciones aceptadas pendientes de anticipo.
                </p>
              )}

              {selectedQuote && selectedService && (
                <div className="rounded-xl bg-[#F7F7F5] p-4 text-sm">
                  <p>
                    <strong>Servicio:</strong>{' '}
                    {selectedService.data.folio}
                  </p>

                  <p className="mt-1">
                    <strong>Cliente:</strong>{' '}
                    {selectedQuote.data.clienteNombre}
                  </p>

                  <p className="mt-1">
                    <strong>Tipo:</strong>{' '}
                    {selectedQuote.data.tipoServicio}
                  </p>

                  <p className="mt-1">
                    <strong>Precio total:</strong>{' '}
                    {money(precioTotal)}
                  </p>

                  <p className="mt-1">
                    <strong>Anticipo requerido:</strong>{' '}
                    {money(
                      selectedQuote.data.anticipoRequerido,
                    )}
                  </p>
                </div>
              )}
            </Section>

            <Section title="Datos del pago">
              <NumberField
                label="Monto recibido *"
                value={montoRecibido}
                onChange={setMontoRecibido}
                min={0}
              />

              <SelectField
                label="Método de pago"
                value={metodoPago}
                onChange={(value) =>
                  setMetodoPago(value as PaymentMethod)
                }
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">
                  Transferencia
                </option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Cheque">Cheque</option>
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
                  label="Fecha del pago"
                  type="date"
                  value={fechaPago}
                  onChange={setFechaPago}
                />

                <InputField
                  label="Hora del pago"
                  type="time"
                  value={horaPago}
                  onChange={setHoraPago}
                />
              </div>
            </Section>

            <Section title="Comprobante y observaciones">
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
              disabled={saving || !quoteId}
              className="w-full rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold disabled:opacity-50"
            >
              {saving
                ? 'Guardando...'
                : 'Registrar anticipo'}
            </button>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="sticky top-6 rounded-2xl bg-[#0F3D36] p-6 text-white shadow-sm">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">
              RESUMEN DEL PAGO
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Anticipo
            </h2>

            <div className="mt-6 space-y-3 text-sm">
              <CostRow
                label="Total del servicio"
                value={precioTotal}
              />

              <CostRow
                label="Saldo anterior"
                value={saldoAnterior}
              />

              <CostRow
                label="Monto recibido"
                value={montoRecibido}
              />
            </div>

            <div className="mt-6 border-t border-white/20 pt-5">
              <p className="text-sm text-white/70">
                Saldo pendiente
              </p>

              <p className="mt-1 text-4xl font-semibold text-[#D4AF37]">
                {money(saldoPendiente)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Anticipos registrados
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {payments.length} anticipo(s)
            </p>

            <div className="mt-5 space-y-4">
              {payments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No hay anticipos registrados.
                </p>
              ) : (
                payments.map((payment) => (
                  <article
                    key={payment.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-[#0F3D36]">
                        {payment.data.folioRecibo}
                      </p>

                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                        Registrado
                      </span>
                    </div>

                    <p className="mt-2 font-medium">
                      {payment.data.clienteNombre}
                    </p>

                    <p className="text-sm text-gray-500">
                      {payment.data.tipoServicio}
                    </p>

                    <p className="mt-3 text-xl font-semibold">
                      {money(payment.data.montoRecibido)}
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
                        <strong>Saldo:</strong>{' '}
                        {money(payment.data.saldoPendiente)}
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

type SectionProps = {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section>
      <h3 className="mb-4 border-b border-gray-200 pb-2 text-lg font-semibold text-[#0F3D36]">
        {title}
      </h3>

      <div className="space-y-4">{children}</div>
    </section>
  )
}

type InputFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: InputFieldProps) {
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

type NumberFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
}: NumberFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type="number"
        min={min}
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

type SelectFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  children: React.ReactNode
}

function SelectField({
  label,
  value,
  onChange,
  required = false,
  children,
}: SelectFieldProps) {
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

type TextAreaFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

function TextAreaField({
  label,
  value,
  onChange,
}: TextAreaFieldProps) {
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
