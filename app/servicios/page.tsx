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

type ClientData = {
  nombre?: string
  empresa?: string
  telefono?: string
  whatsapp?: string
  correo?: string
  direccion?: string
  colonia?: string
  municipio?: string
  codigoPostal?: string
  ubicacion?: string
}

type ClientRecord = {
  id: string
  data: ClientData
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
  areaAproximada: string
  altura: string
  fotografiasRecibidas: boolean
  cantidadFotografias: string
  fechaDeseada: string
  horario: string
  comoNosConocio: string
  observaciones: string
  sucursal: string
  asesor: string
  contratista: string
  fechaVisita: string
  estado: ServiceStatus
}

type ServiceStatus =
  | 'nuevo'
  | 'visita_programada'
  | 'cotizando'
  | 'esperando_aprobacion'
  | 'programado'
  | 'en_proceso'
  | 'terminado'
  | 'garantia'

type ServiceRecord = {
  id: string
  data: ServiceData
  created_at: string
}

type Profile = {
  full_name: string
  role: 'supervisor' | 'vendedor' | 'contratista'
}

const emptyForm: ServiceData = {
  folio: '',
  clienteId: '',
  clienteNombre: '',
  telefono: '',
  whatsapp: '',
  direccion: '',
  ubicacion: '',
  tipoServicio: '',
  descripcion: '',
  areaAproximada: '',
  altura: '',
  fotografiasRecibidas: false,
  cantidadFotografias: '',
  fechaDeseada: '',
  horario: '',
  comoNosConocio: '',
  observaciones: '',
  sucursal: '',
  asesor: '',
  contratista: '',
  fechaVisita: '',
  estado: 'nuevo',
}

const statusLabels: Record<ServiceStatus, string> = {
  nuevo: 'Nuevo',
  visita_programada: 'Visita programada',
  cotizando: 'Cotizando',
  esperando_aprobacion: 'Esperando aprobación',
  programado: 'Programado',
  en_proceso: 'En proceso',
  terminado: 'Terminado',
  garantia: 'Garantía',
}

