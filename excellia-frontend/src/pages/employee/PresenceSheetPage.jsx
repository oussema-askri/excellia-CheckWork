import { useState } from 'react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import presenceApi from '../../api/presenceApi'

export default function PresenceSheetPage() {
  const [monthValue, setMonthValue] = useState(dayjs().format('YYYY-MM'))
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const [yearStr, monthStr] = monthValue.split('-')
      const year = Number(yearStr)
      const month = Number(monthStr)

      const blob = await presenceApi.downloadMy({ year, month })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Feuille_de_presence_${year}-${String(month).padStart(2, '0')}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast.success('Feuille générée avec succès')
    } catch (err) {
      toast.error(err?.message || 'Erreur lors de la génération')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feuille de présence</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Générer automatiquement la feuille mensuelle (.xlsx) à partir des pointages (check-in/out) et du planning.
        </p>
      </div>

      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Mois
            </label>
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <Button onClick={handleDownload} loading={downloading}>
            Télécharger (.xlsx)
          </Button>
        </div>
      </Card>
    </div>
  )
}