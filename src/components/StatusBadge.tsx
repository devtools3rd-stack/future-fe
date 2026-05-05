import { getStatusClassName, type WatchStatus } from './status'

type StatusBadgeProps = {
  status: WatchStatus
}

const statusLabels: Record<WatchStatus, string> = {
  WATCHING: 'Chờ quét',
  NO_SIGNAL: 'Đang theo dõi - chưa có tín hiệu',
  SIGNAL_SENT: 'Có tín hiệu',
  FETCH_ERROR: 'Lỗi lấy dữ liệu',
  TELEGRAM_ERROR: 'Lỗi Telegram',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status ${getStatusClassName(status)}`}>
      {statusLabels[status]}
    </span>
  )
}
