import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TableCellsIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import planningApi from '../../api/planningApi'
import { useAuth } from '../../hooks/useAuth'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'

const shiftColors = {
  'Morning': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'Shift1': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'Shift 1': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'Afternoon': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Shift2': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Shift 2': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Night': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Shift0': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  'Shift 0': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  'Full Day': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Excellia': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
}

const getShiftColor = (shift) => {
  if (!shift) return ''
  if (shiftColors[shift]) return shiftColors[shift]
  const s = String(shift).toLowerCase()
  for (const key of Object.keys(shiftColors)) {
    if (s.includes(String(key).toLowerCase())) return shiftColors[key]
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

// ✅ Now supports zoom IN and OUT
const ZOOM_LEVELS = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4]
const DEFAULT_ZOOM_INDEX = 4 // 100%

export default function MyPlanningPage() {
  const { user } = useAuth()
  const [planning, setPlanning] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)

  useEffect(() => {
    fetchPlanning()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, user?.department, user?.employeeId])

  const fetchPlanning = async () => {
    try {
      setLoading(true)

      // Fetch all planning data for month
      const response = await planningApi.getAll({
        limit: 1000,
        startDate: currentMonth.startOf('month').format('YYYY-MM-DD'),
        endDate: currentMonth.endOf('month').format('YYYY-MM-DD'),
      })

      let planningData = response.data || []

      // If user has a department -> keep only colleagues of same department
      if (user?.department) {
        planningData = planningData.filter(p => p.userId?.department === user.department)
      } else {
        // else show only own planning
        planningData = planningData.filter(p =>
          p.employeeId === user?.employeeId || p.userId?._id === user?._id
        )
      }

      setPlanning(planningData)
    } catch (error) {
      console.error('Failed to fetch planning:', error)
      toast.error('Failed to fetch planning')
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => setCurrentMonth(prev => prev.subtract(1, 'month'))
  const handleNextMonth = () => setCurrentMonth(prev => prev.add(1, 'month'))
  const handleToday = () => setCurrentMonth(dayjs())

  const handleZoomIn = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) setZoomIndex(prev => prev + 1)
  }
  const handleZoomOut = () => {
    if (zoomIndex > 0) setZoomIndex(prev => prev - 1)
  }
  const handleResetZoom = () => setZoomIndex(DEFAULT_ZOOM_INDEX)

  const { dates, employees, matrix } = useMemo(() => {
    if (!planning.length) return { dates: [], employees: [], matrix: {} }

    const employeeMap = new Map()
    planning.forEach(p => {
      if (!employeeMap.has(p.employeeId)) {
        employeeMap.set(p.employeeId, {
          id: p.employeeId,
          name: p.employeeName,
          isMe: p.employeeId === user?.employeeId
        })
      }
    })

    const employeesList = Array.from(employeeMap.values()).sort((a, b) => {
      if (a.isMe) return -1
      if (b.isMe) return 1
      return a.name.localeCompare(b.name)
    })

    const dateSet = new Set()
    planning.forEach(p => dateSet.add(dayjs(p.date).format('YYYY-MM-DD')))
    const dates = Array.from(dateSet).sort()

    const matrix = {}
    dates.forEach(d => { matrix[d] = {} })

    planning.forEach(p => {
      const d = dayjs(p.date).format('YYYY-MM-DD')
      matrix[d][p.employeeId] = {
        shift: p.shift,
        startTime: p.startTime,
        endTime: p.endTime
      }
    })

    return { dates, employees: employeesList, matrix }
  }, [planning, user?.employeeId])

  const currentZoom = ZOOM_LEVELS[zoomIndex]
  const zoomPercentage = Math.round(currentZoom * 100)

  // IMPORTANT: transform scale doesn't affect layout size.
  // We adjust wrapper width so scroll works for zoom-in as well.
  const wrapperWidth = currentZoom >= 1
    ? `${currentZoom * 100}%`
    : `${(1 / currentZoom) * 100}%`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Planning</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {user?.department ? `${user.department} Department Schedule` : 'Your work schedule'}
        </p>
      </div>

      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
              <ChevronLeftIcon className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
              {currentMonth.format('MMMM YYYY')}
            </h2>
            <Button variant="ghost" size="sm" onClick={handleNextMonth}>
              <ChevronRightIcon className="w-5 h-5" />
            </Button>
          </div>
          <Button variant="secondary" size="sm" onClick={handleToday}>Today</Button>
        </div>
      </Card>

      <Card noPadding className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <TableCellsIcon className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {user?.department ? `${user.department} Schedule` : 'My Schedule'}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              ({employees.length} {employees.length === 1 ? 'person' : 'people'})
            </span>
          </div>

          {/* ✅ Zoom controls always visible */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
              Zoom: {zoomPercentage}%
            </span>
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                disabled={zoomIndex === 0}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom Out"
              >
                <MagnifyingGlassMinusIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Reset Zoom"
              >
                <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom In"
              >
                <MagnifyingGlassPlusIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loading size="lg" /></div>
        ) : dates.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <CalendarDaysIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">No schedule found</p>
            <p className="text-sm mt-1">No planning for this month</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <div
              style={{
                transform: `scale(${currentZoom})`,
                transformOrigin: 'top left',
                width: wrapperWidth,
              }}
            >
              <table className="w-full">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="sticky left-0 z-30 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase border-r border-b border-gray-200 dark:border-gray-600 min-w-[120px]">
                      Date
                    </th>
                    {employees.map(emp => (
                      <th
                        key={emp.id}
                        className={`px-2 py-3 text-center text-xs font-semibold border-b border-gray-200 dark:border-gray-600 min-w-[100px] ${
                          emp.isMe
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <span className="truncate max-w-[90px] block" title={emp.name}>
                          {emp.isMe ? `${emp.name} (Me)` : emp.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {dates.map(date => {
                    const isWeekend = [0, 6].includes(dayjs(date).day())
                    const isToday = dayjs(date).isSame(dayjs(), 'day')

                    return (
                      <tr
                        key={date}
                        className={`${isWeekend ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'} ${
                          isToday ? 'ring-2 ring-inset ring-indigo-500' : ''
                        } hover:bg-gray-50 dark:hover:bg-gray-750`}
                      >
                        <td className={`sticky left-0 z-10 px-4 py-2 border-r border-gray-200 dark:border-gray-600 ${
                          isWeekend ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'
                        } ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-xs ${
                              isToday
                                ? 'bg-indigo-600 text-white'
                                : isWeekend
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}>
                              <span className="font-bold text-sm leading-none">{dayjs(date).format('DD')}</span>
                              <span className="uppercase text-[9px] leading-none">{dayjs(date).format('ddd')}</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                              {dayjs(date).format('MMM')}
                            </span>
                          </div>
                        </td>

                        {employees.map(emp => {
                          const data = matrix[date]?.[emp.id]
                          return (
                            <td
                              key={emp.id}
                              className={`px-1 py-1 text-center ${emp.isMe ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                            >
                              {data ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span
                                    className={`inline-block px-2 py-1 rounded text-xs font-medium truncate max-w-[90px] ${getShiftColor(data.shift)}`}
                                    title={data.shift}
                                  >
                                    {data.shift}
                                  </span>
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {data.startTime}-{data.endTime}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {dates.length > 0 && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Shift Legend</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(shiftColors).slice(0, 10).map(([shift, color]) => (
              <span key={shift} className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
                {shift}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}