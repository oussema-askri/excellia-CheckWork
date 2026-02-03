import { useState, useEffect } from 'react'
import {
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import dashboardApi from '../../api/dashboardApi'
import Card from '../../components/common/Card'
import Loading from '../../components/common/Loading'
import Badge from '../../components/common/Badge'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const statsRes = await dashboardApi.getStats()
      setStats(statsRes.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Employees',
      value: stats?.employees?.total || 0,
      subtitle: `${stats?.employees?.active || 0} active`,
      icon: UsersIcon,
      iconBg: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Present Today',
      value: stats?.today?.present || 0,
      subtitle: 'Checked in on time',
      icon: CheckCircleIcon,
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Late Today',
      value: stats?.today?.late || 0,
      subtitle: 'Arrived late',
      icon: ExclamationTriangleIcon,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      title: 'Absent Today',
      value: stats?.today?.absent || 0,
      subtitle: 'Not checked in',
      icon: XCircleIcon,
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    {
      title: 'On Leave',
      value: stats?.today?.onLeave || 0,
      subtitle: 'Approved leave',
      icon: CalendarDaysIcon,
      iconBg: 'bg-purple-100 dark:bg-purple-900',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Scheduled Shifts',
      value: stats?.today?.scheduledShifts || 0,
      subtitle: 'For today',
      icon: ClockIcon,
      iconBg: 'bg-indigo-100 dark:bg-indigo-900',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Welcome back! Here's what's happening today - {dayjs().format('dddd, MMMM D, YYYY')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{stat.subtitle}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                <stat.icon className={`w-8 h-8 ${stat.iconColor}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card 
          title="This Month's Summary" 
          subtitle={dayjs().format('MMMM YYYY')}
          className="dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Total Attendance Records</span>
              <span className="font-semibold text-gray-900 dark:text-white">{stats?.monthly?.total || 0}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Present Days</span>
              <Badge variant="success">{stats?.monthly?.present || 0}</Badge>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Late Days</span>
              <Badge variant="warning">{stats?.monthly?.late || 0}</Badge>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600 dark:text-gray-400">Absent Days</span>
              <Badge variant="danger">{stats?.monthly?.absent || 0}</Badge>
            </div>
          </div>
        </Card>

        <Card 
          title="Quick Stats" 
          subtitle="Employee Overview"
          className="dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Active Employees</span>
              <span className="font-semibold text-green-600">{stats?.employees?.active || 0}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Inactive Employees</span>
              <span className="font-semibold text-red-600">{stats?.employees?.inactive || 0}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Admins</span>
              <span className="font-semibold text-blue-600">{stats?.employees?.admins || 0}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600 dark:text-gray-400">Attendance Rate (Today)</span>
              <span className="font-semibold text-primary-600">
                {stats?.employees?.active > 0 
                  ? Math.round(((stats?.today?.present || 0) + (stats?.today?.late || 0)) / stats.employees.active * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}