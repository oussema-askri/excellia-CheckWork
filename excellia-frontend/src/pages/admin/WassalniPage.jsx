import { useState, useEffect } from 'react'
import { TruckIcon, CalendarIcon, FunnelIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import attendanceApi from '../../api/attendanceApi'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'

export default function WassalniPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
  })

  useEffect(() => {
    fetchStats()
  }, [filters])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await attendanceApi.getWassalniStats(filters)
      setStats(res.data || {})
    } catch (e) {
      toast.error('Failed to load Wassalni stats')
    } finally {
      setLoading(false)
    }
  }

  const setLastMonth = () => {
    setFilters({
      startDate: dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
      endDate: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TruckIcon className="w-8 h-8 text-yellow-500" />
            Wassalni Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Track taxi courses and transportation usage.</p>
        </div>
        <Button variant="secondary" onClick={setLastMonth} icon={CalendarIcon}>
          Last Month
        </Button>
      </div>

      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <Input 
            type="date" 
            label="Start Date" 
            value={filters.startDate} 
            onChange={(e) => setFilters({...filters, startDate: e.target.value})} 
          />
          <Input 
            type="date" 
            label="End Date" 
            value={filters.endDate} 
            onChange={(e) => setFilters({...filters, endDate: e.target.value})} 
          />
          <Button onClick={fetchStats} icon={FunnelIcon}>Apply</Button>
        </div>
      </Card>

      {loading ? <div className="py-12"><Loading /></div> : (
        <>
          {/* Total Counter */}
          <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
            <div className="text-center py-4">
              <p className="text-lg font-medium opacity-90">Total Courses (Wassalni)</p>
              <p className="text-5xl font-bold mt-2">{stats?.totalCourses || 0}</p>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Department */}
            <Card title="By Department" className="dark:bg-gray-800 dark:border-gray-700">
              <div className="space-y-4 mt-2">
                {stats?.byDepartment?.map((dept, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{dept._id || 'Unknown'}</span>
                    <span className="font-bold text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
                      {dept.count}
                    </span>
                  </div>
                ))}
                {(!stats?.byDepartment?.length) && <p className="text-gray-500">No data available</p>}
              </div>
            </Card>

            {/* Top Employees */}
            <Card title="Top Employees" className="dark:bg-gray-800 dark:border-gray-700">
              <div className="space-y-4 mt-2">
                {stats?.byEmployee?.map((emp, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{emp._id.name}</p>
                      <p className="text-xs text-gray-500">{emp._id.dept}</p>
                    </div>
                    <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">
                      {emp.count}
                    </span>
                  </div>
                ))}
                {(!stats?.byEmployee?.length) && <p className="text-gray-500">No data available</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}