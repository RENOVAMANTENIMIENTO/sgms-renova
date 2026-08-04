'use client'

import { useCallback, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Profile,
  WorkOrderRecord,
} from '@/types/work-orders'

type UseWorkOrdersParams = {
  profile: Profile | null
  userId: string
}

export function useWorkOrders({
  profile,
  userId,
}: UseWorkOrdersParams) {
  const supabase = useMemo(() => createClient(), [])

  const [orders, setOrders] = useState<WorkOrderRecord[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [working, setWorking] = useState(false)

  const loadOrders = useCallback(async () => {
    if (!profile || !userId) {
      setOrders([])
      return
    }

    setLoadingOrders(true)
    setOrdersError('')

    let orderQuery = supabase
      .from('sgms_records')
      .select('id, data, assigned_to, created_at')
      .eq('module', 'ordenes_trabajo')
      .order('created_at', { ascending: false })

    if (profile.role === 'contratista') {
      orderQuery = orderQuery.eq('assigned_to', userId)
    }

    const {
      data: orderData,
      error: orderError,
    } = await orderQuery

    if (orderError) {
      setOrdersError(
        `No fue posible cargar órdenes: ${orderError.message}`,
      )
      setOrders([])
    } else {
      setOrders((orderData || []) as WorkOrderRecord[])
    }

    setLoadingOrders(false)
  }, [profile, userId, supabase])

  async function confirmOrder(order: WorkOrderRecord) {
    setWorking(true)

    const { error } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...order.data,
          estadoOrden: 'confirmada',
          confirmadaContratista: true,
          fechaConfirmacion: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (!error) {
      await loadOrders()
    }

    setWorking(false)
  }

  async function startWork(order: WorkOrderRecord) {
    setWorking(true)

    const { error } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...order.data,
          estadoOrden: 'en_proceso',
          confirmadaContratista: true,
          fechaConfirmacion:
            order.data.fechaConfirmacion ||
            new Date().toISOString(),
          fechaInicioReal: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (!error) {
      await loadOrders()
    }

    setWorking(false)
  }

  async function finishWork(order: WorkOrderRecord) {
    setWorking(true)

    const { error } = await supabase
      .from('sgms_records')
      .update({
        data: {
          ...order.data,
          estadoOrden: 'pendiente_entrega',
          fechaFinalizacionReal: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (!error) {
      await loadOrders()
    }

    setWorking(false)
  }

  return {
    orders,
    loadingOrders,
    ordersError,
    loadOrders,
    working,
    confirmOrder,
    startWork,
    finishWork,
  }
}
