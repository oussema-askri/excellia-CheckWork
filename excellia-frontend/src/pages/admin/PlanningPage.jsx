import { useState, useEffect, useMemo } from 'react'
import { 
  CloudArrowUpIcon, 
  DocumentArrowDownIcon, 
  CalendarDaysIcon, 
  TableCellsIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import planningApi from '../../api/planningApi'
import userApi from '../../api/userApi'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Loading from '../../components/common/Loading'
import PlanningUpload from '../../components/planning/PlanningUpload'

// Shift colors
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
  'Off': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'Leave': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

const getShiftColor = (shift) => {
  if (!shift) return ''
  if (shiftColors[shift]) return shiftColors[shift]
  for (const key of Object.keys(shiftColors)) {
    if (shift.toLowerCase().includes(key.toLowerCase())) {
      return shiftColors[key]
    }
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

const ZOOM_LEVELS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
const DEFAULT_ZOOM_INDEX = 5

export default function PlanningPage() {
  const [planning, setPlanning] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const [filters, setFilters] = useState({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    department: '',
  })

  useEffect(() => {
    fetchDepartments()
  }, [])

  useEffect(() => {
    fetchPlanning()
  }, [filters.startDate, filters.endDate])

  const fetchDepartments = async () => {
    try {
      const response = await userApi.getDepartments()
      setDepartments(response.data?.departments || [])
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }

  const fetchPlanning = async () => {
    try {
      setLoading(true)
      const response = await planningApi.getAll({
        limit: 1000,
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
      setPlanning(response.data || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error(error.message || 'Failed to fetch planning')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await planningApi.downloadTemplate()
      const blob = new Blob([response], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'planning_template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Template downloaded')
    } catch (error) {
      toast.error('Failed to download template')
    }
  }

  const handleZoomIn = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) setZoomIndex(prev => prev + 1)
  }

  const handleZoomOut = () => {
    if (zoomIndex > 0) setZoomIndex(prev => prev - 1)
  }

  const handleResetZoom = () => {
    setZoomIndex(DEFAULT_ZOOM_INDEX)
  }

  // Transform data into matrix format with department filter
  const { dates, filteredEmployees, matrix } = useMemo(() => {
    if (!planning.length) return { dates: [], filteredEmployees: [], matrix: {} }

    // Get unique employees from planning
    const employeeMap = new Map()
    planning.forEach(p => {
      if (!employeeMap.has(p.employeeId)) {
        employeeMap.set(p.employeeId, {
          id: p.employeeId,
          name: p.employeeName,
          department: p.userId?.department || ''
        })
      }
    })
    
    // Filter by department if selected
    let employeesList = Array.from(employeeMap.values())
    if (filters.department) {
      employeesList = employeesList.filter(emp => emp.department === filters.department)
    }
    
    employeesList.sort((a, b) => a.name.localeCompare(b.name))

    // Get unique dates
    const dateSet = new Set()
    planning.forEach(p => dateSet.add(dayjs(p.date).format('YYYY-MM-DD')))
    const dates = Array.from(dateSet).sort()

    // Build matrix
    const matrix = {}
    dates.forEach(date => { matrix[date] = {} })
    planning.forEach(p => {
      const dateKey = dayjs(p.date).format('YYYY-MM-DD')
      if (matrix[dateKey]) matrix[dateKey][p.employeeId] = p.shift
    })

    return { dates, filteredEmployees: employeesList, matrix }
  }, [planning, filters.department])

  const currentZoom = ZOOM_LEVELS[zoomIndex]
  const zoomPercentage = Math.round(currentZoom * 100)
  const departmentOptions = departments.map(dept => ({ value: dept, label: dept }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Planning</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage employee work schedules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleDownloadTemplate} icon={DocumentArrowDownIcon}>
            Template
          </Button>
          <Button onClick={() => setShowUpload(!showUpload)} icon={CloudArrowUpIcon}>
            Upload Excel
          </Button>
        </div>
      </div>

      {showUpload && (
        <PlanningUpload onUploadSuccess={() => {
          fetchPlanning()
          fetchDepartments()
          setShowUpload(false)
        }} />
      )}

      {/* Filters */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              type="date"
              label="Start Date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <Input
              type="date"
              label="End Date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
            <Select
              label="Department"
              options={departmentOptions}
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              placeholder={departments.length > 0 ? "All Departments" : "No departments found"}
            />
          </div>
          <Button 
            variant="secondary" 
            onClick={() => setFilters(prev => ({ ...prev, department: '' }))}
            disabled={!filters.department}
          >
            Clear
          </Button>
        </div>
        
        {departments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick filter:</p>
            <div className="flex flex-wrap gap-2">
              {departments.map(dept => (
                <button
                  key={dept}
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    department: prev.department === dept ? '' : dept 
                  }))}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    filters.department === dept
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Matrix Table */}
      <Card noPadding className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <TableCellsIcon className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-900 dark:text-white">Schedule Matrix</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              ({dates.length} days, {filteredEmployees.length} employees)
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Zoom: {zoomPercentage}%</span>
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button onClick={handleZoomOut} disabled={zoomIndex === 0} className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed">
                <MagnifyingGlassMinusIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button onClick={handleResetZoom} className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
                <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button onClick={handleZoomIn} disabled={zoomIndex === ZOOM_LEVELS.length - 1} className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed">
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
            <p className="text-lg font-medium">No planning data found</p>
            <p className="text-sm mt-1">Upload an Excel file to add schedules</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <CalendarDaysIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">No employees in this department</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <div style={{ transform: `scale(${currentZoom})`, transformOrigin: 'top left', width: `${100 / currentZoom}%` }}>
              <table className="w-full">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="sticky left-0 z-30 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase border-r border-b border-gray-200 dark:border-gray-600 min-w-[120px]">
                      Date
                    </th>
                    {filteredEmployees.map(emp => (
                      <th key={emp.id} className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 min-w-[90px]">
                        <div className="flex flex-col items-center">
                          <span className="truncate max-w-[80px]" title={emp.name}>{emp.name}</span>
                          {emp.department && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">{emp.department}</span>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {dates.map(date => {
                    const isWeekend = [0, 6].includes(dayjs(date).day())
                    const isToday = dayjs(date).isSame(dayjs(), 'day')
                    return (
                      <tr key={date} className={`${isWeekend ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'} ${isToday ? 'ring-2 ring-inset ring-indigo-500' : ''} hover:bg-gray-50 dark:hover:bg-gray-750`}>
                        <td className={`sticky left-0 z-10 px-4 py-2 border-r border-gray-200 dark:border-gray-600 ${isWeekend ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'} ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-xs ${isToday ? 'bg-indigo-600 text-white' : isWeekend ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                              <span className="font-bold text-sm leading-none">{dayjs(date).format('DD')}</span>
                              <span className="uppercase text-[9px] leading-none">{dayjs(date).format('ddd')}</span>
                            </div>
                          </div>
                        </td>
                        {filteredEmployees.map(emp => {
                          const shift = matrix[date]?.[emp.id]
                          return (
                            <td key={emp.id} className="px-1 py-1 text-center">
                              {shift ? (
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium truncate max-w-[80px] ${getShiftColor(shift)}`} title={shift}>{shift}</span>
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

      {dates.length > 0 && filteredEmployees.length > 0 && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Shift Legend</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(shiftColors).map(([shift, color]) => (
              <span key={shift} className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{shift}</span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}