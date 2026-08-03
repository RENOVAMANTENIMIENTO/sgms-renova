export type UserRole =
  | 'supervisor'
  | 'vendedor'
  | 'contratista'

export type Profile = {
  full_name: string
  role: UserRole
}

export type WorkOrderStatus =
  | 'emitida'
  | 'confirmada'
  | 'en_proceso'
  | 'pendiente_entrega'
  | 'pausada'
  | 'terminada'
  | 'cancelada'

export type WorkOrderData = {
  tipoRegistro: 'orden_trabajo'

  folioOrden: string
  servicioId: string
  folioServicio: string
  cotizacionOficialId: string
  folioCotizacionOficial: string

  clienteNombre: string
  telefono: string
  whatsapp: string
  direccion: string
  ubicacion: string

  tipoServicio: string
  descripcionTrabajo: string
  alcanceAutorizado: string
  materialesAutorizados: string

  contratistaId: string
  contratistaNombre: string
  numeroAyudantes: number

  fechaInicio: string
  fechaTerminoEstimada: string
  horaInicio: string
  horarioTrabajo: string
  duracionEstimada: string

  instruccionesEspeciales: string
  condicionesAcceso: string
  observaciones: string

  materialCompleto: boolean
  herramientaCompleta: boolean
  equipoSeguridad: boolean
  clienteAvisado: boolean
  anticipoRecibido: boolean
  accesoConfirmado: boolean

  precioTotalServicio: number
  montoAnticipo: number
  saldoPendiente: number

  estadoOrden: WorkOrderStatus
  confirmadaContratista: boolean
  fechaConfirmacion?: string
  fechaInicioReal?: string
  fechaFinalizacionReal?: string

  emitidaPor: string
  fechaEmision: string
}

export type WorkOrderRecord = {
  id: string
  data: WorkOrderData
  assigned_to: string | null
  created_at: string
}
