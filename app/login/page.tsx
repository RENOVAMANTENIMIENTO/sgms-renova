'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  full_name: string | null
  role: 'supervisor' | 'vendedor' | 'contratista' | null
}

const menu = [
  'Dashboard',
  'Clientes',
  'Servicios',
  'Agenda',
  'Cotizaciones',
  'Contratistas',
  'Materiales',
  'Evidencias',
  'Pagos',
  'Garantías',
  'Reportes',
]

const cards = [
  { label: 'Servicios activos', value: '0' },
  { label: 'Cotizaciones pendientes', value: '0' },
  { label: 'En proceso', value: '0' },
  { label: 'Terminados', value: '0', featured: true },
  { label: 'Garantías pendientes', value: '0' },
  { label: 'Ingresos del mes', value: '$0' },
]

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.replace('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }

    void loadUser()
  }, [router, supabase])

  async function handleLogout() {
    await supabase.auth.signOut({ scope: 'local' })
    router.replace('/login')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F3D36]">
        <p className="text-lg text-white">Cargando SGMS Digital...</p>
      </main>
    )
  }

  const name = profile?.full_name || 'Usuario RENOVA'
  const role = profile?.role || 'usuario'

  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#1B1F1E]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col bg-[#0F3D36] px-6 py-7 text-white lg:flex">
          <div className="mb-9">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4AF37] text-3xl font-bold text-[#D4AF37]">
              R
            </div>

            <h1 className="text-2xl font-semibold tracking-[0.22em]">
              RENOVA
            </h1>

            <p className="mt-1 text-xs tracking-[0.15em] text-[#D4AF37]">
              ACABADOS Y MANTENIMIENTO
            </p>
          </div>

          <nav className="space-y-1">
            {menu.map((item, index) => (
              <button
                key={item}
                type="button"
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                  index === 0
                    ? 'bg-[#D4AF37] font-semibold text-[#1B1F1E]'
                    : 'hover:bg-white/10'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-[#D4AF37]/70 p-4">
            <p className="font-semibold">{name}</p>
            <p className="mt-1 capitalize text-[#D4AF37]">{role}</p>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 text-sm text-white/80 hover:text-white"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        <section className="flex-1 px-5 py-6 md:px-8 lg:px-10">
          <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[#D4AF37]">
                SGMS Digital
              </p>

              <h2 className="mt-1 text-3xl font-semibold">
                Bienvenido,{' '}
                <span className="text-[#0F3D36]">{name}</span>
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Aquí tienes el resumen general de RENOVA.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm capitalize shadow-sm">
                {role}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-[#0F3D36] px-4 py-3 text-sm font-medium text-white lg:hidden"
              >
                Salir
              </button>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {cards.map((card) => (
              <article
                key={card.label}
                className={`rounded-2xl p-5 shadow-sm ${
                  card.featured
                    ? 'bg-[#D4AF37] text-[#1B1F1E]'
                    : 'bg-[#0F3D36] text-white'
                }`}
              >
                <p className="text-3xl font-semibold">{card.value}</p>
                <p className="mt-2 text-sm">{card.label}</p>
                <p className="mt-6 text-xs opacity-80">Ver detalles →</p>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Servicios recientes
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Aquí aparecerán los servicios registrados.
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold"
                >
                  + Nuevo servicio
                </button>
              </div>

              <div className="mt-8 rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center">
                <p className="font-medium text-[#0F3D36]">
                  Todavía no hay servicios
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  El primer servicio se mostrará aquí.
                </p>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Agenda de hoy</h3>
              <p className="mt-1 text-sm text-gray-500">
                Visitas y trabajos programados.
              </p>

              <div className="mt-8 rounded-2xl bg-[#F7F7F5] px-5 py-10 text-center">
                <p className="font-medium text-[#0F3D36]">
                  Sin actividades programadas
                </p>
              </div>
            </article>
          </section>

          <footer className="mt-6 rounded-2xl bg-[#0F3D36] px-7 py-7 text-white shadow-sm">
            <p className="text-xl font-semibold tracking-[0.12em]">
              RENOVA
            </p>
            <p className="mt-2">
              Transformamos espacios,{' '}
              <span className="text-[#D4AF37]">renovamos tu vida.</span>
            </p>
          </footer>
        </section>
      </div>
    </main>
  )
}