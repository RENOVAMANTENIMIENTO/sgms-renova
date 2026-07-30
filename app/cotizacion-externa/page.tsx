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

type Material = {
  id: string
  descripcion: string
  unidad: string
  cantidad: number
  precioUnitario: number
}

type InternalQuoteData = {
  tipoCotizacion: 'interna'
  servicioId: string
  folioServicio: string
  folioCotizacion: string
  clienteNombre: string
  tipoServicio: string
  contratistaId: string
  contratistaNombre: string
  materiales: Material[]
  costoTotalContratista: number
  tiempoEstimado: string
  garantiaOfrecida: string
  observaciones: string
  estadoCotizacion: string
}

type InternalQuoteRecord = {
  id: string
  data: InternalQuoteData
  created_at: string
}

type ServiceData = {
  folio: string
  clienteId: string
  clienteNombre: string
  telefono: string
  whatsapp: string
  direccion: string
  ubicacion: string
  tipoServicio: string
  descripcion: string
  estado: string
  asesor?: string
  contratista?: string
  cotizacionInternaEnviada?: boolean
  cotizacionOficialGenerada?: boolean
}

type ServiceRecord = {
  id: string
  data: ServiceData
  created_at: string
}

type PaymentMethod =
  | 'Efectivo'
  | 'Transferencia'
  | 'Tarjeta'
  | 'Por definir'

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
  alcanceServicio: string
  materialesIncluidos: string
  tiempoEstimado: string
  garantia: string

  costoInterno: number
  utilidadPorcentaje: number
  utilidadMonto: number
  subtotalAntesDescuento: number
  descuento: number
  subtotal: number
  aplicarIva: boolean
  iva: number
  precioTotal: number

  anticipoPorcentaje: number
  anticipoRequerido: number
  saldoPendiente: number

  vigenciaDias: number
  fechaVencimiento: string
  condicionesComerciales: string
  formaPago: PaymentMethod

  aceptacionCliente: 'pendiente' | 'aceptada' | 'rechazada'
  estadoCotizacion: 'borrador' | 'enviada' | 'aceptada' | 'rechazada'
  creadoPor: string
  fechaCreacion: string
}

type OfficialQuoteRecord = {
  id: string
  data: OfficialQuoteData
  created_at: string
}

