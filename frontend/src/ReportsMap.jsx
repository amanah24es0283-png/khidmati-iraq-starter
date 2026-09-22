import { useEffect, useMemo, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from 'react-leaflet'
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
  'صلاح الدين': [34.45, 43.78],
  كربلاء: [32.616, 44.024],
  النجف: [31.99, 44.33],
  بابل: [32.46, 44.42],
  واسط: [32.5, 45.83],
  ميسان: [31.84, 47.15],
  'ذي قار': [31.05, 46.26],
  المثنى: [31.31, 45.28],
  القادسية: [31.99, 44.93],
  حلبجة: [35.18, 45.98],
}

const statusLabels = {
  submitted: 'مقدمة',
  under_review: 'قيد المراجعة',
  assigned: 'تمت الإحالة',
  in_progress: 'قيد المعالجة',
  resolved: 'محلولة',
  rejected: 'مرفوضة',
  cancelled: 'ملغاة',
}

function getCenter(name) {
  return governorateCenters[String(name || '').trim()] || null
}

function StatLine({ label, value }) {
  return (
    <div className="governorate-stat-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default function ReportsMap() {
  const [governorates, setGovernorates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGovernorate, setSelectedGovernorate] = useState(null)
  const [areas, setAreas] = useState([])
  const [areasLoading, setAreasLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadGovernorateStats() {
    try {
      setLoading(true)
      setError('')

      const response = await api.get('/admin/dashboard/governorates')
      setGovernorates(response.data || [])
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setError('انتهت جلسة تسجيل الدخول.')
      } else if (requestError.response?.status === 403) {
        setError('ليس لديك صلاحية لعرض إحصائيات المحافظات.')
      } else {
        setError('تعذر تحميل بيانات المحافظات.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function selectGovernorate(governorate) {
    setSelectedGovernorate(governorate)
    setAreas([])
    setAreasLoading(true)

    try {
      const response = await api.get(
        `/governorates/${governorate.id}/areas`,
      )
      setAreas(response.data || [])
    } catch {
      setAreas([])
    } finally {
      setAreasLoading(false)
    }
  }

  useEffect(() => {
    loadGovernorateStats()

    const interval = window.setInterval(() => {
      loadGovernorateStats()
    }, 30000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  const mappedGovernorates = useMemo(
    () =>
      governorates
        .map((item) => ({
          ...item,
          center: getCenter(item.name_ar),
        }))
        .filter((item) => item.center),
    [governorates],
  )

  const maxReports = Math.max(
    1,
    ...mappedGovernorates.map((item) => item.total_reports),
  )

  const totalReports = governorates.reduce(
    (sum, item) => sum + item.total_reports,
    0,
  )

  const totalUrgent = governorates.reduce(
    (sum, item) => sum + item.urgent_reports,
    0,
  )

  const totalResolved = governorates.reduce(
    (sum, item) => sum + item.resolved_reports,
    0,
  )

  return (
    <section className="panel reports-map-panel">
      <div className="panel-header">
        <div>
          <h3>خريطة المحافظات والمتابعة الميدانية</h3>
          <span>
            متابعة البلاغات وتفاصيل المحافظات والمناطق التابعة لها
          </span>
        </div>

        <span className="map-total">
          {loading
            ? 'جاري التحميل...'
            : `${governorates.length} محافظة`}
        </span>
      </div>

      {error && (
        <div className="error-state">
          {error}
        </div>
      )}

      <div className="governorate-summary">
        <div>
          <strong>{governorates.length}</strong>
          <span>المحافظات</span>
        </div>

        <div>
          <strong>{totalReports}</strong>
          <span>إجمالي البلاغات</span>
        </div>

        <div>
          <strong>{totalUrgent}</strong>
          <span>بلاغات عاجلة</span>
        </div>

        <div>
          <strong>{totalResolved}</strong>
          <span>بلاغات محلولة</span>
        </div>
      </div>

      <div className="reports-map">
        <MapContainer
          center={[33.2, 43.7]}
          zoom={5.5}
          scrollWheelZoom={false}
          style={{ height: '420px', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mappedGovernorates.map((item) => {
            const radius =
              item.total_reports === 0
                ? 7
                : 9 + (item.total_reports / maxReports) * 24

            return (
              <CircleMarker
                key={item.id}
                center={item.center}
                radius={radius}
                pathOptions={{
                  color:
                    item.urgent_reports > 0
                      ? '#dc2626'
                      : '#2563eb',
                  fillColor:
                    item.urgent_reports > 0
                      ? '#ef4444'
                      : '#3b82f6',
                  fillOpacity: 0.55,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => selectGovernorate(item),
                }}
              >
                <Popup>
                  <div dir="rtl">
                    <strong>{item.name_ar}</strong>

                    <div style={{ marginTop: 8 }}>
                      إجمالي البلاغات: {item.total_reports}
                    </div>

                    <div>
                      البلاغات العاجلة: {item.urgent_reports}
                    </div>

                    <div>
                      المحلولة: {item.resolved_reports}
                    </div>

                    <button
                      type="button"
                      style={{
                        marginTop: 10,
                        cursor: 'pointer',
                      }}
                      onClick={() => selectGovernorate(item)}
                    >
                      عرض التفاصيل
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {selectedGovernorate && (
        <div className="governorate-details" dir="rtl">
          <div className="governorate-details-header">
            <div>
              <h4>{selectedGovernorate.name_ar}</h4>
              <span>{selectedGovernorate.name_en}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedGovernorate(null)
                setAreas([])
              }}
            >
              إغلاق
            </button>
          </div>

          <div className="governorate-details-grid">
            <StatLine
              label="إجمالي البلاغات"
              value={selectedGovernorate.total_reports}
            />

            <StatLine
              label="بلاغات عاجلة"
              value={selectedGovernorate.urgent_reports}
            />

            <StatLine
              label="مقدمة"
              value={selectedGovernorate.submitted_reports}
            />

            <StatLine
              label="قيد المراجعة"
              value={selectedGovernorate.under_review_reports}
            />

            <StatLine
              label="تمت الإحالة"
              value={selectedGovernorate.assigned_reports}
            />

            <StatLine
              label="قيد المعالجة"
              value={selectedGovernorate.in_progress_reports}
            />

            <StatLine
              label="محلولة"
              value={selectedGovernorate.resolved_reports}
            />

            <StatLine
              label="مرفوضة"
              value={selectedGovernorate.rejected_reports}
            />

            <StatLine
              label="ملغاة"
              value={selectedGovernorate.cancelled_reports}
            />

            <StatLine
              label="عدد المناطق"
              value={selectedGovernorate.areas_count}
            />
          </div>

          <div className="governorate-areas">
            <h5>المناطق التابعة</h5>

            {areasLoading ? (
              <div className="empty-state">
                جاري تحميل المناطق...
              </div>
            ) : areas.length === 0 ? (
              <div className="empty-state">
                لا توجد مناطق فعالة مسجلة لهذه المحافظة.
              </div>
            ) : (
              <div className="governorate-area-list">
                {areas.map((area) => (
                  <div key={area.id} className="governorate-area-item">
                    <strong>{area.name_ar}</strong>
                    <span>{area.name_en}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="governorate-status-list">
            {Object.entries(statusLabels).map(([key, label]) => {
              const count =
                selectedGovernorate[`${key}_reports`] || 0

              return (
                <div key={key}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="governorate-list">
        {mappedGovernorates.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`governorate-card ${
              selectedGovernorate?.id === item.id
                ? 'selected'
                : ''
            }`}
            onClick={() => selectGovernorate(item)}
          >
            <div>
              <strong>{item.name_ar}</strong>
              <span>{item.name_en}</span>
            </div>

            <div className="governorate-card-number">
              {item.total_reports}
              <small>بلاغ</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
