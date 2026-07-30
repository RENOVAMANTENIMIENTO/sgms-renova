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

type ServiceStatus =
  | 'nuevo'
  | 'visita_programada'
  | 'cotizando'
  | 'esperando_aprobacion'
  | 'programado'
  | 'en_proceso'
  | 'terminado'
  | 'garantia'

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
  fechaDeseada: string
  horario: string
  asesor: string
  contratista?: string
  contratistaId?: string
  fechaVisita?: string
  horaVisita?: string
  observacionesVisita?: string
  clienteConfirmado?: boolean
  contratistaConfirmado?: boolean
  visitaRealizada?: boolean
  estado: ServiceStatus
}

type ServiceRecord = {
  id: string
  data: ServiceData
  assigned_to: string | null
  created_at: string
}

type ContractorProfile = {
  id: string
  full_name: string
  role: string
}

type Profile = {
  full_name: string
  role: 'supervisor' | 'vendedor' | 'contratista'
}

type AgendaForm = {
  serviceId: string
  contractorId: string
  fechaVisita: string
  horaVisita: string
  observacionesVisita: string
  clienteConfirmado: boolean
  contratistaConfirmado: boolean
}

const emptyForm: AgendaForm = {
  serviceId: '',
  contractorId: '',
  fechaVisita: '',
  horaVisita: '',
  observacionesVisita: '',
  clienteConfirmado: false,
  contratistaConfirmado: false,
}

