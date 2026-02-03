import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Select from '../../components/common/Select'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import userApi from '../../api/userApi'
import presenceApi from '../../api/presenceApi'

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export default function AdminPresencePage() {
  const [monthValue, setMonthValue] = useState(dayjs().format('YYYY-MM'))

  const [employees, setEmployees] = useState([])
  const [records, setRecords] = useState([])

  const [departments, setDepartments] = useState([])
  const [departmentFilter, setDepartmentFilter] = useState('')

  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(true)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const [downloadLoadingId, setDownloadLoadingId] = useState(null)
  const [regenLoadingUserId, setRegenLoadingUserId] = useState(null)

  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  const { year, month } = useMemo(() => {
    const [y, m] = monthValue.split('-')
    return { year: Number(y), month: Number(m) }
  }, [monthValue])

  const fetchDepartments = async () => {
    try {
      const res = await userApi.getDepartments()
      setDepartments(res.data?.departments || [])
    } catch (e) {
      // fallback will be derived from employees if endpoint fails
      setDepartments([])
    }
  }

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true)
      const res = await userApi.getAll({ limit: 1000, role: 'employee', isActive: true })
      const list = res.data || []
      setEmployees(list)

      // fallback departments from employees
      if (!departments.length) {
        const setD = new Set(list.map(x => x.department).filter(Boolean))
        setDepartments(Array.from(setD).sort())
      }
    } catch (e) {
      toast.error('Failed to load employees')
      setEmployees([])
    } finally {
      setLoadingEmployees(false)
    }
  }

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true)
      const res = await presenceApi.adminListRecords({ year, month, page: 1, limit: 200 })
      setRecords(res.data || [])
    } catch (e) {
      toast.error('Failed to load presence sheets')
      setRecords([])
    } finally {
      setLoadingRecords(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
    fetchEmployees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchRecords()
    setSelectedEmployeeId('')
  }, [year, month])

  // Filter employees by department
  const filteredEmployees = useMemo(() => {
    if (!departmentFilter) return employees
    return employees.filter(e => (e.department || '') === departmentFilter)
  }, [employees, departmentFilter])

  // Filter records by department too
  const filteredRecords = useMemo(() => {
    if (!departmentFilter) return records
    return records.filter(r => r.userId?.department === departmentFilter)
  }, [records, departmentFilter])

  // Ensure selected employee stays valid when department filter changes
  useEffect(() => {
    if (!selectedEmployeeId) return
    const stillExists = filteredEmployees.some(e => e._id === selectedEmployeeId)
    if (!stillExists) setSelectedEmployeeId('')
  }, [filteredEmployees, selectedEmployeeId])

  const selectedEmployee = useMemo(
    () => filteredEmployees.find(e => e._id === selectedEmployeeId) || null,
    [filteredEmployees, selectedEmployeeId]
  )

  const employeeOptions = useMemo(() => {
    return filteredEmployees.map(e => ({
      value: e._id,
      label: `${e.name} (${e.employeeId})${e.department ? ` - ${e.department}` : ''}`,
    }))
  }, [filteredEmployees])

  const departmentOptions = useMemo(() => {
    return departments.map(d => ({ value: d, label: d }))
  }, [departments])

  const handleGenerateSelected = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee')
      return
    }

    try {
      setActionLoading(true)

      const blob = await presenceApi.adminGenerateAndDownloadForUser({
        userId: selectedEmployeeId,
        year,
        month,
      })

      const emp = selectedEmployee
      const filename = emp
        ? `Feuille_de_presence_${emp.employeeId}_${year}-${String(month).padStart(2, '0')}.xlsx`
        : `Feuille_de_presence_${year}-${String(month).padStart(2, '0')}.xlsx`

      downloadBlob(blob, filename)
      toast.success('Feuille generated and downloaded')
      await fetchRecords()
    } catch (e) {
      toast.error(e?.message || 'Generation failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadRecord = async (rec) => {
    try {
      setDownloadLoadingId(rec._id)
      const blob = await presenceApi.adminDownloadRecordById(rec._id)
      downloadBlob(blob, rec.fileName || 'Feuille_de_presence.xlsx')
    } catch (e) {
      toast.error(e?.message || 'Download failed')
    } finally {
      setDownloadLoadingId(null)
    }
  }

  const handleRegenerateFromRow = async (rec) => {
    const userId = rec.userId?._id
    if (!userId) return

    try {
      setRegenLoadingUserId(userId)
      const blob = await presenceApi.adminGenerateAndDownloadForUser({ userId, year, month })
      downloadBlob(blob, rec.fileName || 'Feuille_de_presence.xlsx')
      toast.success('Regenerated & downloaded')
      await fetchRecords()
    } catch (e) {
      toast.error(e?.message || 'Regenerate failed')
    } finally {
      setRegenLoadingUserId(null)
    }
  }

  const handleBulkGenerate = async () => {
    try {
      setBulkLoading(true)
      const res = await presenceApi.adminGenerateAll({ year, month, department: departmentFilter })
      const data = res.data

      toast.success(`Generated: ${data.generated}/${data.totalEmployees} (failed: ${data.failed})`)
      setBulkConfirmOpen(false)
      await fetchRecords()
    } catch (e) {
      toast.error(e?.message || 'Bulk generation failed')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Feuille de présence (Admin)
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Select month + department + employee to generate. Generated sheets are saved and listed below.
        </p>
      </div>

      {/* Controls */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
          {/* Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Month
            </label>
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Department */}
          <div>
            <Select
              label="Department"
              options={departmentOptions}
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              placeholder="All Departments"
            />
          </div>

          {/* Employee */}
          <div>
            {loadingEmployees ? (
              <div className="pt-2">
                <Loading />
              </div>
            ) : (
              <Select
                label="Employee"
                options={employeeOptions}
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                placeholder={filteredEmployees.length ? 'Select an employee' : 'No employees'}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-start lg:justify-end">
            <Button
              variant="secondary"
              onClick={() => setBulkConfirmOpen(true)}
              disabled={loadingEmployees || filteredEmployees.length === 0}
            >
              Generate ALL
            </Button>

            <Button
              onClick={handleGenerateSelected}
              loading={actionLoading}
              disabled={!selectedEmployeeId || loadingEmployees}
            >
              Generate & Download
            </Button>
          </div>
        </div>

        {selectedEmployee && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Selected: <span className="font-semibold">{selectedEmployee.name}</span>{' '}
              <span className="text-gray-500 dark:text-gray-400">({selectedEmployee.employeeId})</span>
              {selectedEmployee.department ? (
                <span className="text-gray-500 dark:text-gray-400"> — {selectedEmployee.department}</span>
              ) : null}
            </p>
          </div>
        )}
      </Card>

      {/* DB Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Generated Sheets (Saved in DB)
          </h2>
          <Button variant="secondary" onClick={fetchRecords} disabled={loadingRecords}>
            Refresh
          </Button>
        </div>

        {loadingRecords ? (
          <div className="py-10"><Loading /></div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400">
            No generated sheets for {year}-{String(month).padStart(2, '0')}
            {departmentFilter ? ` (department: ${departmentFilter})` : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Generated By</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Generated At</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredRecords.map(rec => (
                  <tr key={rec._id} className="bg-white dark:bg-gray-800">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{rec.userId?.name || '—'}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{rec.userId?.employeeId || '—'}</div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {rec.userId?.department || '—'}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {rec.generatedBy?.name || '—'}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {rec.generatedAt ? dayjs(rec.generatedAt).format('YYYY-MM-DD HH:mm') : '—'}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleDownloadRecord(rec)}
                          loading={downloadLoadingId === rec._id}
                        >
                          Download
                        </Button>
                        <Button
                          onClick={() => handleRegenerateFromRow(rec)}
                          loading={regenLoadingUserId === rec.userId?._id}
                        >
                          Regenerate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </Card>

      {/* Confirm Bulk Generate */}
      <ConfirmDialog
        isOpen={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={handleBulkGenerate}
        title="Generate ALL presence sheets?"
        message={
          departmentFilter
            ? `This will generate and SAVE sheets for ALL employees in department "${departmentFilter}" for ${year}-${String(month).padStart(2,'0')}.`
            : `This will generate and SAVE sheets for ALL employees for ${year}-${String(month).padStart(2,'0')}.`
        }
        confirmText="Generate"
        loading={bulkLoading}
        variant="warning"
      />
    </div>
  )
}