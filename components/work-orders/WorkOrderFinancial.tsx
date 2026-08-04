type WorkOrderFinancialProps = {
  montoAnticipo: number
  saldoPendiente: number
}

function money(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value || 0)
}

export function WorkOrderFinancial({
  montoAnticipo,
  saldoPendiente,
}: WorkOrderFinancialProps) {
  return (
    <div className="rounded-xl bg-[#F7F7F5] p-4 text-sm">
      <p className="flex justify-between gap-4">
        <span>Anticipo</span>
        <strong>{money(montoAnticipo)}</strong>
      </p>

      <p className="mt-3 flex justify-between gap-4">
        <span>Saldo</span>
        <strong>{money(saldoPendiente)}</strong>
      </p>
    </div>
  )
}
