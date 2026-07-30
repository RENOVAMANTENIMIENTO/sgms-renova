'use client'

import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    window.location.replace('/login')
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0F3D36] text-white">
      Cargando SGMS Digital...
    </main>
  )
}
