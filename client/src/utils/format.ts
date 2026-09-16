export function getStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    NOT_SUBMITTED: 'badge-not-submitted',
    SUBMITTED: 'badge-submitted',
    GRADED: 'badge-graded',
    PUBLISHED: 'badge-published'
  }
  return badges[status] || 'badge-not-submitted'
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export type DeadlineStatus = 'overdue' | 'today' | 'upcoming'

export function getDeadlineStatus(deadline: string): DeadlineStatus {
  const due = new Date(deadline)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  if (startOfDueDay.getTime() < startOfToday.getTime()) return 'overdue'
  if (startOfDueDay.getTime() === startOfToday.getTime()) return 'today'
  return 'upcoming'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('wordprocessingml')) return '📝'
  if (mimeType.includes('presentationml')) return '📊'
  if (mimeType === 'application/zip') return '🗜️'
  return '📎'
}
