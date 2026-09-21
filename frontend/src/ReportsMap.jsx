import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from './api/client'

const governorateCenters = {
  بغداد: [33.3152, 44.3661],
  نينوى: [36.335, 43.1189],
  البصرة: [30.5085, 47.7804],
  أربيل: [36.1911, 44.0092],
  كركوك: [35.4681, 44.3922],
  السليمانية: [35.557, 45.435],
  دهوك: [36.8617, 42.99],
  الأنبار: [33.42, 43.31],
  ديالى: [33.75, 44.64],
  صلاح_الدين: [34.45, 43.78],
  كربلاء: [32.616, 44.024],
  النجف: [31.99, 44.33],
  بابل: [32.46, 44.42],
  واسط: [32.5, 45.83],
  ميسان: [31.84, 47.15],
  ذي_قار: [31.05, 46.26],
  المثنى: [31.31, 45.28],
  القادسية: [31.99, 44.93],
  حلبجة: [35.18, 45.98],
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .replaceAll(' ', '_')
}

export default function ReportsMap() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      try {
        const response = await api.get('/admin/reports', {
          params: { page: 1, page_size: 100 },
        })

        if (!cancelled) {
          setReports(response.data?.items || [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadReports()

    return () => {
      cancelled = true
    }
  }, [])

  const governorates = useMemo(() => {
    const grouped = {}

    for (const report of reports) {
      const name =
        report.governorate?.name_ar ||
        report.governorate_name_ar ||
        report.governorate_name ||
        `محافظة ${report.governorate_id}`

      if (!grouped[report.governorate_id]) {
        grouped[report.governorate_id] = {
          id: report.governorate_id,
          name,
          count: 0,
        }
      }

      grouped[report.governorate_id].count += 1
    }

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        center:
          governorateCenters[normalizeName(item.name)] ||
          governorateCenters[item.name] ||
          null,
      }))
      .filter((item) => item.center)
  }, [reports])

  const maxCount = Math.max(
    1,
    ...governorates.map((item) => item.count),
  )

  return (
    <section className="panel reports-map-panel">
      <div className="panel-header">
        <div>
          <h3>خريطة توزيع البلاغات</h3>
          <span>توزيع البلاغات حسب المحافظة</span>
        </div>
        <span className="map-total">
          {loading ? 'جاري التحميل...' : `${reports.length} بلاغ`}
        </span>
      </div>

      <div className="reports-map">
        <MapContainer
          center={[33.2, 43.7]}
          zoom={5.5}
          scrollWheelZoom={false}
          style={{ height: '360px', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {governorates.map((item) => (
            <CircleMarker
              key={item.id}
              center={item.center}
              radius={10 + (item.count / maxCount) * 22}
              pathOptions={{
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.55,
                weight: 2,
              }}
            >
              <Popup>
                <strong>{item.name}</strong>
                <br />
                عدد البلاغات: {item.count}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {!loading && governorates.length === 0 && (
        <div className="empty-state">
          لا توجد بيانات بلاغات قابلة للعرض على الخريطة حالياً.
        </div>
      )}
    </section>
  )
}
