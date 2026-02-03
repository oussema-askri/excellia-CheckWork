import dayjs from 'dayjs'

export const formatDate = (date, format = 'MMM D, YYYY') => {
  if (!date) return '-'
  return dayjs(date).format(format)
}

export const formatTime = (time, format = 'HH:mm') => {
  if (!time) return '-'
  return dayjs(time).format(format)
}

export const formatDateTime = (date, format = 'MMM D, YYYY HH:mm') => {
  if (!date) return '-'
  return dayjs(date).format(format)
}

export const formatDuration = (hours) => {
  if (!hours) return '-'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}m`
}