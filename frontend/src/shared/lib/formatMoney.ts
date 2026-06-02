export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-TJ', {
    style: 'currency',
    currency: 'TJS',
    minimumFractionDigits: 2,
  }).format(amount)
}