export default function AgendaPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [contractors, setContractors] = useState<ContractorProfile[]>([])
  const [form, setForm] = useState<AgendaForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    const { data: contractorData, error: contractorError } =
      await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'contratista')
        .order('full_name')

    if (contractorError) {
      setMessage(
        `No fue posible cargar contratistas: ${contractorError.message}`,
      )
    } else {
      setContractors(
        (contractorData || []) as ContractorProfile[],
      )
    }

    let serviceQuery = supabase
      .from('sgms_records')
      .select('id, data, assigned_to, created_at')
      .eq('module', 'servicios')
      .order('created_at', { ascending: false })

    if (profileData?.role === 'contratista') {
      serviceQuery = serviceQuery.eq('assigned_to', user.id)
    }

    const { data: serviceData, error: serviceError } =
      await serviceQuery

    if (serviceError) {
      setMessage(
        `No fue posible cargar servicios: ${serviceError.message}`,
      )
    } else {
      setServices((serviceData || []) as ServiceRecord[])
    }

    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function updateField<K extends keyof AgendaForm>(
    field: K,
    value: AgendaForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const selectedService = services.find(
      (service) => service.id === form.serviceId,
    )

    const selectedContractor = contractors.find(
      (contractor) => contractor.id === form.contractorId,
    )

    if (!selectedService || !selectedContractor) {
      setMessage('Selecciona un servicio y un contratista.')
      setSaving(false)
      return
    }

    const updatedData: ServiceData = {
      ...selectedService.data,
      contratista: selectedContractor.full_name,
      contratistaId: selectedContractor.id,
      fechaVisita: form.fechaVisita,
      horaVisita: form.horaVisita,
      observacionesVisita: form.observacionesVisita,
      clienteConfirmado: form.clienteConfirmado,
      contratistaConfirmado: form.contratistaConfirmado,
      estado: 'visita_programada',
    }

    const { error } = await supabase
      .from('sgms_records')
      .update({
        data: updatedData,
        assigned_to: selectedContractor.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedService.id)

    if (error) {
      setMessage(`No se pudo programar la visita: ${error.message}`)
    } else {
      setMessage('Visita programada y contratista asignado.')
      setForm(emptyForm)
      await loadData()
    }

    setSaving(false)
  }

  async function markVisitCompleted(service: ServiceRecord) {
    const { error } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...service.data,
          visitaRealizada: true,
          estado: 'cotizando',
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', service.id)

    if (error) {
      setMessage(`No se pudo actualizar la visita: ${error.message}`)
    } else {
      setMessage('Visita marcada como realizada.')
      await loadData()
    }
  }

  async function confirmContractor(service: ServiceRecord) {
    const { error } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...service.data,
          contratistaConfirmado: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', service.id)

    if (error) {
      setMessage(`No se pudo confirmar: ${error.message}`)
    } else {
      setMessage('Visita confirmada por el contratista.')
      await loadData()
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const selectedService = services.find(
    (service) => service.id === form.serviceId,
  )

  const scheduledServices = services.filter((service) => {
    const text = [
      service.data.folio,
      service.data.clienteNombre,
      service.data.contratista,
      service.data.tipoServicio,
      service.data.fechaVisita,
    ]
      .join(' ')
      .toLowerCase()

    const isScheduled = Boolean(service.data.fechaVisita)

    return (
      isScheduled &&
      text.includes(search.toLowerCase())
    )
  })

  const availableServices = services.filter(
    (service) =>
      service.data.estado === 'nuevo' ||
      service.data.estado === 'visita_programada',
  )

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F3D36]">
        <p className="text-white">Cargando agenda...</p>
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
              Agenda de Visitas
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push('/servicios')}
              className="rounded-xl border border-white/30 px-4 py-2 text-sm"
            >
              Servicios
            </button>

            <button
              type="button"
              onClick={() => router.push('/')}
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
        {profile?.role === 'supervisor' && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Programar visita
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Asigna un contratista al servicio.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <SelectField
                label="Servicio *"
                value={form.serviceId}
                onChange={(value) =>
                  updateField('serviceId', value)
                }
                required
              >
                <option value="">Seleccionar servicio</option>

                {availableServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.data.folio} —{' '}
                    {service.data.clienteNombre}
                  </option>
                ))}
              </SelectField>

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
                    <strong>Dirección:</strong>{' '}
                    {selectedService.data.direccion}
                  </p>

                  <p className="mt-1">
                    <strong>WhatsApp:</strong>{' '}
                    {selectedService.data.whatsapp}
                  </p>
                </div>
              )}

              <SelectField
                label="Contratista *"
                value={form.contractorId}
                onChange={(value) =>
                  updateField('contractorId', value)
                }
                required
              >
                <option value="">Seleccionar contratista</option>

                {contractors.map((contractor) => (
                  <option key={contractor.id} value={contractor.id}>
                    {contractor.full_name}
                  </option>
                ))}
              </SelectField>

              {contractors.length === 0 && (
                <p className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                  No hay usuarios con rol de contratista.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Fecha de visita *"
                  type="date"
                  value={form.fechaVisita}
                  onChange={(value) =>
                    updateField('fechaVisita', value)
                  }
                  required
                />

                <InputField
                  label="Hora *"
                  type="time"
                  value={form.horaVisita}
                  onChange={(value) =>
                    updateField('horaVisita', value)
                  }
                  required
                />
              </div>

              <TextAreaField
                label="Observaciones para la visita"
                value={form.observacionesVisita}
                onChange={(value) =>
                  updateField('observacionesVisita', value)
                }
              />

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={form.clienteConfirmado}
                  onChange={(event) =>
                    updateField(
                      'clienteConfirmado',
                      event.target.checked,
                    )
                  }
                />

                Cliente confirmado
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={form.contratistaConfirmado}
                  onChange={(event) =>
                    updateField(
                      'contratistaConfirmado',
                      event.target.checked,
                    )
                  }
                />

                Contratista confirmado
              </label>

              {message && (
                <p className="rounded-xl bg-[#F7F7F5] p-3 text-sm">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold disabled:opacity-60"
              >
                {saving
                  ? 'Programando...'
                  : 'Programar visita'}
              </button>
            </form>
          </section>
        )}

        <section
          className={`rounded-2xl bg-white p-6 shadow-sm ${
            profile?.role !== 'supervisor'
              ? 'xl:col-span-2'
              : ''
          }`}
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold">
                {profile?.role === 'contratista'
                  ? 'Mis visitas asignadas'
                  : 'Visitas programadas'}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {scheduledServices.length} visita(s)
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar visita..."
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
            />
          </div>

          {message && profile?.role !== 'supervisor' && (
            <p className="mt-5 rounded-xl bg-[#F7F7F5] p-3 text-sm">
              {message}
            </p>
          )}

          <div className="mt-6 space-y-4">
            {scheduledServices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center">
                <p className="font-medium text-[#0F3D36]">
                  No hay visitas programadas
                </p>
              </div>
            ) : (
              scheduledServices.map((service) => (
                <article
                  key={service.id}
                  className="rounded-2xl border border-gray-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-[#0F3D36]">
                          {service.data.folio}
                        </h3>

                        <span className="rounded-full bg-[#F4E6AF] px-3 py-1 text-xs font-medium">
                          {service.data.visitaRealizada
                            ? 'Visita realizada'
                            : 'Visita programada'}
                        </span>
                      </div>

                      <p className="mt-3 font-semibold">
                        {service.data.clienteNombre}
                      </p>

                      <p className="text-sm text-gray-500">
                        {service.data.tipoServicio}
                      </p>

                      <div className="mt-4 space-y-1 text-sm">
                        <p>
                          <strong>Fecha:</strong>{' '}
                          {service.data.fechaVisita}
                        </p>

                        <p>
                          <strong>Hora:</strong>{' '}
                          {service.data.horaVisita}
                        </p>

                        <p>
                          <strong>Contratista:</strong>{' '}
                          {service.data.contratista}
                        </p>

                        <p>
                          <strong>Teléfono:</strong>{' '}
                          {service.data.telefono}
                        </p>

                        <p>
                          <strong>WhatsApp:</strong>{' '}
                          {service.data.whatsapp}
                        </p>

                        <p>
                          <strong>Dirección:</strong>{' '}
                          {service.data.direccion}
                        </p>

                        {service.data.observacionesVisita && (
                          <p>
                            <strong>Observaciones:</strong>{' '}
                            {service.data.observacionesVisita}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="min-w-56 space-y-3">
                      {service.data.whatsapp && (
                        <a
                          href={`https://wa.me/52${service.data.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg bg-[#0F3D36] px-3 py-2 text-center text-sm text-white"
                        >
                          Contactar cliente
                        </a>
                      )}

                      {service.data.ubicacion && (
                        <a
                          href={service.data.ubicacion}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg border border-gray-300 px-3 py-2 text-center text-sm"
                        >
                          Abrir ubicación
                        </a>
                      )}

                      {profile?.role === 'contratista' &&
                        !service.data.contratistaConfirmado && (
                          <button
                            type="button"
                            onClick={() =>
                              confirmContractor(service)
                            }
                            className="w-full rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-semibold"
                          >
                            Confirmar visita
                          </button>
                        )}

                      {(profile?.role === 'supervisor' ||
                        profile?.role === 'contratista') &&
                        !service.data.visitaRealizada && (
                          <button
                            type="button"
                            onClick={() =>
                              markVisitCompleted(service)
                            }
                            className="w-full rounded-lg border border-[#0F3D36] px-3 py-2 text-sm text-[#0F3D36]"
                          >
                            Marcar visita realizada
                          </button>
                        )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

type InputFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: InputFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
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
        onChange={(event) => onChange(event.target.value)}
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
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
      />
    </div>
  )
}
