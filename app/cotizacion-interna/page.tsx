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

type ServiceData = {
  folio: string
  clienteNombre: string
  telefono?: string
  whatsapp?: string
  direccion?: string
  ubicacion?: string
  tipoServicio: string
  descripcion: string
  contratista?: string
  contratistaId?: string
  fechaVisita?: string
  horaVisita?: string
  visitaRealizada?: boolean
  estado: string
}

type ServiceRecord = {
  id: string
  data: ServiceData
  assigned_to: string | null
}

type Material = {
  id: string
  descripcion: string
  unidad: string
  cantidad: number
  precioUnitario: number
}

type QuoteData = {
  tipoCotizacion: 'interna'
  servicioId: string
  folioServicio: string
  folioCotizacion: string
  clienteNombre: string
  tipoServicio: string
  contratistaId: string
  contratistaNombre: string

  especialidad: string
  horasEstimadas: number
  numeroAyudantes: number
  diasTrabajo: number
  costoDiarioAyudante: number

  costoManoObra: number
  costoHerramientas: number
  costoViaticos: number
  otrosCostos: number
  descripcionOtrosCostos: string

  materiales: Material[]
  totalMateriales: number
  totalAyudantes: number
  costoTotalContratista: number

  tiempoEstimado: string
  garantiaOfrecida: string

  incluyeMaterial: boolean
  incluyeHerramienta: boolean
  incluyeProteccionMuebles: boolean
  incluyeLimpiezaFinal: boolean
  incluyeRetiroEscombro: boolean
  incluyeEquipoSeguridad: boolean

  observaciones: string
  estadoCotizacion: 'pendiente_revision'
  fechaEnvio: string
}

type QuoteRecord = {
  id: string
  data: QuoteData
  created_at: string
}

const emptyMaterial = (): Material => ({
  id: crypto.randomUUID(),
  descripcion: '',
  unidad: '',
  cantidad: 1,
  precioUnitario: 0,
})

