'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ClientData = {
  nombre: string
  empresa: string
  telefono: string
  whatsapp: string
  correo: string
  direccion: string
  colonia: string
  municipio: string
  codigoPostal: string
  ubicacion: string
  observaciones: string
}

type ClientRecord = {
  id: string
  data: ClientData
  created_at: string
}

type Profile = {
  full_name: string
  role: 'supervisor' | 'vendedor' | 'contratista'
}

const emptyForm: ClientData = {
  nombre: '',
  empresa: '',
  telefono: '',
  whatsapp: '',
  correo: '',
  direccion: '',
  colonia: '',
  municipio: '',
  codigoPostal: '',
  ubicacion: '',
  observaciones: '',
}

export default function ClientesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [form, setForm] = useState<ClientData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadClients = useCallback(async () => {
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

    const { data, error } = await supabase
      .from('sgms_records')
      .select('id, data, created_at')
      .eq('module', 'clientes')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(`No fue posible cargar los clientes: ${error.message}`)
    } else {
      setClients((data || []) as ClientRecord[])
    }

    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    void loadClients()
  }, [loadClients])

  function updateField(field: keyof ClientData, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
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

    if (editingId) {
      const { error } = await supabase
        .from('sgms_records')
        .update({
          data: form,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)

      if (error) {
        setMessage(`No se pudo actualizar: ${error.message}`)
      } else {
        setMessage('Cliente actualizado correctamente.')
        resetForm()
        await loadClients()
      }
    } else {
      const { error } = await supabase.from('sgms_records').insert({
        module: 'clientes',
        data: form,
        created_by: user.id,
      })

      if (error) {
        setMessage(`No se pudo guardar: ${error.message}`)
      } else {
        setMessage('Cliente registrado correctamente.')
        resetForm()
        await loadClients()
      }
    }

    setSaving(false)
  }

  function editClient(client: ClientRecord) {
    setEditingId(client.id)
    setForm({
      ...emptyForm,
      ...client.data,
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function deleteClient(id: string) {
    const confirmed = window.confirm(
      '¿Seguro que deseas eliminar este cliente?',
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('sgms_records')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage(`No se pudo eliminar: ${error.message}`)
    } else {
      setMessage('Cliente eliminado.')
      await loadClients()
    }
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const filteredClients = clients.filter((client) => {
    const text = [
      client.data.nombre,
      client.data.empresa,
      client.data.telefono,
      client.data.whatsapp,
      client.data.municipio,
    ]
      .join(' ')
      .toLowerCase()

    return text.includes(search.toLowerCase())
  })

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F3D36]">
        <p className="text-white">Cargando clientes...</p>
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
              Clientes RENOVA
            </h1>
          </div>

          <div className="flex gap-3">
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

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[420px_1fr] lg:px-10">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            {editingId ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Registra los datos que aparecen en la Solicitud de Servicio.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Nombre del cliente *"
              value={form.nombre}
              onChange={(value) => updateField('nombre', value)}
              required
            />

            <Input
              label="Empresa"
              value={form.empresa}
              onChange={(value) => updateField('empresa', value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Teléfono"
                value={form.telefono}
                onChange={(value) => updateField('telefono', value)}
              />

              <Input
                label="WhatsApp"
                value={form.whatsapp}
                onChange={(value) => updateField('whatsapp', value)}
              />
            </div>

            <Input
              label="Correo"
              type="email"
              value={form.correo}
              onChange={(value) => updateField('correo', value)}
            />

            <Input
              label="Dirección"
              value={form.direccion}
              onChange={(value) => updateField('direccion', value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Colonia"
                value={form.colonia}
                onChange={(value) => updateField('colonia', value)}
              />

              <Input
                label="Municipio"
                value={form.municipio}
                onChange={(value) => updateField('municipio', value)}
              />
            </div>

            <Input
              label="Código postal"
              value={form.codigoPostal}
              onChange={(value) => updateField('codigoPostal', value)}
            />

            <Input
              label="Enlace de ubicación"
              value={form.ubicacion}
              onChange={(value) => updateField('ubicacion', value)}
              placeholder="Enlace de Google Maps"
            />

            <div>
              <label className="mb-2 block text-sm font-medium">
                Observaciones
              </label>

              <textarea
                value={form.observaciones}
                onChange={(event) =>
                  updateField('observaciones', event.target.value)
                }
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
              />
            </div>

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
                ? 'Guardando...'
                : editingId
                  ? 'Guardar cambios'
                  : 'Registrar cliente'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              >
                Cancelar edición
              </button>
            )}
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold">Directorio de clientes</h2>
              <p className="mt-1 text-sm text-gray-500">
                {clients.length} cliente(s) registrado(s)
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente..."
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="mt-6 space-y-4">
            {filteredClients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center">
                <p className="font-medium text-[#0F3D36]">
                  No hay clientes para mostrar
                </p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <article
                  key={client.id}
                  className="rounded-2xl border border-gray-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F3D36]">
                        {client.data.nombre}
                      </h3>

                      {client.data.empresa && (
                        <p className="text-sm text-gray-500">
                          {client.data.empresa}
                        </p>
                      )}

                      <div className="mt-3 space-y-1 text-sm">
                        <p>
                          <strong>WhatsApp:</strong>{' '}
                          {client.data.whatsapp || 'No registrado'}
                        </p>
                        <p>
                          <strong>Teléfono:</strong>{' '}
                          {client.data.telefono || 'No registrado'}
                        </p>
                        <p>
                          <strong>Dirección:</strong>{' '}
                          {[client.data.direccion, client.data.colonia]
                            .filter(Boolean)
                            .join(', ') || 'No registrada'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-start gap-2">
                      {client.data.whatsapp && (
                        <a
                          href={`https://wa.me/52${client.data.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-[#0F3D36] px-3 py-2 text-sm text-white"
                        >
                          WhatsApp
                        </a>
                      )}

                      {client.data.ubicacion && (
                        <a
                          href={client.data.ubicacion}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          Ubicación
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => editClient(client)}
                        className="rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-medium"
                      >
                        Editar
                      </button>

                      {profile?.role === 'supervisor' && (
                        <button
                          type="button"
                          onClick={() => deleteClient(client.id)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
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

type InputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
}: InputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
      />
    </div>
  )
}
