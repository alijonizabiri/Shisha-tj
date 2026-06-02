export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ru-TJ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}
