'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setLoading(true)
  setMessage('')

  const { data: authData, error: loginError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  if (loginError || !authData.user) {
    setMessage('Correo o contraseña incorrectos.')
    setLoading(false)
    return
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single()

  if (profileError || !profile) {
    setMessage('El usuario no tiene un perfil asignado.')
    await supabase.auth.signOut()
    setLoading(false)
    return
  }

  if (profile.role === 'contratista') {
    window.location.replace('/agenda')
    return
  }

  window.location.replace('/dashboard')
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F3D36] px-6">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F3D36] text-2xl font-bold text-[#D4AF37]">
            R
          </div>

          <h1 className="text-3xl font-semibold text-[#1B1F1E]">
            SGMS Digital
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Sistema de Gestión RENOVA
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Correo electrónico
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
              placeholder="usuario@renova.mx"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Contraseña
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold text-[#1B1F1E] disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  )
}
