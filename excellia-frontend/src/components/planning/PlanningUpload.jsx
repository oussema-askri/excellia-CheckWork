import { useState } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import planningApi from '../../api/planningApi'
import Card from '../common/Card'
import Button from '../common/Button'
import FileUpload from '../common/FileUpload'

export default function PlanningUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile)
    setResult(null)
  }

  const handleRemoveFile = () => {
    setFile(null)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setUploading(true)
    try {
      const response = await planningApi.upload(file)
      setResult(response.data)
      toast.success(`Successfully imported ${response.data.savedRows} entries`)
      setFile(null)
      onUploadSuccess?.()
    } catch (error) {
      toast.error(error.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card 
      title="Upload Planning" 
      subtitle="Import employee schedules from Excel file"
      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    >
      <div className="space-y-4">
        <FileUpload
          label="Excel File"
          file={file}
          onFileSelect={handleFileSelect}
          onRemove={handleRemoveFile}
          accept={{
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          }}
          description="Drag and drop an Excel file (.xls, .xlsx)"
        />

        <div className="flex items-center gap-4">
          <Button
            onClick={handleUpload}
            loading={uploading}
            disabled={!file}
          >
            Upload Planning
          </Button>
        </div>

        {result && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">Upload Complete</h4>
            </div>
            <ul className="text-sm text-emerald-700 dark:text-emerald-400 space-y-1">
              <li>• Total rows: {result.totalRows}</li>
              <li>• Valid rows: {result.validRows}</li>
              <li>• Saved entries: {result.savedRows}</li>
              {result.parseErrors?.length > 0 && (
                <li className="text-amber-600 dark:text-amber-400">
                  • Parse errors: {result.parseErrors.length}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}