import { useState, useEffect, useMemo } from 'react'
import { MoonIcon, CalendarIcon, FunnelIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import planningApi from '../../api/planningApi'
import userApi from '../../api/userApi'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Loading from '../../components/common/Loading'

export default function NightShiftsPage() {
    const [stats, setStats] = useState(null)
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)
    const [filters, setFilters] = useState({
        startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
        endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
        employeeId: '',
    })

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
            const res = await planningApi.getNightShiftStats(filters)
            setStats(res.data || {})
        } catch (e) {
            toast.error('Failed to load night shift stats')
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = async () => {
        try {
            setDownloading(true)
            const blob = await planningApi.exportNightShifts(filters)

            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Night_Shifts_Report_${filters.startDate}_to_${filters.endDate}.xlsx`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)

            toast.success('Report downloaded')
        } catch (e) {
            toast.error('Download failed')
        } finally {
            setDownloading(false)
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
        <div className="space-y-6 animate-page-enter">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MoonIcon className="w-8 h-8 text-indigo-500" />
                        Night Shifts Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Track night shift assignments (Shift 1 &amp; Shift 2).</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={setLastMonth} icon={CalendarIcon}>
                        Last Month
                    </Button>
                    <Button onClick={handleDownload} loading={downloading} icon={ArrowDownTrayIcon}>
                        Download Report
                    </Button>
                </div>
            </div>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    <Input
                        type="date"
                        label="Start Date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                    <Input
                        type="date"
                        label="End Date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />

                    <div className="flex-1 min-w-[200px]">
                        <Select
                            label="Filter by Employee"
                            options={employeeOptions}
                            value={filters.employeeId}
                            onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                        />
                    </div>

                    <Button onClick={fetchStats} icon={FunnelIcon}>Apply</Button>
                </div>
            </Card>

            {loading ? <div className="py-12"><Loading /></div> : (
                <>
                    <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-lg transform hover:scale-[1.01] transition-all">
                        <div className="text-center py-6">
                            <p className="text-xl font-medium opacity-90">Total Night Shifts</p>
                            <p className="text-6xl font-extrabold mt-2 tracking-tight">{stats?.totalNightShifts || 0}</p>
                            {filters.employeeId && <p className="text-sm mt-2 opacity-75 font-medium">(For selected employee)</p>}
                        </div>
                    </Card>

                    {/* Shift breakdown */}
                    {stats?.byShift?.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {stats.byShift.map((s, idx) => (
                                <Card key={idx} className="dark:bg-gray-800 dark:border-gray-700">
                                    <div className="text-center py-4">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s._id}</p>
                                        <p className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{s.count}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="By Department" className="dark:bg-gray-800 dark:border-gray-700 h-full">
                            <div className="space-y-3 mt-2">
                                {stats?.byDepartment?.map((dept, idx) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0">
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{dept._id || 'Unknown'}</span>
                                        <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full text-sm">
                                            {dept.count}
                                        </span>
                                    </div>
                                ))}
                                {(!stats?.byDepartment?.length) && <p className="text-gray-500 italic py-4 text-center">No data available</p>}
                            </div>
                        </Card>

                        <Card title={filters.employeeId ? "Selected Employee" : "Top Employees"} className="dark:bg-gray-800 dark:border-gray-700 h-full">
                            <div className="space-y-3 mt-2">
                                {stats?.byEmployee?.map((emp, idx) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{emp._id.name}</p>
                                            <p className="text-xs text-gray-500">{emp._id.dept}</p>
                                        </div>
                                        <span className="font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full text-sm">
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