export default function CotizacionOficialPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState('')

  const [internalQuotes, setInternalQuotes] = useState<
    InternalQuoteRecord[]
  >([])
  const [officialQuotes, setOfficialQuotes] = useState<
    OfficialQuoteRecord[]
  >([])
  const [services, setServices] = useState<ServiceRecord[]>([])

  const [internalQuoteId, setInternalQuoteId] = useState('')
  const [alcanceServicio, setAlcanceServicio] = useState('')
  const [materialesIncluidos, setMaterialesIncluidos] = useState('')
  const [tiempoEstimado, setTiempoEstimado] = useState('')
  const [garantia, setGarantia] = useState('')

  const [utilidadPorcentaje, setUtilidadPorcentaje] = useState(25)
  const [descuento, setDescuento] = useState(0)
  const [aplicarIva, setAplicarIva] = useState(true)
  const [anticipoPorcentaje, setAnticipoPorcentaje] = useState(50)
  const [vigenciaDias, setVigenciaDias] = useState(15)
  const [condicionesComerciales, setCondicionesComerciales] =
    useState(
      'La cotización está sujeta a revisión del área de trabajo. Los trabajos adicionales no incluidos se cotizarán por separado.',
    )
  const [formaPago, setFormaPago] =
    useState<PaymentMethod>('Transferencia')

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
      setMessage('No fue posible cargar el perfil.')
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
        .select('id, data, created_at')
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
      const allQuotes = quoteData || []

      const internal = allQuotes.filter(
        (quote) => quote.data?.tipoCotizacion === 'interna',
      ) as InternalQuoteRecord[]

      const official = allQuotes.filter(
        (quote) => quote.data?.tipoCotizacion === 'oficial',
      ) as OfficialQuoteRecord[]

      setInternalQuotes(internal)
      setOfficialQuotes(official)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const selectedInternalQuote = internalQuotes.find(
    (quote) => quote.id === internalQuoteId,
  )

  const selectedService = services.find(
    (service) =>
      service.id === selectedInternalQuote?.data.servicioId,
  )

  const alreadyConvertedIds = useMemo(() => {
    return new Set(
      officialQuotes.map(
        (quote) => quote.data.cotizacionInternaId,
      ),
    )
  }, [officialQuotes])

  const availableInternalQuotes = internalQuotes.filter(
    (quote) => !alreadyConvertedIds.has(quote.id),
  )

  useEffect(() => {
    if (!selectedInternalQuote) return

    setTiempoEstimado(
      selectedInternalQuote.data.tiempoEstimado || '',
    )
    setGarantia(
      selectedInternalQuote.data.garantiaOfrecida || '',
    )

    const materialText = selectedInternalQuote.data.materiales
      ?.map(
        (material) =>
          `${material.cantidad} ${material.unidad} de ${material.descripcion}`,
      )
      .join(', ')

    setMaterialesIncluidos(materialText || '')

    setAlcanceServicio(
      selectedService?.data.descripcion ||
        selectedInternalQuote.data.tipoServicio ||
        '',
    )
  }, [selectedInternalQuote, selectedService])

  const costoInterno =
    selectedInternalQuote?.data.costoTotalContratista || 0

  const utilidadMonto = useMemo(() => {
    return costoInterno * (Number(utilidadPorcentaje || 0) / 100)
  }, [costoInterno, utilidadPorcentaje])

  const subtotalAntesDescuento = costoInterno + utilidadMonto

  const subtotal = Math.max(
    subtotalAntesDescuento - Number(descuento || 0),
    0,
  )

  const iva = aplicarIva ? subtotal * 0.16 : 0
  const precioTotal = subtotal + iva

  const anticipoRequerido =
    precioTotal * (Number(anticipoPorcentaje || 0) / 100)

  const saldoPendiente = precioTotal - anticipoRequerido

  function generateOfficialFolio() {
    const year = new Date().getFullYear()
    const reference = Date.now().toString().slice(-6)

    return `REN-OF-${year}-${reference}`
  }

  function calculateExpirationDate(days: number) {
    const date = new Date()
    date.setDate(date.getDate() + Number(days || 0))

    return date.toISOString().slice(0, 10)
  }

  function resetForm() {
    setInternalQuoteId('')
    setAlcanceServicio('')
    setMaterialesIncluidos('')
    setTiempoEstimado('')
    setGarantia('')
    setUtilidadPorcentaje(25)
    setDescuento(0)
    setAplicarIva(true)
    setAnticipoPorcentaje(50)
    setVigenciaDias(15)
    setCondicionesComerciales(
      'La cotización está sujeta a revisión del área de trabajo. Los trabajos adicionales no incluidos se cotizarán por separado.',
    )
    setFormaPago('Transferencia')
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    if (
      !selectedInternalQuote ||
      !selectedService ||
      !profile ||
      !userId
    ) {
      setMessage('Selecciona una cotización interna válida.')
      setSaving(false)
      return
    }

    const officialQuote: OfficialQuoteData = {
      tipoCotizacion: 'oficial',
      cotizacionInternaId: selectedInternalQuote.id,
      servicioId: selectedService.id,
      folioServicio: selectedService.data.folio,
      folioCotizacionOficial: generateOfficialFolio(),

      clienteNombre: selectedService.data.clienteNombre,
      telefono: selectedService.data.telefono,
      direccion: selectedService.data.direccion,
      tipoServicio: selectedService.data.tipoServicio,
      descripcionTrabajo: selectedService.data.descripcion,
      alcanceServicio,
      materialesIncluidos,
      tiempoEstimado,
      garantia,

      costoInterno,
      utilidadPorcentaje: Number(utilidadPorcentaje),
      utilidadMonto,
      subtotalAntesDescuento,
      descuento: Number(descuento),
      subtotal,
      aplicarIva,
      iva,
      precioTotal,

      anticipoPorcentaje: Number(anticipoPorcentaje),
      anticipoRequerido,
      saldoPendiente,

      vigenciaDias: Number(vigenciaDias),
      fechaVencimiento: calculateExpirationDate(vigenciaDias),
      condicionesComerciales,
      formaPago,

      aceptacionCliente: 'pendiente',
      estadoCotizacion: 'enviada',
      creadoPor: profile.full_name,
      fechaCreacion: new Date().toISOString(),
    }

    const { error: quoteError } = await supabase
      .from('sgms_records')
      .insert({
        module: 'cotizaciones',
        data: officialQuote,
        created_by: userId,
      })

    if (quoteError) {
      setMessage(
        `No se pudo generar la cotización oficial: ${quoteError.message}`,
      )
      setSaving(false)
      return
    }

    const { error: internalError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedInternalQuote.data,
          estadoCotizacion: 'convertida_a_oficial',
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedInternalQuote.id)

    const { error: serviceError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedService.data,
          estado: 'esperando_aprobacion',
          cotizacionOficialGenerada: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedService.id)

    if (internalError || serviceError) {
      setMessage(
        'La cotización oficial se creó, pero faltó actualizar parte del flujo.',
      )
    } else {
      setMessage(
        'Cotización oficial generada correctamente.',
      )
      resetForm()
      await loadData()
    }

    setSaving(false)
  }

  async function updateClientDecision(
    quote: OfficialQuoteRecord,
    decision: 'aceptada' | 'rechazada',
  ) {
    const relatedService = services.find(
      (service) => service.id === quote.data.servicioId,
    )

    const { error: quoteError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...quote.data,
          aceptacionCliente: decision,
          estadoCotizacion: decision,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', quote.id)

    if (quoteError) {
      setMessage(
        `No se pudo actualizar la cotización: ${quoteError.message}`,
      )
      return
    }

    if (relatedService) {
      const newStatus =
        decision === 'aceptada'
          ? 'esperando_anticipo'
          : 'cotizacion_rechazada'

      const { error: serviceError } = await supabase
        .from('sgms_records')
        .update({
          data: {
            ...relatedService.data,
            estado: newStatus,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', relatedService.id)

      if (serviceError) {
        setMessage(
          `Se actualizó la cotización, pero no el servicio: ${serviceError.message}`,
        )
        return
      }
    }

    setMessage(
      decision === 'aceptada'
        ? 'Cotización aceptada por el cliente.'
        : 'Cotización rechazada por el cliente.',
    )

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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F3D36]">
        <p className="text-white">
          Cargando cotizaciones oficiales...
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
              Cotización Oficial
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                router.push('/cotizacion-interna')
              }
              className="rounded-xl border border-white/30 px-4 py-2 text-sm"
            >
              Cotizaciones internas
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
            Generar cotización al cliente
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Convierte el costo del contratista en el precio oficial de RENOVA.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-6"
          >
            <Section title="Cotización interna">
              <SelectField
                label="Cotización pendiente *"
                value={internalQuoteId}
                onChange={setInternalQuoteId}
                required
              >
                <option value="">
                  Seleccionar cotización
                </option>

                {availableInternalQuotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {quote.data.folioCotizacion} —{' '}
                    {quote.data.clienteNombre} —{' '}
                    {money(
                      quote.data.costoTotalContratista,
                    )}
                  </option>
                ))}
              </SelectField>

              {availableInternalQuotes.length === 0 && (
                <p className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                  No hay cotizaciones internas pendientes.
                </p>
              )}

              {selectedInternalQuote && selectedService && (
                <div className="rounded-xl bg-[#F7F7F5] p-4 text-sm">
                  <p>
                    <strong>Servicio:</strong>{' '}
                    {selectedService.data.folio}
                  </p>

                  <p className="mt-1">
                    <strong>Cliente:</strong>{' '}
                    {selectedService.data.clienteNombre}
                  </p>

                  <p className="mt-1">
                    <strong>Tipo:</strong>{' '}
                    {selectedService.data.tipoServicio}
                  </p>

                  <p className="mt-1">
                    <strong>Contratista:</strong>{' '}
                    {
                      selectedInternalQuote.data
                        .contratistaNombre
                    }
                  </p>

                  <p className="mt-1">
                    <strong>Costo interno:</strong>{' '}
                    {money(costoInterno)}
                  </p>
                </div>
              )}
            </Section>

            <Section title="Alcance comercial">
              <TextAreaField
                label="Alcance del servicio *"
                value={alcanceServicio}
                onChange={setAlcanceServicio}
                required
              />

              <TextAreaField
                label="Materiales incluidos"
                value={materialesIncluidos}
                onChange={setMaterialesIncluidos}
              />

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Tiempo estimado"
                  value={tiempoEstimado}
                  onChange={setTiempoEstimado}
                />

                <InputField
                  label="Garantía"
                  value={garantia}
                  onChange={setGarantia}
                />
              </div>
            </Section>

            <Section title="Precio y utilidad">
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Utilidad RENOVA (%)"
                  value={utilidadPorcentaje}
                  onChange={setUtilidadPorcentaje}
                  min={0}
                />

                <NumberField
                  label="Descuento ($)"
                  value={descuento}
                  onChange={setDescuento}
                  min={0}
                />
              </div>

              <Checkbox
                label="Aplicar IVA del 16%"
                checked={aplicarIva}
                onChange={setAplicarIva}
              />

              <NumberField
                label="Anticipo requerido (%)"
                value={anticipoPorcentaje}
                onChange={setAnticipoPorcentaje}
                min={0}
                max={100}
              />
            </Section>

            <Section title="Condiciones comerciales">
              <NumberField
                label="Vigencia de la cotización (días)"
                value={vigenciaDias}
                onChange={setVigenciaDias}
                min={1}
              />

              <SelectField
                label="Forma de pago"
                value={formaPago}
                onChange={(value) =>
                  setFormaPago(value as PaymentMethod)
                }
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">
                  Transferencia
                </option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Por definir">
                  Por definir
                </option>
              </SelectField>

              <TextAreaField
                label="Condiciones comerciales"
                value={condicionesComerciales}
                onChange={setCondicionesComerciales}
              />
            </Section>

            {message && (
              <p className="rounded-xl bg-[#F7F7F5] p-3 text-sm">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !internalQuoteId}
              className="w-full rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold disabled:opacity-50"
            >
              {saving
                ? 'Generando...'
                : 'Generar cotización oficial'}
            </button>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="sticky top-6 rounded-2xl bg-[#0F3D36] p-6 text-white shadow-sm">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">
              RESUMEN COMERCIAL
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Precio al cliente
            </h2>

            <div className="mt-6 space-y-3 text-sm">
              <CostRow
                label="Costo interno"
                value={costoInterno}
              />

              <CostRow
                label={`Utilidad (${utilidadPorcentaje}%)`}
                value={utilidadMonto}
              />

              <CostRow
                label="Subtotal"
                value={subtotalAntesDescuento}
              />

              <CostRow
                label="Descuento"
                value={-descuento}
              />

              <CostRow
                label="IVA"
                value={iva}
              />
            </div>

            <div className="mt-6 border-t border-white/20 pt-5">
              <p className="text-sm text-white/70">
                Precio total
              </p>

              <p className="mt-1 text-4xl font-semibold text-[#D4AF37]">
                {money(precioTotal)}
              </p>
            </div>

            <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm">
              <p className="flex justify-between gap-3">
                <span>Anticipo</span>
                <strong>
                  {money(anticipoRequerido)}
                </strong>
              </p>

              <p className="mt-2 flex justify-between gap-3">
                <span>Saldo</span>
                <strong>
                  {money(saldoPendiente)}
                </strong>
              </p>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Cotizaciones oficiales
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {officialQuotes.length} cotización(es)
            </p>

            <div className="mt-5 space-y-4">
              {officialQuotes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No hay cotizaciones oficiales.
                </p>
              ) : (
                officialQuotes.map((quote) => (
                  <article
                    key={quote.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-[#0F3D36]">
                        {
                          quote.data
                            .folioCotizacionOficial
                        }
                      </p>

                      <span className="rounded-full bg-[#F4E6AF] px-3 py-1 text-xs capitalize">
                        {
                          quote.data
                            .aceptacionCliente
                        }
                      </span>
                    </div>

                    <p className="mt-2 font-medium">
                      {quote.data.clienteNombre}
                    </p>

                    <p className="text-sm text-gray-500">
                      {quote.data.tipoServicio}
                    </p>

                    <p className="mt-3 text-xl font-semibold">
                      {money(quote.data.precioTotal)}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={
                          quote.data.aceptacionCliente !==
                          'pendiente'
                        }
                        onClick={() =>
                          updateClientDecision(
                            quote,
                            'aceptada',
                          )
                        }
                        className="rounded-lg bg-[#0F3D36] px-3 py-2 text-sm text-white disabled:opacity-40"
                      >
                        Cliente aceptó
                      </button>

                      <button
                        type="button"
                        disabled={
                          quote.data.aceptacionCliente !==
                          'pendiente'
                        }
                        onClick={() =>
                          updateClientDecision(
                            quote,
                            'rechazada',
                          )
                        }
                        className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 disabled:opacity-40"
                      >
                        Cliente rechazó
                      </button>
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
}

function InputField({
  label,
  value,
  onChange,
}: InputFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type="text"
        value={value}
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
  max?: number
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
}: NumberFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step="0.01"
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
  required?: boolean
}

function TextAreaField({
  label,
  value,
  onChange,
  required = false,
}: TextAreaFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <textarea
        value={value}
        required={required}
        rows={4}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
      />
    </div>
  )
}

type CheckboxProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function Checkbox({
  label,
  checked,
  onChange,
}: CheckboxProps) {
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