export default function CotizacionInternaPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState('')
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [quotes, setQuotes] = useState<QuoteRecord[]>([])

  const [serviceId, setServiceId] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [horasEstimadas, setHorasEstimadas] = useState(0)
  const [numeroAyudantes, setNumeroAyudantes] = useState(0)
  const [diasTrabajo, setDiasTrabajo] = useState(1)
  const [costoDiarioAyudante, setCostoDiarioAyudante] = useState(0)

  const [costoManoObra, setCostoManoObra] = useState(0)
  const [costoHerramientas, setCostoHerramientas] = useState(0)
  const [costoViaticos, setCostoViaticos] = useState(0)
  const [otrosCostos, setOtrosCostos] = useState(0)
  const [descripcionOtrosCostos, setDescripcionOtrosCostos] =
    useState('')

  const [materiales, setMateriales] = useState<Material[]>([
    emptyMaterial(),
  ])

  const [tiempoEstimado, setTiempoEstimado] = useState('')
  const [garantiaOfrecida, setGarantiaOfrecida] = useState('')

  const [incluyeMaterial, setIncluyeMaterial] = useState(false)
  const [incluyeHerramienta, setIncluyeHerramienta] = useState(false)
  const [incluyeProteccionMuebles, setIncluyeProteccionMuebles] =
    useState(false)
  const [incluyeLimpiezaFinal, setIncluyeLimpiezaFinal] =
    useState(false)
  const [incluyeRetiroEscombro, setIncluyeRetiroEscombro] =
    useState(false)
  const [incluyeEquipoSeguridad, setIncluyeEquipoSeguridad] =
    useState(false)

  const [observaciones, setObservaciones] = useState('')
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

    let serviceQuery = supabase
      .from('sgms_records')
      .select('id, data, assigned_to')
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
      const eligibleServices = (
        (serviceData || []) as ServiceRecord[]
      ).filter(
        (service) =>
          service.data.visitaRealizada === true ||
          service.data.estado === 'cotizando',
      )

      setServices(eligibleServices)
    }

    let quoteQuery = supabase
      .from('sgms_records')
      .select('id, data, created_at')
      .eq('module', 'cotizaciones')
      .order('created_at', { ascending: false })

    if (profileData.role === 'contratista') {
      quoteQuery = quoteQuery.eq('created_by', user.id)
    }

    const { data: quoteData, error: quoteError } = await quoteQuery

    if (quoteError) {
      setMessage(
        `No fue posible cargar las cotizaciones: ${quoteError.message}`,
      )
    } else {
      const internalQuotes = (
        (quoteData || []) as QuoteRecord[]
      ).filter(
        (quote) => quote.data.tipoCotizacion === 'interna',
      )

      setQuotes(internalQuotes)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const selectedService = services.find(
    (service) => service.id === serviceId,
  )

  const totalMateriales = useMemo(() => {
    return materiales.reduce(
      (total, material) =>
        total +
        Number(material.cantidad || 0) *
          Number(material.precioUnitario || 0),
      0,
    )
  }, [materiales])

  const totalAyudantes = useMemo(() => {
    return (
      Number(numeroAyudantes || 0) *
      Number(diasTrabajo || 0) *
      Number(costoDiarioAyudante || 0)
    )
  }, [numeroAyudantes, diasTrabajo, costoDiarioAyudante])

  const costoTotalContratista = useMemo(() => {
    return (
      Number(costoManoObra || 0) +
      totalMateriales +
      totalAyudantes +
      Number(costoHerramientas || 0) +
      Number(costoViaticos || 0) +
      Number(otrosCostos || 0)
    )
  }, [
    costoManoObra,
    totalMateriales,
    totalAyudantes,
    costoHerramientas,
    costoViaticos,
    otrosCostos,
  ])

  function generateQuoteFolio() {
    const year = new Date().getFullYear()
    const reference = Date.now().toString().slice(-6)

    return `REN-COT-${year}-${reference}`
  }

  function updateMaterial(
    id: string,
    field: keyof Material,
    value: string | number,
  ) {
    setMateriales((current) =>
      current.map((material) =>
        material.id === id
          ? {
              ...material,
              [field]: value,
            }
          : material,
      ),
    )
  }

  function addMaterial() {
    setMateriales((current) => [
      ...current,
      emptyMaterial(),
    ])
  }

  function removeMaterial(id: string) {
    setMateriales((current) => {
      if (current.length === 1) {
        return [emptyMaterial()]
      }

      return current.filter(
        (material) => material.id !== id,
      )
    })
  }

  function resetForm() {
    setServiceId('')
    setEspecialidad('')
    setHorasEstimadas(0)
    setNumeroAyudantes(0)
    setDiasTrabajo(1)
    setCostoDiarioAyudante(0)
    setCostoManoObra(0)
    setCostoHerramientas(0)
    setCostoViaticos(0)
    setOtrosCostos(0)
    setDescripcionOtrosCostos('')
    setMateriales([emptyMaterial()])
    setTiempoEstimado('')
    setGarantiaOfrecida('')
    setIncluyeMaterial(false)
    setIncluyeHerramienta(false)
    setIncluyeProteccionMuebles(false)
    setIncluyeLimpiezaFinal(false)
    setIncluyeRetiroEscombro(false)
    setIncluyeEquipoSeguridad(false)
    setObservaciones('')
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    if (!selectedService) {
      setMessage('Selecciona un servicio.')
      setSaving(false)
      return
    }

    if (!profile || !userId) {
      setMessage('No fue posible identificar al contratista.')
      setSaving(false)
      return
    }

    const validMaterials = materiales.filter(
      (material) => material.descripcion.trim() !== '',
    )

    const quote: QuoteData = {
      tipoCotizacion: 'interna',
      servicioId: selectedService.id,
      folioServicio: selectedService.data.folio,
      folioCotizacion: generateQuoteFolio(),
      clienteNombre: selectedService.data.clienteNombre,
      tipoServicio: selectedService.data.tipoServicio,
      contratistaId: userId,
      contratistaNombre: profile.full_name,

      especialidad,
      horasEstimadas: Number(horasEstimadas),
      numeroAyudantes: Number(numeroAyudantes),
      diasTrabajo: Number(diasTrabajo),
      costoDiarioAyudante: Number(costoDiarioAyudante),

      costoManoObra: Number(costoManoObra),
      costoHerramientas: Number(costoHerramientas),
      costoViaticos: Number(costoViaticos),
      otrosCostos: Number(otrosCostos),
      descripcionOtrosCostos,

      materiales: validMaterials,
      totalMateriales,
      totalAyudantes,
      costoTotalContratista,

      tiempoEstimado,
      garantiaOfrecida,

      incluyeMaterial,
      incluyeHerramienta,
      incluyeProteccionMuebles,
      incluyeLimpiezaFinal,
      incluyeRetiroEscombro,
      incluyeEquipoSeguridad,

      observaciones,
      estadoCotizacion: 'pendiente_revision',
      fechaEnvio: new Date().toISOString(),
    }

    const { error: quoteError } = await supabase
      .from('sgms_records')
      .insert({
        module: 'cotizaciones',
        data: quote,
        created_by: userId,
        assigned_to:
          selectedService.assigned_to || userId,
      })

    if (quoteError) {
      setMessage(
        `No se pudo guardar la cotización: ${quoteError.message}`,
      )
      setSaving(false)
      return
    }

    const { error: serviceError } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selectedService.data,
          estado: 'cotizando',
          cotizacionInternaEnviada: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedService.id)

    if (serviceError) {
      setMessage(
        `La cotización se guardó, pero no se actualizó el servicio: ${serviceError.message}`,
      )
    } else {
      setMessage(
        'Cotización interna enviada al supervisor.',
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
          Cargando cotizaciones...
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
              Cotización Interna
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push('/agenda')}
              className="rounded-xl border border-white/30 px-4 py-2 text-sm"
            >
              Agenda
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

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:px-10 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Nueva cotización
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Captura los costos internos del servicio.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-6"
          >
            <Section title="Datos generales">
              <SelectField
                label="Servicio visitado *"
                value={serviceId}
                onChange={setServiceId}
                required
              >
                <option value="">
                  Seleccionar servicio
                </option>

                {services.map((service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.data.folio} —{' '}
                    {service.data.clienteNombre}
                  </option>
                ))}
              </SelectField>

              {services.length === 0 && (
                <p className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                  No tienes visitas realizadas disponibles
                  para cotizar.
                </p>
              )}

              {selectedService && (
                <div className="rounded-xl bg-[#F7F7F5] p-4 text-sm">
                  <p>
                    <strong>Folio:</strong>{' '}
                    {selectedService.data.folio}
                  </p>

                  <p className="mt-1">
                    <strong>Cliente:</strong>{' '}
                    {selectedService.data.clienteNombre}
                  </p>

                  <p className="mt-1">
                    <strong>Servicio:</strong>{' '}
                    {selectedService.data.tipoServicio}
                  </p>

                  <p className="mt-1">
                    <strong>Descripción:</strong>{' '}
                    {selectedService.data.descripcion}
                  </p>
                </div>
              )}

              <InputField
                label="Especialidad"
                value={especialidad}
                onChange={setEspecialidad}
                placeholder="Ej. Pintura, impermeabilización"
              />

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Horas estimadas"
                  value={horasEstimadas}
                  onChange={setHorasEstimadas}
                />

                <NumberField
                  label="Días de trabajo"
                  value={diasTrabajo}
                  onChange={setDiasTrabajo}
                  min={1}
                />
              </div>
            </Section>

            <Section title="Materiales">
              <div className="space-y-4">
                {materiales.map((material, index) => (
                  <div
                    key={material.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-medium">
                        Material {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeMaterial(material.id)
                        }
                        className="text-sm text-red-600"
                      >
                        Eliminar
                      </button>
                    </div>

                    <InputField
                      label="Descripción"
                      value={material.descripcion}
                      onChange={(value) =>
                        updateMaterial(
                          material.id,
                          'descripcion',
                          value,
                        )
                      }
                    />

                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <InputField
                        label="Unidad"
                        value={material.unidad}
                        onChange={(value) =>
                          updateMaterial(
                            material.id,
                            'unidad',
                            value,
                          )
                        }
                        placeholder="Litro, cubeta..."
                      />

                      <NumberField
                        label="Cantidad"
                        value={material.cantidad}
                        onChange={(value) =>
                          updateMaterial(
                            material.id,
                            'cantidad',
                            value,
                          )
                        }
                        min={0}
                      />

                      <NumberField
                        label="Precio unitario"
                        value={material.precioUnitario}
                        onChange={(value) =>
                          updateMaterial(
                            material.id,
                            'precioUnitario',
                            value,
                          )
                        }
                        min={0}
                      />
                    </div>

                    <p className="mt-3 text-right text-sm font-semibold text-[#0F3D36]">
                      Total:{' '}
                      {money(
                        material.cantidad *
                          material.precioUnitario,
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addMaterial}
                className="mt-4 w-full rounded-xl border border-[#0F3D36] px-4 py-3 text-sm font-medium text-[#0F3D36]"
              >
                + Agregar material
              </button>
            </Section>

            <Section title="Mano de obra y ayudantes">
              <NumberField
                label="Costo de mano de obra"
                value={costoManoObra}
                onChange={setCostoManoObra}
                min={0}
              />

              <div className="grid grid-cols-3 gap-3">
                <NumberField
                  label="Ayudantes"
                  value={numeroAyudantes}
                  onChange={setNumeroAyudantes}
                  min={0}
                />

                <NumberField
                  label="Costo diario"
                  value={costoDiarioAyudante}
                  onChange={setCostoDiarioAyudante}
                  min={0}
                />

                <NumberField
                  label="Días"
                  value={diasTrabajo}
                  onChange={setDiasTrabajo}
                  min={1}
                />
              </div>

              <p className="rounded-xl bg-[#F7F7F5] p-4 text-sm">
                Total ayudantes:{' '}
                <strong>{money(totalAyudantes)}</strong>
              </p>
            </Section>

            <Section title="Otros costos">
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Herramientas"
                  value={costoHerramientas}
                  onChange={setCostoHerramientas}
                  min={0}
                />

                <NumberField
                  label="Viáticos"
                  value={costoViaticos}
                  onChange={setCostoViaticos}
                  min={0}
                />
              </div>

              <NumberField
                label="Otros costos"
                value={otrosCostos}
                onChange={setOtrosCostos}
                min={0}
              />

              <InputField
                label="Descripción de otros costos"
                value={descripcionOtrosCostos}
                onChange={setDescripcionOtrosCostos}
              />
            </Section>

            <Section title="Tiempo y garantía">
              <InputField
                label="Tiempo estimado"
                value={tiempoEstimado}
                onChange={setTiempoEstimado}
                placeholder="Ej. 3 días hábiles"
              />

              <InputField
                label="Garantía ofrecida"
                value={garantiaOfrecida}
                onChange={setGarantiaOfrecida}
                placeholder="Ej. 90 días"
              />
            </Section>

            <Section title="Incluye">
              <Checkbox
                label="Material"
                checked={incluyeMaterial}
                onChange={setIncluyeMaterial}
              />

              <Checkbox
                label="Herramienta"
                checked={incluyeHerramienta}
                onChange={setIncluyeHerramienta}
              />

              <Checkbox
                label="Protección de muebles"
                checked={incluyeProteccionMuebles}
                onChange={setIncluyeProteccionMuebles}
              />

              <Checkbox
                label="Limpieza final"
                checked={incluyeLimpiezaFinal}
                onChange={setIncluyeLimpiezaFinal}
              />

              <Checkbox
                label="Retiro de escombro"
                checked={incluyeRetiroEscombro}
                onChange={setIncluyeRetiroEscombro}
              />

              <Checkbox
                label="Equipo de seguridad"
                checked={incluyeEquipoSeguridad}
                onChange={setIncluyeEquipoSeguridad}
              />
            </Section>

            <Section title="Observaciones">
              <textarea
                value={observaciones}
                onChange={(event) =>
                  setObservaciones(event.target.value)
                }
                rows={5}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
              />
            </Section>

            {message && (
              <p className="rounded-xl bg-[#F7F7F5] p-3 text-sm">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !serviceId}
              className="w-full rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold disabled:opacity-50"
            >
              {saving
                ? 'Enviando...'
                : 'Enviar cotización al supervisor'}
            </button>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="sticky top-6 rounded-2xl bg-[#0F3D36] p-6 text-white shadow-sm">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">
              RESUMEN DE COSTOS
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Total interno
            </h2>

            <div className="mt-6 space-y-3 text-sm">
              <CostRow
                label="Mano de obra"
                value={costoManoObra}
              />

              <CostRow
                label="Materiales"
                value={totalMateriales}
              />

              <CostRow
                label="Ayudantes"
                value={totalAyudantes}
              />

              <CostRow
                label="Herramientas"
                value={costoHerramientas}
              />

              <CostRow
                label="Viáticos"
                value={costoViaticos}
              />

              <CostRow
                label="Otros costos"
                value={otrosCostos}
              />
            </div>

            <div className="mt-6 border-t border-white/20 pt-5">
              <p className="text-sm text-white/70">
                Costo total contratista
              </p>

              <p className="mt-1 text-4xl font-semibold text-[#D4AF37]">
                {money(costoTotalContratista)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Cotizaciones enviadas
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {quotes.length} cotización(es)
            </p>

            <div className="mt-5 space-y-3">
              {quotes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No hay cotizaciones enviadas.
                </p>
              ) : (
                quotes.map((quote) => (
                  <article
                    key={quote.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[#0F3D36]">
                        {quote.data.folioCotizacion}
                      </p>

                      <span className="rounded-full bg-[#F4E6AF] px-3 py-1 text-xs">
                        Pendiente
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-medium">
                      {quote.data.clienteNombre}
                    </p>

                    <p className="text-sm text-gray-500">
                      {quote.data.tipoServicio}
                    </p>

                    <p className="mt-3 text-lg font-semibold">
                      {money(
                        quote.data.costoTotalContratista,
                      )}
                    </p>
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
  placeholder?: string
}

function InputField({
  label,
  value,
  onChange,
  placeholder = '',
}: InputFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type="text"
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
