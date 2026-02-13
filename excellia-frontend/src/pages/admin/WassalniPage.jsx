import { useState, useEffect, useMemo } from 'react'
import { TruckIcon, CalendarIcon, FunnelIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import attendanceApi from '../../api/attendanceApi'
import userApi from '../../api/userApi'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Loading from '../../components/common/Loading'

export default function WassalniPage() {
  const [stats, setStats] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    employeeId: '',
  })

  // Load Employees for Dropdown
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await userApi.getAll({ limit: 1000, role: 'employee' })
        setEmployees(res.data || [])
      } catch (e) {
        console.error('Failed to load employees')
      }
    }
    loadEmployees()
  }, [])

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
      ...filters,
      startDate: dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
      endDate: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
    })
  }

  const employeeOptions = useMemo(() => {
    const list = employees.map(e => ({ value: e._id, label: e.name }))
    return [{ value: '', label: 'All Employees' }, ...list]
  }, [employees])

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
        <div className="flex flex-col lg:flex-row gap-4 items-end">
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
          
          <div className="flex-1 min-w-[200px]">
            <Select 
              label="Filter by Employee"
              options={employeeOptions}
              value={filters.employeeId}
              onChange={(e) => setFilters({...filters, employeeId: e.target.value})}
            />
          </div>

          <Button onClick={fetchStats} icon={FunnelIcon}>Apply</Button>
        </div>
      </Card>

      {loading ? <div className="py-12"><Loading /></div> : (
        <>
          {/* Total Counter */}
          <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg transform hover:scale-[1.01] transition-all">
            <div className="text-center py-6">
              <p className="text-xl font-medium opacity-90">Total Courses (Wassalni)</p>
              <p className="text-6xl font-extrabold mt-2 tracking-tight">{stats?.totalCourses || 0}</p>
              {filters.employeeId && <p className="text-sm mt-2 opacity-75 font-medium">(For selected employee)</p>}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Department */}
            <Card title="By Department" className="dark:bg-gray-800 dark:border-gray-700 h-full">
              <div className="space-y-3 mt-2">
                {stats?.byDepartment?.map((dept, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{dept._id || 'Unknown'}</span>
                    <span className="font-bold text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full text-sm">
                      {dept.count}
                    </span>
                  </div>
                ))}
                {(!stats?.byDepartment?.length) && <p className="text-gray-500 italic py-4 text-center">No data available</p>}
              </div>
            </Card>

            {/* Top Employees */}
            <Card title={filters.employeeId ? "Selected Employee" : "Top Employees"} className="dark:bg-gray-800 dark:border-gray-700 h-full">
              <div className="space-y-3 mt-2">
                {stats?.byEmployee?.map((emp, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{emp._id.name}</p>
                      <p className="text-xs text-gray-500">{emp._id.dept}</p>
                    </div>
                    <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full text-sm">
                      {emp.count}
                    </span>
                  </div>
                ))}
                {(!stats?.byEmployee?.length) && <p className="text-gray-500 italic py-4 text-center">No data available</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}