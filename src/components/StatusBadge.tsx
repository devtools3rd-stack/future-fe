import { getStatusClassName, type WatchStatus } from './status'

type StatusBadgeProps = {
  status: WatchStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status ${getStatusClassName(status)}`}>{status}</span>
}
