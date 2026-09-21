import { useEffect, useState } from 'react'
import {
  Bell,
  ChevronLeft,
  FileText,
  Home,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  X,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import api from './api/client'

const statusLabels = {
  submitted: 'تم التقديم',
  under_review: 'قيد المراجعة',
  assigned: 'تمت الإحالة',
  in_progress: 'قيد المعالجة',
  resolved: 'تم الحل',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
}

const priorityLabels = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
}

const statusClass = {
  submitted: 'submitted',
  under_review: 'review',
  assigned: 'assigned',
  in_progress: 'progress',
  resolved: 'resolved',
  rejected: 'rejected',
  cancelled: 'cancelled',
}

function formatCitizenDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ar-IQ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function CitizenDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('الرئيسية')
  const [reports, setReports] = useState([])
  const [categories, setCategories] = useState([])
  const [governorates, setGovernorates] = useState([])
  const [areas, setAreas] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [history, setHistory] = useState([])
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [form, setForm] = useState({
    category_id: '',
    governorate_id: '',
    area_id: '',
    title: '',
    description: '',
    address_details: '',
  })
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadReports() {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/reports/my')
      setReports(response.data || [])
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onLogout()
        return
      }
      setError('تعذر تحميل بلاغاتك حالياً.')
    } finally {
      setLoading(false)
    }
  }

  async function loadReferenceData() {
    try {
      const [categoriesResponse, governoratesResponse] = await Promise.all([
        api.get('/categories'),
        api.get('/governorates'),
      ])

      setCategories(categoriesResponse.data || [])
      setGovernorates(governoratesResponse.data || [])
    } catch {
      setError('تعذر تحميل بيانات الخدمات والمناطق.')
    }
  }

  useEffect(() => {
    loadReports()
    loadReferenceData()
  }, [])

  async function handleGovernorateChange(value) {
    setForm((current) => ({
      ...current,
      governorate_id: value,
      area_id: '',
    }))
    setAreas([])

    if (!value) return

    try {
      const response = await api.get(`/governorates/${value}/areas`)
      setAreas(response.data || [])
    } catch {
      setError('تعذر تحميل مناطق المحافظة.')
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleCreateReport(event) {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError('')
      setMessage('')

      const payload = {
        category_id: Number(form.category_id),
        governorate_id: Number(form.governorate_id),
        area_id: Number(form.area_id),
        title: form.title.trim(),
        description: form.description.trim(),
        address_details: form.address_details.trim() || null,
      }

      await api.post('/reports', payload)

      setForm({
        category_id: '',
        governorate_id: '',
        area_id: '',
        title: '',
        description: '',
        address_details: '',
      })
      setAreas([])
      setMessage('تم إرسال البلاغ بنجاح.')
      setActivePage('بلاغاتي')
      await loadReports()
    } catch (requestError) {
      const detail = requestError.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'تعذر إرسال البلاغ.')
    } finally {
      setSubmitting(false)
    }
  }

  async function openReport(reportId) {
    try {
      setDetailsLoading(true)
      setError('')
      setSelectedReport(null)
      setHistory([])
      setComments([])

      const [reportResponse, historyResponse, commentsResponse] =
        await Promise.all([
          api.get(`/reports/${reportId}`),
          api.get(`/reports/${reportId}/history`),
          api.get(`/reports/${reportId}/comments`),
        ])

      setSelectedReport(reportResponse.data)
      setHistory(historyResponse.data || [])
      setComments(commentsResponse.data || [])
    } catch {
      setError('تعذر تحميل تفاصيل البلاغ.')
    } finally {
      setDetailsLoading(false)
    }
  }

  async function cancelReport() {
    if (!selectedReport) return

    try {
      setError('')
      await api.post(`/reports/${selectedReport.id}/cancel`)
      setMessage('تم إلغاء البلاغ.')
      await openReport(selectedReport.id)
      await loadReports()
    } catch (requestError) {
      const detail = requestError.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'تعذر إلغاء البلاغ.')
    }
  }

  async function addComment(event) {
    event.preventDefault()

    if (!selectedReport || !commentText.trim()) return

    try {
      setError('')
      await api.post(`/reports/${selectedReport.id}/comments`, {
        content: commentText.trim(),
      })
      setCommentText('')

      const response = await api.get(
        `/reports/${selectedReport.id}/comments`,
      )
      setComments(response.data || [])
    } catch (requestError) {
      const detail = requestError.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'تعذر إضافة التعليق.')
    }
  }

  const openReports = reports.filter(
    (report) =>
      !['resolved', 'rejected', 'cancelled'].includes(report.status),
  ).length

  const resolvedReports = reports.filter(
    (report) => report.status === 'resolved',
  ).length

  return (
    <div className="citizen-shell" dir="rtl">
      <aside className="citizen-sidebar">
        <div className="citizen-brand">
          <div className="citizen-brand-mark">خ</div>
          <div>
            <strong>خدمتي</strong>
            <span>بوابة المواطن</span>
          </div>
        </div>

        <div className="citizen-user-card">
          <div className="citizen-avatar">
            {user.full_name?.charAt(0) || 'م'}
          </div>
          <div>
            <strong>{user.full_name}</strong>
            <span>مواطن</span>
          </div>
        </div>

        <nav className="citizen-nav">
          <button
            className={activePage === 'الرئيسية' ? 'active' : ''}
            onClick={() => setActivePage('الرئيسية')}
          >
            <Home size={19} />
            <span>الرئيسية</span>
            <ChevronLeft size={16} />
          </button>

          <button
            className={activePage === 'بلاغاتي' ? 'active' : ''}
            onClick={() => setActivePage('بلاغاتي')}
          >
            <FileText size={19} />
            <span>بلاغاتي</span>
            <ChevronLeft size={16} />
          </button>

          <button
            className={activePage === 'بلاغ جديد' ? 'active' : ''}
            onClick={() => {
              setMessage('')
              setError('')
              setActivePage('بلاغ جديد')
            }}
          >
            <Plus size={19} />
            <span>تقديم بلاغ</span>
            <ChevronLeft size={16} />
          </button>
        </nav>

        <div className="citizen-sidebar-bottom">
          <div className="citizen-secure">
            <span>●</span>
            <div>
              <strong>منصة خدمية آمنة</strong>
              <small>بياناتك محفوظة</small>
            </div>
          </div>

          <button className="citizen-logout" onClick={onLogout}>
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="citizen-main">
        <header className="citizen-topbar">
          <div>
            <span>منصة الخدمات العامة</span>
            <h1>{activePage}</h1>
          </div>

          <div className="citizen-top-actions">
            <button
              className="citizen-icon-button"
              aria-label="الإشعارات"
              title="الإشعارات"
            >
              <Bell size={20} />
            </button>

            <div className="citizen-mini-user">
              <div className="citizen-avatar small">
                {user.full_name?.charAt(0) || 'م'}
              </div>
              <span>{user.full_name}</span>
            </div>
          </div>
        </header>

        {(message || error) && (
          <div className={`citizen-alert ${error ? 'error' : 'success'}`}>
            <span>{error || message}</span>
            <button
              onClick={() => {
                setMessage('')
                setError('')
              }}
              aria-label="إغلاق"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {activePage === 'الرئيسية' && (
          <section className="citizen-page">
            <div className="citizen-hero">
              <div>
                <span>أهلاً بك 👋</span>
                <h2>شنو المشكلة اللي تريد تبلغ عنها؟</h2>
                <p>
                  قدّم بلاغك بسهولة وتابع حالته من لحظة الإرسال إلى إتمام
                  المعالجة.
                </p>
                <button
                  className="citizen-primary-button"
                  onClick={() => {
                    setMessage('')
                    setError('')
                    setActivePage('بلاغ جديد')
                  }}
                >
                  <Plus size={19} />
                  تقديم بلاغ جديد
                </button>
              </div>

              <div className="citizen-hero-icon">
                <MapPin size={72} strokeWidth={1.2} />
              </div>
            </div>

            <div className="citizen-stat-grid">
              <div className="citizen-stat-card">
                <FileText size={22} />
                <span>إجمالي بلاغاتي</span>
                <strong>{reports.length}</strong>
              </div>

              <div className="citizen-stat-card">
                <RefreshCw size={22} />
                <span>بلاغات قيد المتابعة</span>
                <strong>{openReports}</strong>
              </div>

              <div className="citizen-stat-card">
                <div className="citizen-stat-check">✓</div>
                <span>بلاغات محلولة</span>
                <strong>{resolvedReports}</strong>
              </div>
            </div>

            <div className="citizen-section-heading">
              <div>
                <span>آخر البلاغات</span>
                <h3>بلاغاتك الأخيرة</h3>
              </div>
              <button onClick={() => setActivePage('بلاغاتي')}>
                عرض الكل
                <ChevronLeft size={16} />
              </button>
            </div>

            <ReportList
              reports={reports.slice(0, 4)}
              loading={loading}
              onOpen={openReport}
            />
          </section>
        )}

        {activePage === 'بلاغاتي' && (
          <section className="citizen-page">
            <div className="citizen-section-heading large">
              <div>
                <span>متابعة الخدمات</span>
                <h2>بلاغاتي</h2>
              </div>

              <button
                className="citizen-primary-button compact"
                onClick={() => setActivePage('بلاغ جديد')}
              >
                <Plus size={18} />
                بلاغ جديد
              </button>
            </div>

            <ReportList
              reports={reports}
              loading={loading}
              onOpen={openReport}
            />
          </section>
        )}

        {activePage === 'بلاغ جديد' && (
          <section className="citizen-page">
            <div className="citizen-form-card">
              <div className="citizen-form-heading">
                <div className="citizen-form-icon">
                  <Plus size={22} />
                </div>
                <div>
                  <span>خدمة المواطن</span>
                  <h2>تقديم بلاغ جديد</h2>
                  <p>
                    أدخل تفاصيل المشكلة حتى يتمكن فريق الخدمة من متابعتها.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateReport}>
                <div className="citizen-form-grid">
                  <label>
                    تصنيف الخدمة
                    <select
                      required
                      value={form.category_id}
                      onChange={(event) =>
                        updateForm('category_id', event.target.value)
                      }
                    >
                      <option value="">اختاري التصنيف</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name_ar || category.name_en}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    المحافظة
                    <select
                      required
                      value={form.governorate_id}
                      onChange={(event) =>
                        handleGovernorateChange(event.target.value)
                      }
                    >
                      <option value="">اختاري المحافظة</option>
                      {governorates.map((governorate) => (
                        <option key={governorate.id} value={governorate.id}>
                          {governorate.name_ar || governorate.name_en}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    المنطقة
                    <select
                      required
                      disabled={!form.governorate_id}
                      value={form.area_id}
                      onChange={(event) =>
                        updateForm('area_id', event.target.value)
                      }
                    >
                      <option value="">اختاري المنطقة</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name_ar || area.name_en}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    عنوان البلاغ
                    <input
                      required
                      minLength={5}
                      maxLength={255}
                      value={form.title}
                      onChange={(event) =>
                        updateForm('title', event.target.value)
                      }
                      placeholder="مثال: انقطاع الماء في المنطقة"
                    />
                  </label>

                  <label className="full">
                    وصف المشكلة
                    <textarea
                      required
                      minLength={10}
                      value={form.description}
                      onChange={(event) =>
                        updateForm('description', event.target.value)
                      }
                      placeholder="اشرحي المشكلة بالتفصيل..."
                      rows={5}
                    />
                  </label>

                  <label className="full">
                    تفاصيل العنوان
                    <input
                      value={form.address_details}
                      onChange={(event) =>
                        updateForm('address_details', event.target.value)
                      }
                      placeholder="اسم الشارع، الحي، أو أقرب نقطة دالة"
                    />
                  </label>
                </div>

                <div className="citizen-form-actions">
                  <button
                    type="button"
                    className="citizen-secondary-button"
                    onClick={() => setActivePage('الرئيسية')}
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    className="citizen-primary-button"
                    disabled={submitting}
                  >
                    <Send size={18} />
                    {submitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </main>

      {(selectedReport || detailsLoading) && (
        <div className="citizen-modal-backdrop">
          <div className="citizen-modal">
            <button
              className="citizen-modal-close"
              onClick={() => setSelectedReport(null)}
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>

            {detailsLoading ? (
              <div className="citizen-modal-loading">
                جاري تحميل تفاصيل البلاغ...
              </div>
            ) : (
              selectedReport && (
                <>
                  <div className="citizen-modal-header">
                    <span>{selectedReport.reference_number}</span>
                    <h2>{selectedReport.title}</h2>
                    <div className="citizen-status-row">
                      <span
                        className={`citizen-status ${
                          statusClass[selectedReport.status] || ''
                        }`}
                      >
                        {statusLabels[selectedReport.status] ||
                          selectedReport.status}
                      </span>
                      <span className="citizen-priority">
                        الأولوية: {priorityLabels[selectedReport.priority] ||
                          selectedReport.priority}
                      </span>
                    </div>
                  </div>

                  <div className="citizen-detail-grid">
                    <div>
                      <small>التصنيف</small>
                      <strong>
                        {selectedReport.category?.name || '-'}
                      </strong>
                    </div>
                    <div>
                      <small>المحافظة</small>
                      <strong>
                        {selectedReport.governorate?.name || '-'}
                      </strong>
                    </div>
                    <div>
                      <small>المنطقة</small>
                      <strong>{selectedReport.area?.name || '-'}</strong>
                    </div>
                    <div>
                      <small>تاريخ التقديم</small>
                      <strong>
                        {formatCitizenDate(selectedReport.created_at)}
                      </strong>
                    </div>
                  </div>

                  <div className="citizen-detail-block">
                    <small>وصف المشكلة</small>
                    <p>{selectedReport.description}</p>
                  </div>

                  {selectedReport.address_details && (
                    <div className="citizen-detail-block">
                      <small>تفاصيل العنوان</small>
                      <p>{selectedReport.address_details}</p>
                    </div>
                  )}

                  {selectedReport.resolution_summary && (
                    <div className="citizen-resolution">
                      <small>ملخص الحل</small>
                      <p>{selectedReport.resolution_summary}</p>
                    </div>
                  )}

                  <div className="citizen-history">
                    <div className="citizen-detail-title">
                      <RefreshCw size={18} />
                      <h3>رحلة البلاغ</h3>
                    </div>

                    {(() => {
                      const normalSteps = [
                        'submitted',
                        'under_review',
                        'assigned',
                        'in_progress',
                        'resolved',
                      ]

                      const terminalStatus = ['rejected', 'cancelled'].includes(
                        selectedReport.status,
                      )

                      const steps = terminalStatus
                        ? [...normalSteps.slice(0, 2), selectedReport.status]
                        : normalSteps

                      const currentIndex = steps.indexOf(selectedReport.status)

                      return (
                        <div className="citizen-timeline">
                          {steps.map((step, index) => {
                            const completed =
                              currentIndex >= 0 && index < currentIndex
                            const current = step === selectedReport.status

                            const historyItem = [...history]
                              .reverse()
                              .find((item) => item.new_status === step)

                            return (
                              <div
                                className={`citizen-timeline-item ${
                                  completed ? 'completed' : ''
                                } ${current ? 'current' : ''}`}
                                key={step}
                              >
                                <div className="timeline-marker">
                                  {completed || current ? (
                                    <CheckCircle2 size={20} />
                                  ) : (
                                    <Circle size={18} />
                                  )}
                                </div>

                                <div className="citizen-timeline-content">
                                  <strong>
                                    {statusLabels[step] || step}
                                  </strong>

                                  {current && (
                                    <span className="timeline-current-badge">
                                      الحالة الحالية
                                    </span>
                                  )}

                                  {historyItem?.note && (
                                    <p>{historyItem.note}</p>
                                  )}

                                  {historyItem?.created_at && (
                                    <small>
                                      {formatCitizenDate(
                                        historyItem.created_at,
                                      )}
                                    </small>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>

                  <div className="citizen-comments">
                    <div className="citizen-detail-title">
                      <MessageSquare size={18} />
                      <h3>التعليقات</h3>
                    </div>

                    {comments.length === 0 ? (
                      <p className="citizen-empty-small">
                        لا توجد تعليقات حتى الآن.
                      </p>
                    ) : (
                      <div className="citizen-comment-list">
                        {comments.map((comment) => (
                          <div className="citizen-comment" key={comment.id}>
                            <strong>{comment.author?.full_name || 'مستخدم'}</strong>
                            <p>{comment.content}</p>
                            <small>
                              {formatCitizenDate(comment.created_at)}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}

                    <form
                      className="citizen-comment-form"
                      onSubmit={addComment}
                    >
                      <input
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        placeholder="اكتبي تعليقاً أو استفساراً..."
                      />
                      <button type="submit" aria-label="إرسال التعليق">
                        <Send size={17} />
                      </button>
                    </form>
                  </div>

                  {['submitted', 'under_review'].includes(
                    selectedReport.status,
                  ) && (
                    <div className="citizen-modal-footer">
                      <button
                        className="citizen-danger-button"
                        onClick={cancelReport}
                      >
                        إلغاء البلاغ
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ReportList({ reports, loading, onOpen }) {
  if (loading) {
    return (
      <div className="citizen-empty-card">
        جاري تحميل البلاغات...
      </div>
    )
  }

  if (!reports.length) {
    return (
      <div className="citizen-empty-card">
        <FileText size={34} />
        <strong>ما عندچ بلاغات حالياً</strong>
        <span>من هنا راح تظهر كل البلاغات اللي تقدمينها.</span>
      </div>
    )
  }

  return (
    <div className="citizen-report-list">
      {reports.map((report) => (
        <button
          className="citizen-report-card"
          key={report.id}
          onClick={() => onOpen(report.id)}
        >
          <div className="citizen-report-icon">
            <FileText size={21} />
          </div>

          <div className="citizen-report-content">
            <div className="citizen-report-top">
              <span>{report.reference_number}</span>
              <span
                className={`citizen-status ${
                  statusClass[report.status] || ''
                }`}
              >
                {statusLabels[report.status] || report.status}
              </span>
            </div>

            <h3>{report.title}</h3>
            <p>{report.description}</p>

            <small>{formatCitizenDate(report.created_at)}</small>
          </div>

          <ChevronLeft size={20} className="citizen-report-arrow" />
        </button>
      ))}
    </div>
  )
}