export default function ServiciosPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [form, setForm] = useState<ServiceData>(emptyForm)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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

    const { data: clientData, error: clientError } = await supabase
      .from('sgms_records')
      .select('id, data')
      .eq('module', 'clientes')
      .order('created_at', { ascending: false })

    if (clientError) {
      setMessage(`No fue posible cargar clientes: ${clientError.message}`)
    } else {
      setClients((clientData || []) as ClientRecord[])
    }

    const { data: serviceData, error: serviceError } = await supabase
      .from('sgms_records')
      .select('id, data, created_at')
      .eq('module', 'servicios')
      .order('created_at', { ascending: false })

    if (serviceError) {
      setMessage(`No fue posible cargar servicios: ${serviceError.message}`)
    } else {
      setServices((serviceData || []) as ServiceRecord[])
    }

    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function updateField<K extends keyof ServiceData>(
    field: K,
    value: ServiceData[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function generateFolio() {
    const year = new Date().getFullYear()
    const reference = Date.now().toString().slice(-6)

    return `REN-${year}-${reference}`
  }

  function selectClient(clientId: string) {
    const selected = clients.find((client) => client.id === clientId)

    if (!selected) {
      setForm((current) => ({
        ...current,
        clienteId: '',
        clienteNombre: '',
        telefono: '',
        whatsapp: '',
        direccion: '',
        ubicacion: '',
      }))
      return
    }

    const address = [
      selected.data.direccion,
      selected.data.colonia,
      selected.data.municipio,
    ]
      .filter(Boolean)
      .join(', ')

    setForm((current) => ({
      ...current,
      clienteId: selected.id,
      clienteNombre: selected.data.nombre || '',
      telefono: selected.data.telefono || '',
      whatsapp: selected.data.whatsapp || '',
      direccion: address,
      ubicacion: selected.data.ubicacion || '',
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/login')
      return
    }

    const serviceToSave: ServiceData = {
      ...form,
      folio: generateFolio(),
      asesor: form.asesor || profile?.full_name || '',
      estado: 'nuevo',
    }

    const { error } = await supabase.from('sgms_records').insert({
      module: 'servicios',
      data: serviceToSave,
      created_by: user.id,
    })

    if (error) {
      setMessage(`No se pudo registrar el servicio: ${error.message}`)
    } else {
      setMessage('Solicitud de servicio registrada correctamente.')
      setForm({
        ...emptyForm,
        asesor: profile?.full_name || '',
      })
      await loadData()
    }

    setSaving(false)
  }

  async function updateStatus(id: string, status: ServiceStatus) {
    const selected = services.find((service) => service.id === id)

    if (!selected) return

    const { error } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...selected.data,
          estado: status,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setMessage(`No se pudo cambiar el estado: ${error.message}`)
    } else {
      setMessage('Estado actualizado.')
      await loadData()
    }
  }

  async function deleteService(id: string) {
    const confirmed = window.confirm(
      '¿Seguro que deseas eliminar esta solicitud?',
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('sgms_records')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage(`No se pudo eliminar: ${error.message}`)
    } else {
      setMessage('Solicitud eliminada.')
      await loadData()
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const filteredServices = services.filter((service) => {
    const text = [
      service.data.folio,
      service.data.clienteNombre,
      service.data.tipoServicio,
      service.data.descripcion,
      service.data.estado,
    ]
      .join(' ')
      .toLowerCase()

    return text.includes(search.toLowerCase())
  })

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F3D36]">
        <p className="text-white">Cargando servicios...</p>
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
              Solicitudes de Servicio
            </h1>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/clientes')}
              className="rounded-xl border border-white/30 px-4 py-2 text-sm"
            >
              Clientes
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

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 xl:grid-cols-[460px_1fr] lg:px-10">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Nueva solicitud</h2>

          <p className="mt-1 text-sm text-gray-500">
            Captura la información inicial del servicio.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <SelectField
              label="Cliente registrado *"
              value={form.clienteId}
              onChange={selectClient}
              required
            >
              <option value="">Seleccionar cliente</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.data.nombre || 'Cliente sin nombre'}
                </option>
              ))}
            </SelectField>

            <div className="rounded-xl bg-[#F7F7F5] p-4 text-sm">
              <p>
                <strong>Cliente:</strong>{' '}
                {form.clienteNombre || 'Sin seleccionar'}
              </p>
              <p className="mt-1">
                <strong>WhatsApp:</strong>{' '}
                {form.whatsapp || 'No registrado'}
              </p>
              <p className="mt-1">
                <strong>Dirección:</strong>{' '}
                {form.direccion || 'No registrada'}
              </p>
            </div>

            <SelectField
              label="Tipo de servicio *"
              value={form.tipoServicio}
              onChange={(value) => updateField('tipoServicio', value)}
              required
            >
              <option value="">Seleccionar servicio</option>
              <option value="Pintura interior">Pintura interior</option>
              <option value="Pintura exterior">Pintura exterior</option>
              <option value="Impermeabilización">Impermeabilización</option>
              <option value="Plomería">Plomería</option>
              <option value="Electricidad">Electricidad</option>
              <option value="Mantenimiento de aire">
                Mantenimiento de aire
              </option>
              <option value="Instalación de pisos">
                Instalación de pisos
              </option>
              <option value="Mantenimiento general">
                Mantenimiento general
              </option>
              <option value="Otro">Otro</option>
            </SelectField>

            <TextAreaField
              label="Descripción del trabajo *"
              value={form.descripcion}
              onChange={(value) => updateField('descripcion', value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Área aproximada"
                value={form.areaAproximada}
                onChange={(value) =>
                  updateField('areaAproximada', value)
                }
                placeholder="Ej. 120 m²"
              />

              <InputField
                label="Altura"
                value={form.altura}
                onChange={(value) => updateField('altura', value)}
                placeholder="Ej. 3 metros"
              />
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.fotografiasRecibidas}
                  onChange={(event) =>
                    updateField(
                      'fotografiasRecibidas',
                      event.target.checked,
                    )
                  }
                />
                Fotografías recibidas
              </label>

              {form.fotografiasRecibidas && (
                <div className="mt-3">
                  <InputField
                    label="Cantidad de fotografías"
                    type="number"
                    value={form.cantidadFotografias}
                    onChange={(value) =>
                      updateField('cantidadFotografias', value)
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Fecha deseada"
                type="date"
                value={form.fechaDeseada}
                onChange={(value) => updateField('fechaDeseada', value)}
              />

              <InputField
                label="Horario"
                type="time"
                value={form.horario}
                onChange={(value) => updateField('horario', value)}
              />
            </div>

            <SelectField
              label="¿Cómo nos conoció?"
              value={form.comoNosConocio}
              onChange={(value) =>
                updateField('comoNosConocio', value)
              }
            >
              <option value="">Seleccionar opción</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Recomendación">Recomendación</option>
              <option value="Sucursal Mayfer">Sucursal Mayfer</option>
              <option value="Cliente anterior">Cliente anterior</option>
              <option value="Otro">Otro</option>
            </SelectField>

            <SelectField
              label="Sucursal"
              value={form.sucursal}
              onChange={(value) => updateField('sucursal', value)}
            >
              <option value="">Seleccionar sucursal</option>
              <option value="Matriz">Matriz</option>
              <option value="Tajito">Tajito</option>
              <option value="Fuentes">Fuentes</option>
            </SelectField>

            <TextAreaField
              label="Observaciones"
              value={form.observaciones}
              onChange={(value) => updateField('observaciones', value)}
            />

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
              {saving ? 'Guardando...' : 'Registrar solicitud'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold">
                Servicios registrados
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {services.length} solicitud(es)
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar folio o cliente..."
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="mt-6 space-y-4">
            {filteredServices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center">
                <p className="font-medium text-[#0F3D36]">
                  No hay servicios para mostrar
                </p>
              </div>
            ) : (
              filteredServices.map((service) => (
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
                          {statusLabels[service.data.estado || 'nuevo']}
                        </span>
                      </div>

                      <p className="mt-2 font-medium">
                        {service.data.clienteNombre}
                      </p>

                      <p className="text-sm text-gray-500">
                        {service.data.tipoServicio}
                      </p>

                      <p className="mt-3 text-sm">
                        {service.data.descripcion}
                      </p>

                      <div className="mt-4 space-y-1 text-sm">
                        <p>
                          <strong>WhatsApp:</strong>{' '}
                          {service.data.whatsapp || 'No registrado'}
                        </p>

                        <p>
                          <strong>Fecha deseada:</strong>{' '}
                          {service.data.fechaDeseada || 'Sin definir'}
                        </p>

                        <p>
                          <strong>Asesor:</strong>{' '}
                          {service.data.asesor || 'Sin asignar'}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-52 space-y-3">
                      {profile?.role === 'supervisor' && (
                        <select
                          value={service.data.estado || 'nuevo'}
                          onChange={(event) =>
                            updateStatus(
                              service.id,
                              event.target.value as ServiceStatus,
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          {Object.entries(statusLabels).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      )}

                      {service.data.whatsapp && (
                        <a
                          href={`https://wa.me/52${service.data.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg bg-[#0F3D36] px-3 py-2 text-center text-sm text-white"
                        >
                          Contactar por WhatsApp
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

                      {profile?.role === 'supervisor' && (
                        <button
                          type="button"
                          onClick={() => deleteService(service.id)}
                          className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                        >
                          Eliminar
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
  placeholder?: string
  required?: boolean
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
}: InputFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
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
      <label className="mb-2 block text-sm font-medium">{label}</label>

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
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <textarea
        value={value}
        required={required}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
      />
    </div>
  )
}
