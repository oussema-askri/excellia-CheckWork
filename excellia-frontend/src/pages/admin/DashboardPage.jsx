import { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import dashboardApi from '../../api/dashboardApi'
import { useAuth } from '../../hooks/useAuth'
import Card from '../../components/common/Card'
import Loading from '../../components/common/Loading'
import Badge from '../../components/common/Badge'

const STATUS_CONFIG = {
  present: { label: 'P', color: 'bg-emerald-500', textColor: 'text-white', title: 'Present' },
  late: { label: 'L', color: 'bg-amber-400', textColor: 'text-white', title: 'Late' },
  absent: { label: 'A', color: 'bg-red-500', textColor: 'text-white', title: 'Absent' },
  'half-day': { label: 'H', color: 'bg-orange-400', textColor: 'text-white', title: 'Half Day' },
  'on-leave': { label: 'V', color: 'bg-blue-500', textColor: 'text-white', title: 'On Leave' },
  'pending-absence': { label: '?', color: 'bg-yellow-300', textColor: 'text-gray-700', title: 'Pending' },
}

const STAT_CARDS = [
  {
    key: 'present',
    label: 'Present Today',
    icon: CheckCircleIcon,
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'late',
    label: 'Late Today',
    icon: ExclamationTriangleIcon,
    gradient: 'from-amber-400 to-orange-500',
    bgLight: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'absent',
    label: 'Absent Today',
    icon: XCircleIcon,
    gradient: 'from-red-500 to-rose-600',
    bgLight: 'bg-red-50 dark:bg-red-900/20',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  {
    key: 'onLeave',
    label: 'On Leave',
    icon: CalendarDaysIcon,
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
]

function getGreeting() {
  const hour = dayjs().hour()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [matrixData, setMatrixData] = useState(null)
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(dayjs())

  useEffect(() => {
    fetchData()
  }, [currentMonth])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [matrixRes, monthlyRes] = await Promise.all([
        dashboardApi.getAttendanceMatrix({
          year: currentMonth.year(),
          month: currentMonth.month() + 1,
        }),
        dashboardApi.getMonthlySummary({
          year: currentMonth.year(),
          month: currentMonth.month() + 1,
        }),
      ])
      setMatrixData(matrixRes.data)
      setMonthlyStats(monthlyRes.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => setCurrentMonth(currentMonth.subtract(1, 'month'))
  const handleNextMonth = () => setCurrentMonth(currentMonth.add(1, 'month'))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  const today = matrixData?.today || {}
  const employees = matrixData?.employees || []
  const records = matrixData?.records || {}
  const daysInMonth = matrixData?.daysInMonth || 30
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const isCurrentMonth = currentMonth.isSame(dayjs(), 'month')
  const todayDate = dayjs().date()
  const stats = monthlyStats?.stats || {}

  // Attendance rate
  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present || 0) + (stats.late || 0)) / stats.total * 100)
    : 0

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Greeting & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {dayjs().format('dddd, MMMM D, YYYY')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <span className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white min-w-[160px] text-center shadow-sm text-sm">
            {currentMonth.format('MMMM YYYY')}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Stat Cards with gradient accents */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-stagger">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden group"
          >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.gradient}`} />
            <div className={`p-2.5 rounded-xl ${card.bgLight} transition-transform duration-200 group-hover:scale-105`}>
              <card.icon className={`w-6 h-6 ${card.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{today[card.key] || 0}</p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance Schedule Matrix */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Matrix</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {employees.length} employees · {currentMonth.format('MMMM YYYY')}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 rounded-sm ${cfg.color}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{cfg.title}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-600" />
              <span className="text-xs text-gray-500 dark:text-gray-400">No Record</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 min-w-[180px]">
                  Employee
                </th>
                {days.map(day => {
                  const isToday = isCurrentMonth && day === todayDate
                  const dayOfWeek = currentMonth.date(day).format('dd')
                  const isWeekend = dayOfWeek === 'Sa' || dayOfWeek === 'Su'
                  return (
                    <th
                      key={day}
                      className={`px-0.5 py-2 text-center text-xs font-medium min-w-[32px] border-r border-gray-100 dark:border-gray-700/50 ${isToday
                        ? 'bg-indigo-50 dark:bg-indigo-900/20'
                        : isWeekend
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : ''
                        }`}
                    >
                      <div className={`${isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                        {dayOfWeek}
                      </div>
                      <div className={`text-sm ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-300'}`}>
                        {day}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No active employees found
                  </td>
                </tr>
              ) : (
                employees.map((emp, idx) => {
                  const empRecords = records[emp._id] || {}
                  return (
                    <tr
                      key={emp._id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'
                        }`}
                    >
                      <td className="sticky left-0 z-10 px-4 py-2.5 border-r border-gray-200 dark:border-gray-700 bg-inherit">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-xs">
                              {emp.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{emp.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{emp.department || emp.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      {days.map(day => {
                        const status = empRecords[day]
                        const cfg = status ? STATUS_CONFIG[status] : null
                        const isToday = isCurrentMonth && day === todayDate
                        const dayOfWeek = currentMonth.date(day).format('dd')
                        const isWeekend = dayOfWeek === 'Sa' || dayOfWeek === 'Su'
                        return (
                          <td
                            key={day}
                            className={`px-0.5 py-1.5 text-center border-r border-gray-100 dark:border-gray-700/50 ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : isWeekend ? 'bg-gray-50 dark:bg-gray-800/70' : ''
                              }`}
                          >
                            {cfg ? (
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${cfg.color} ${cfg.textColor} shadow-sm cursor-default transition-transform hover:scale-110`}
                                title={`${emp.name} — ${cfg.title} (Day ${day})`}
                              >
                                {cfg.label}
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 text-xs cursor-default"
                                title={`${emp.name} — No record (Day ${day})`}
                              >
                                ·
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Monthly Summary"
          subtitle={currentMonth.format('MMMM YYYY')}
          className="dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Total Records</span>
              <span className="font-semibold text-gray-900 dark:text-white">{stats.total || 0}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Present Days</span>
              <Badge variant="success">{stats.present || 0}</Badge>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Late Days</span>
              <Badge variant="warning">{stats.late || 0}</Badge>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Absent Days</span>
              <Badge variant="danger">{stats.absent || 0}</Badge>
            </div>
          </div>
        </Card>

        <Card
          title="Attendance Rate"
          subtitle="This month's performance"
          className="dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="space-y-3">
            {/* Circular attendance rate */}
            <div className="flex items-center justify-center py-4">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    className="text-indigo-500 dark:text-indigo-400"
                    strokeWidth="3"
                    strokeDasharray={`${attendanceRate}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{attendanceRate}%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Active Employees</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{matrixData?.totalActive || 0}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400 text-sm">On Leave (This Month)</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.onLeave || 0}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Half Days</span>
              <span className="font-semibold text-orange-500">{stats.halfDay || 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}