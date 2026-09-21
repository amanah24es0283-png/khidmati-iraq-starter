import {
  Bell,
  ChevronLeft,
  FileText,
  Home,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'
import Login from './Login'
import CitizenDashboard from './CitizenDashboard'
import { clearSession, getToken, getUser } from './auth'
import api from './api/client'

const navigation = [
  { label: 'الرئيسية', icon: Home, active: true },
  { label: 'البلاغات', icon: FileText },
  { label: 'المستخدمون', icon: Users },
  { label: 'سجل التدقيق', icon: ShieldCheck },
  { label: 'الإعدادات', icon: Settings },
]

const statusLabels = {
  submitted: 'مقدّم',
  under_review: 'قيد المراجعة',
  assigned: 'مُحال',
  in_progress: 'قيد التنفيذ',
  resolved: 'تم الحل',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
}

const statusTones = {
  submitted: 'amber',
  under_review: 'amber',
  assigned: 'blue',
  in_progress: 'blue',
  resolved: 'green',
  rejected: 'red',
  cancelled: 'red',
}

const priorityLabels = {
  urgent: 'عاجل',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
}

const priorityTones = {
  urgent: 'red',
  high: 'red',
  medium: 'amber',
  low: 'green',
}

function formatDate(value) {
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

function formatShortDate(value) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ar-IQ', {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activePage, setActivePage] = useState('الرئيسية')
  const [user, setUser] = useState(getUser)
  const [token, setToken] = useState(getToken)
  const [theme, setTheme] = useState(
    () => localStorage.getItem('khidmati_theme') || 'blue'
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('khidmati_theme', theme)
  }, [theme])


  const [dashboard, setDashboard] = useState(null)
  const [trendData, setTrendData] = useState([])
  const [recentReports, setRecentReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !user) return

    let cancelled = false

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const [dashboardResponse, trendsResponse, reportsResponse] =
          await Promise.all([
            api.get('/admin/dashboard'),
            api.get('/admin/dashboard/status-trends', {
              params: { days: 7 },
            }),
            api.get('/admin/reports', {
              params: { page: 1, page_size: 5 },
            }),
          ])

        if (cancelled) return

        setDashboard(dashboardResponse.data)
        setTrendData(trendsResponse.data?.data || [])
        setRecentReports(reportsResponse.data?.items || [])
      } catch (requestError) {
        if (cancelled) return

        if (requestError.response?.status === 401) {
          clearSession()
          setToken(null)
          setUser(null)
          return
        }

        if (requestError.response?.status === 403) {
          setError('ليس لديك صلاحية للوصول إلى لوحة تحكم الإدارة.')
        } else {
          setError(
            'تعذر تحميل بيانات لوحة التحكم. تأكدي من تشغيل الـ Backend وقاعدة البيانات.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [token, user])

  if (!token || !user) {
    return (
      <Login
        onLogin={(loggedInUser) => {
          setUser(loggedInUser)
          setToken(getToken())
        }}
      />
    )
  }

  if (user.role === 'citizen') {
    return (
      <CitizenDashboard
        user={user}
        onLogout={() => {
          clearSession()
          setToken(null)
          setUser(null)
        }}
      />
    )
  }

  function handleLogout() {
    clearSession()
    setToken(null)
    setUser(null)
  }

  const stats = [
    {
      label: 'إجمالي البلاغات',
      value: dashboard?.total_reports ?? '-',
      tone: 'blue',
    },
    {
      label: 'بلاغات مفتوحة',
      value: dashboard?.open_reports ?? '-',
      tone: 'amber',
    },
    {
      label: 'بلاغات محلولة',
      value: dashboard?.resolved_reports ?? '-',
      tone: 'green',
    },
    {
      label: 'بلاغات عاجلة',
      value: dashboard?.urgent_reports ?? '-',
      tone: 'red',
    },
  ]

  const statusCounts = dashboard?.reports_by_status || {}
  const totalReports = dashboard?.total_reports || 0

  const statusDistribution = Object.entries(statusCounts)
    .map(([status, count]) => ({
      status,
      label: statusLabels[status] || status,
      count,
      percentage: totalReports ? Math.round((count / totalReports) * 100) : 0,
      tone: statusTones[status] || 'blue',
    }))
    .sort((a, b) => b.count - a.count)

  const chartData = trendData.map((day) => ({
    date: formatShortDate(day.date),
    submitted: day.submitted || 0,
    under_review: day.under_review || 0,
    assigned: day.assigned || 0,
    in_progress: day.in_progress || 0,
    resolved: day.resolved || 0,
    rejected: day.rejected || 0,
    cancelled: day.cancelled || 0,
  }))

  return (
    <div className="app-shell" dir="rtl">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="إغلاق القائمة"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">خ</div>

          <div>
            <strong>خدمتي</strong>
            <span>Khidmati Iraq</span>
          </div>

          <button
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق القائمة"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-title">القائمة الرئيسية</div>

        <nav className="nav-list">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activePage === label ? 'active' : ''}`}
              onClick={() => {
                setActivePage(label)
                setSidebarOpen(false)
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {activePage === label && (
                <ChevronLeft className="nav-arrow" size={17} />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="support-card">
            <ShieldCheck size={22} />

            <div>
              <strong>النظام آمن</strong>
              <span>جميع العمليات مسجلة</span>
            </div>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu size={22} />
          </button>

          <div className="page-heading">
            <div className="eyebrow">منصة الخدمات العامة</div>
            <h1>لوحة التحكم</h1>
          </div>

          <div className="topbar-actions">
            <div className="theme-switcher" aria-label="اختيار ألوان الواجهة">
              <button
                className={`theme-dot theme-blue ${theme === 'blue' ? 'selected' : ''}`}
                onClick={() => setTheme('blue')}
                aria-label="أزرق"
                title="أزرق"
              />
              <button
                className={`theme-dot theme-beige ${theme === 'beige' ? 'selected' : ''}`}
                onClick={() => setTheme('beige')}
                aria-label="بيج"
                title="بيج"
              />
              <button
                className={`theme-dot theme-olive ${theme === 'olive' ? 'selected' : ''}`}
                onClick={() => setTheme('olive')}
                aria-label="زيتي"
                title="زيتي"
              />
              <button
                className={`theme-dot theme-dark ${theme === 'dark' ? 'selected' : ''}`}
                onClick={() => setTheme('dark')}
                aria-label="داكن"
                title="داكن"
              />
            </div>
            <button className="icon-button notification" aria-label="الإشعارات">
              <Bell size={20} />
              <span />
            </button>

            <div className="user-chip">
              <div className="avatar">
                {user.full_name?.charAt(0) || 'خ'}
              </div>

              <div className="user-info">
                <strong>{user.full_name}</strong>
                <span>{user.role}</span>
              </div>
            </div>
          </div>
        </header>

        {activePage === 'البلاغات' ? (
          <ReportsPage />
        ) : activePage === 'المستخدمون' ? (
          <UsersPage />
        ) : activePage === 'سجل التدقيق' ? (
          <AuditLogsPage />
        ) : activePage === 'الإعدادات' ? (
          <SettingsPage />
        ) : (
          <>
        <section className="welcome-card">
          <div>
            <span className="welcome-label">أهلاً بك 👋</span>

            <h2>أهلاً {user.full_name}</h2>

            <p>
              تابع البلاغات والخدمات العامة من مكان واحد، وراقب أداء المنصة
              لحظة بلحظة.
            </p>
          </div>

          <div className="welcome-decoration">
            <ShieldCheck size={64} strokeWidth={1.2} />
          </div>
        </section>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <section className="stats-grid">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <div className={`stat-icon ${stat.tone}`}>
                <FileText size={20} />
              </div>

              <div className="stat-copy">
                <span>{stat.label}</span>
                <strong>{loading ? '...' : stat.value}</strong>
              </div>

              <span className={`stat-change ${stat.tone}`}>
                {stat.label === 'بلاغات محلولة' &&
                dashboard?.resolution_rate != null
                  ? `${dashboard.resolution_rate}%`
                  : ''}
              </span>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <article className="panel chart-panel">
            <div className="panel-header">
              <div>
                <h3>حركة البلاغات</h3>
                <span>آخر 7 أيام</span>
              </div>

              <span className="select-button">
                هذا الأسبوع
                <ChevronLeft size={15} />
              </span>
            </div>

            <div className="chart-container">
              {loading ? (
                <div className="empty-state">جاري تحميل البيانات...</div>
              ) : chartData.length === 0 ? (
                <div className="empty-state">لا توجد بيانات للحركة.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      formatter={(value, name) => [
                        value,
                        statusLabels[name] || name,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="submitted"
                      name="submitted"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="under_review"
                      name="under_review"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="in_progress"
                      name="in_progress"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      name="resolved"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="panel status-panel">
            <div className="panel-header">
              <div>
                <h3>حالة البلاغات</h3>
                <span>التوزيع الحالي</span>
              </div>
            </div>

            <div className="status-list">
              {loading ? (
                <div className="empty-state">جاري تحميل البيانات...</div>
              ) : statusDistribution.length === 0 ? (
                <div className="empty-state">لا توجد بيانات.</div>
              ) : (
                statusDistribution.map((item) => (
                  <StatusRow
                    key={item.status}
                    label={item.label}
                    value={`${item.percentage}%`}
                    tone={item.tone}
                  />
                ))
              )}
            </div>
          </article>
        </section>

        <section className="panel reports-panel">
          <div className="panel-header">
            <div>
              <h3>أحدث البلاغات</h3>
              <span>آخر العمليات المسجلة على المنصة</span>
            </div>

            <button className="primary-outline">
              عرض كل البلاغات
              <ChevronLeft size={16} />
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>البلاغ</th>
                  <th>التصنيف</th>
                  <th>الحالة</th>
                  <th>الأولوية</th>
                  <th>التاريخ</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="table-empty">
                      جاري تحميل البلاغات...
                    </td>
                  </tr>
                ) : recentReports.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="table-empty">
                      لا توجد بلاغات حالياً.
                    </td>
                  </tr>
                ) : (
                  recentReports.map((report) => {
                    const status = report.status
                    const priority = report.priority

                    return (
                      <tr key={report.id}>
                        <td>
                          <strong>{report.title}</strong>
                          <span>#{report.reference_number}</span>
                        </td>

                        <td>#{report.category_id}</td>

                        <td>
                          <span
                            className={`badge status-${
                              statusTones[status] || 'blue'
                            }`}
                          >
                            {statusLabels[status] || status}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`badge priority-${
                              priorityTones[priority] || 'blue'
                            }`}
                          >
                            {priorityLabels[priority] || priority}
                          </span>
                        </td>

                        <td title={formatDate(report.created_at)}>
                          {formatDate(report.created_at)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

          </>
        )}

        <footer>
          خدمتي العراق © 2026 — منصة رقمية لإدارة بلاغات الخدمات العامة
        </footer>
      </main>
    </div>
  )
}



function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchLogs() {
      try {
        setLoading(true)
        setError('')

        const response = await api.get('/admin/audit-logs')
        const data = response.data

        if (!cancelled) {
          setLogs(data?.items || data || [])
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.response?.status === 403
              ? 'ليس لديك صلاحية للوصول إلى سجل التدقيق.'
              : 'تعذر تحميل سجل التدقيق. تأكدي من تشغيل الـBackend.'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchLogs()

    return () => {
      cancelled = true
    }
  }, [])

  async function loadLogs() {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/admin/audit-logs')
      const data = response.data
      setLogs(data?.items || data || [])
    } catch (requestError) {
      setError(
        requestError.response?.status === 403
          ? 'ليس لديك صلاحية للوصول إلى سجل التدقيق.'
          : 'تعذر تحميل سجل التدقيق.'
      )
    } finally {
      setLoading(false)
    }
  }

  const actionLabels = {
    REPORT_CREATED: 'إنشاء بلاغ',
    REPORT_STATUS_CHANGED: 'تغيير حالة البلاغ',
    REPORT_RESOLVED: 'حل بلاغ',
    INTERNAL_NOTE_ADDED: 'إضافة ملاحظة داخلية',
    REPORT_ASSIGNED: 'تعيين بلاغ',
    REPORT_PRIORITY_CHANGED: 'تغيير أولوية البلاغ',
  }

  return (
    <section className="audit-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">الأمان والمراقبة</span>
          <h2>سجل التدقيق</h2>
          <p>متابعة العمليات المهمة التي تمت داخل المنصة وتسجيل المستخدم والوقت ونوع الإجراء.</p>
        </div>

        <div className="page-count-card">
          <strong>{logs.length}</strong>
          <span>عملية</span>
        </div>
      </div>

      {error && <div className="reports-error">{error}</div>}

      <div className="audit-panel panel">
        <div className="panel-heading">
          <div>
            <h3>آخر العمليات</h3>
            <span>{logs.length} سجل متاح</span>
          </div>

          <button className="secondary-button" type="button" onClick={loadLogs}>
            تحديث
          </button>
        </div>

        {loading ? (
          <div className="empty-state">جاري تحميل سجل التدقيق...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">لا توجد عمليات مسجلة حالياً.</div>
        ) : (
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>الإجراء</th>
                  <th>المستخدم</th>
                  <th>البلاغ</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="audit-action">
                        {actionLabels[log.action] || log.action || '—'}
                      </span>
                    </td>
                    <td>{log.user_id || 'النظام'}</td>
                    <td>{log.report_id ? `#${log.report_id}` : '—'}</td>
                    <td>{formatDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function SettingsPage() {
  const [theme, setTheme] = useState(
    localStorage.getItem('khidmati_theme') ||
      document.documentElement.dataset.theme ||
      'beige'
  )

  const user = getUser()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('khidmati_theme', theme)
  }, [theme])

  function changeTheme(nextTheme) {
    setTheme(nextTheme)
  }

  function handleLogout() {
    clearSession()
    window.location.reload()
  }

  const themeLabels = {
    beige: 'بيج',
    olive: 'زيتي',
    dark: 'داكن',
  }

  return (
    <section className="settings-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">تخصيص المنصة</span>
          <h2>الإعدادات</h2>
          <p>إدارة مظهر المنصة ومراجعة معلومات الحساب والجلسة الحالية.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card panel">
          <div className="settings-card-heading">
            <div>
              <h3>مظهر المنصة</h3>
              <span>اختاري المظهر المناسب لكِ.</span>
            </div>
          </div>

          <div className="theme-options">
            {Object.entries(themeLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`theme-option ${theme === value ? 'selected' : ''}`}
                onClick={() => changeTheme(value)}
              >
                <span className={`theme-preview ${value}`} />
                <span>{label}</span>
                {theme === value && <strong>✓</strong>}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-card panel">
          <div className="settings-card-heading">
            <div>
              <h3>الحساب الحالي</h3>
              <span>معلومات الجلسة المسجلة.</span>
            </div>
          </div>

          <div className="account-info">
            <div className="account-row">
              <span>الاسم</span>
              <strong>{user?.full_name || 'غير متوفر'}</strong>
            </div>

            <div className="account-row">
              <span>البريد الإلكتروني</span>
              <strong>{user?.email || 'غير متوفر'}</strong>
            </div>

            <div className="account-row">
              <span>الدور</span>
              <strong>
                {user?.role === 'admin'
                  ? 'مدير النظام'
                  : user?.role === 'employee'
                    ? 'موظف'
                    : 'مواطن'}
              </strong>
            </div>

            <div className="account-row">
              <span>الحالة</span>
              <strong className="account-active">
                {user?.is_active ? 'نشط' : 'متوقف'}
              </strong>
            </div>
          </div>
        </div>

        <div className="settings-card panel">
          <div className="settings-card-heading">
            <div>
              <h3>الاتصال بالنظام</h3>
              <span>عنوان الـAPI المستخدم من الواجهة.</span>
            </div>
          </div>

          <div className="api-address">
            {import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'}
          </div>
        </div>

        <div className="settings-card panel danger-card">
          <div className="settings-card-heading">
            <div>
              <h3>الجلسة</h3>
              <span>إنهاء جلسة المدير الحالية.</span>
            </div>
          </div>

          <button
            className="logout-settings-button"
            type="button"
            onClick={handleLogout}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </section>
  )
}

function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  async function loadUsers() {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/admin/users')
      setUsers(response.data || [])
    } catch (requestError) {
      if (requestError.response?.status === 403) {
        setError('ليس لديك صلاحية للوصول إلى المستخدمين.')
      } else {
        setError('تعذر تحميل المستخدمين. تأكدي من تشغيل الـBackend.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function fetchUsers() {
      try {
        setLoading(true)
        setError('')
        const response = await api.get('/admin/users')

        if (!cancelled) {
          setUsers(response.data || [])
        }
      } catch (requestError) {
        if (!cancelled) {
          if (requestError.response?.status === 403) {
            setError('ليس لديك صلاحية للوصول إلى المستخدمين.')
          } else {
            setError('تعذر تحميل المستخدمين. تأكدي من تشغيل الـBackend.')
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchUsers()

    return () => {
      cancelled = true
    }
  }, [])

  async function toggleUserStatus(userId) {
    try {
      setUpdatingId(userId)
      setError('')
      const response = await api.patch(`/admin/users/${userId}/status`)

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === userId ? response.data : item
        )
      )
    } catch (requestError) {
      if (requestError.response?.status === 403) {
        setError('ليس لديك صلاحية لتغيير حالة المستخدم.')
      } else {
        setError('تعذر تحديث حالة المستخدم.')
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const roleLabels = {
    citizen: 'مواطن',
    employee: 'موظف',
    admin: 'مدير',
  }

  return (
    <section className="users-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">إدارة الخدمات</span>
          <h2>المستخدمون</h2>
          <p>إدارة حسابات المستخدمين ومتابعة أدوارهم وحالة الوصول إلى المنصة.</p>
        </div>

        <div className="page-count-card">
          <strong>{users.length}</strong>
          <span>مستخدم</span>
        </div>
      </div>

      {error && <div className="reports-error">{error}</div>}

      <div className="users-panel panel">
        <div className="panel-heading">
          <div>
            <h3>قائمة المستخدمين</h3>
            <span>{users.length} حساب مسجل</span>
          </div>

          <button className="secondary-button" type="button" onClick={loadUsers}>
            تحديث
          </button>
        </div>

        {loading ? (
          <div className="empty-state">جاري تحميل المستخدمين...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">لا يوجد مستخدمون.</div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>البريد الإلكتروني</th>
                  <th>الهاتف</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                  <th>تاريخ التسجيل</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {(item.full_name || 'م').trim().charAt(0)}
                        </div>
                        <div>
                          <strong>{item.full_name}</strong>
                          <span>#{item.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>{item.email}</td>
                    <td>{item.phone_number || '—'}</td>

                    <td>
                      <span className="role-badge">
                        {roleLabels[item.role] || item.role}
                      </span>
                    </td>

                    <td>
                      <span className={`user-status ${item.is_active ? 'active' : 'inactive'}`}>
                        <span className="status-dot" />
                        {item.is_active ? 'نشط' : 'متوقف'}
                      </span>
                    </td>

                    <td>{formatDate(item.created_at)}</td>

                    <td>
                      <button
                        className={`user-action-button ${item.is_active ? 'danger' : 'success'}`}
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => toggleUserStatus(item.id)}
                      >
                        {updatingId === item.id
                          ? 'جاري التحديث...'
                          : item.is_active
                            ? 'تعطيل'
                            : 'تفعيل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function ReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [selectedReport, setSelectedReport] = useState(null)
  const [reportDetails, setReportDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [employees, setEmployees] = useState([])
  const [savingAction, setSavingAction] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [editPriority, setEditPriority] = useState('')
  const [editEmployee, setEditEmployee] = useState('')


  async function loadReports(currentPage = 1, filters = {}) {
    try {
      setLoading(true)
      setError('')

      const params = {
        page: currentPage,
        page_size: pageSize,
        search: filters.search ?? search,
        status: filters.status ?? status,
        priority: filters.priority ?? priority,
        urgent_only: filters.urgentOnly ?? urgentOnly,
      }

      Object.keys(params).forEach((key) => {
        if (params[key] === '' || params[key] === false || params[key] == null) {
          delete params[key]
        }
      })

      const response = await api.get('/admin/reports', { params })

      setReports(response.data?.items || [])
      setTotal(response.data?.total || 0)
      setPage(currentPage)
    } catch (requestError) {
      if (requestError.response?.status === 403) {
        setError('ليس لديك صلاحية للوصول إلى البلاغات.')
      } else {
        setError('تعذر تحميل البلاغات. تأكدي من تشغيل الـBackend.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadInitialReports() {
      try {
        setLoading(true)
        setError('')

        const response = await api.get('/admin/reports', {
          params: {
            page: 1,
            page_size: pageSize,
          },
        })

        if (cancelled) return

        setReports(response.data?.items || [])
        setTotal(response.data?.total || 0)
        setPage(1)
      } catch (requestError) {
        if (cancelled) return

        if (requestError.response?.status === 403) {
          setError('ليس لديك صلاحية للوصول إلى البلاغات.')
        } else {
          setError('تعذر تحميل البلاغات. تأكدي من تشغيل الـBackend.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInitialReports()

    return () => {
      cancelled = true
    }
  }, [pageSize])

  async function openReportDetails(report) {
    setSelectedReport(report)
    setReportDetails(null)
    setDetailsError('')
    setDetailsLoading(true)

    try {
      const response = await api.get(`/admin/reports/${report.id}`)
      setReportDetails(response.data)
    setEditStatus(response.data.status || '')
    setEditPriority(response.data.priority || '')
    setEditEmployee(response.data.assigned_employee_id || '')

    } catch (requestError) {
      if (requestError.response?.status === 403) {
        setDetailsError('ليس لديك صلاحية لعرض تفاصيل هذا البلاغ.')
      } else if (requestError.response?.status === 404) {
        setDetailsError('البلاغ غير موجود.')
      } else {
        setDetailsError('تعذر تحميل تفاصيل البلاغ.')
      }
    } finally {
      setDetailsLoading(false)
    }
  }

  async function saveReportChanges() {
    if (!reportDetails) return

    try {
      setSavingAction(true)
      setDetailsError('')

      if (editStatus && editStatus !== reportDetails.status) {
        await api.patch(`/admin/reports/${reportDetails.id}/status`, {
          new_status: editStatus,
        })
      }

      if (editPriority && editPriority !== reportDetails.priority) {
        await api.patch(`/admin/reports/${reportDetails.id}/priority`, {
          priority: editPriority,
        })
      }

      if (
        editEmployee &&
        Number(editEmployee) !== Number(reportDetails.assigned_employee_id)
      ) {
        await api.patch(`/admin/reports/${reportDetails.id}/assign`, {
          employee_id: Number(editEmployee),
        })
      }

      const response = await api.get(`/admin/reports/${reportDetails.id}`)
      setReportDetails(response.data)
      setEditStatus(response.data.status || '')
      setEditPriority(response.data.priority || '')
      setEditEmployee(response.data.assigned_employee_id || '')

      await loadReports(page)
    } catch (requestError) {
      console.error('SAVE_REPORT_ERROR:', requestError)
      setDetailsError(
        requestError.response?.data?.detail ||
        requestError.message ||
        'تعذر تحديث بيانات البلاغ.'
      )
    } finally {
      setSavingAction(false)
    }
  }

function handleSearch(event) {
    event.preventDefault()
    loadReports(1)
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setPriority('')
    setUrgentOnly(false)
    loadReports(1, {
      search: '',
      status: '',
      priority: '',
      urgentOnly: false,
    })
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <section className="reports-page">
      <div className="page-intro">
        <div>
          <span className="welcome-label">إدارة الخدمات</span>
          <h2>البلاغات</h2>
          <p>
            عرض ومتابعة البلاغات المسجلة على المنصة مع البحث والفلترة السريعة.
          </p>
        </div>

        <div className="reports-total">
          <strong>{total}</strong>
          <span>بلاغ</span>
        </div>
      </div>

      <form className="reports-filters panel" onSubmit={handleSearch}>
        <div className="filter-field search-field">
          <label htmlFor="report-search">بحث</label>
          <input
            id="report-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="رقم البلاغ أو العنوان أو الوصف..."
          />
        </div>

        <div className="filter-field">
          <label htmlFor="report-status">الحالة</label>
          <select
            id="report-status"
            value={status}
            onChange={(event) => {
              const value = event.target.value
              setStatus(value)
              loadReports(1, { status: value })
            }}
          >
            <option value="">كل الحالات</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="report-priority">الأولوية</label>
          <select
            id="report-priority"
            value={priority}
            onChange={(event) => {
              const value = event.target.value
              setPriority(value)
              loadReports(1, { priority: value })
            }}
          >
            <option value="">كل الأولويات</option>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <label className="urgent-filter">
          <input
            type="checkbox"
            checked={urgentOnly}
            onChange={(event) => {
              const value = event.target.checked
              setUrgentOnly(value)
              loadReports(1, { urgentOnly: value })
            }}
          />
          <span>العاجلة فقط</span>
        </label>

        <div className="filter-actions">
          <button className="primary-button" type="submit">
            بحث
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={clearFilters}
          >
            مسح
          </button>
        </div>
      </form>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <article className="panel reports-panel">
        <div className="panel-header">
          <div>
            <h3>قائمة البلاغات</h3>
            <span>
              {loading ? 'جاري التحميل...' : `${total} نتيجة`}
            </span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>البلاغ</th>
                <th>التصنيف</th>
                <th>الحالة</th>
                <th>الأولوية</th>
                <th>التاريخ</th>
                <th>التفاصيل</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    جاري تحميل البلاغات...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    لا توجد بلاغات مطابقة للبحث الحالي.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <strong>{report.title || 'بدون عنوان'}</strong>
                      <span>#{report.reference_number || report.id}</span>
                    </td>

                    <td>#{report.category_id ?? '-'}</td>

                    <td>
                      <span
                        className={`badge status-${
                          statusTones[report.status] || 'blue'
                        }`}
                      >
                        {statusLabels[report.status] || report.status || '-'}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`badge priority-${
                          priorityTones[report.priority] || 'blue'
                        }`}
                      >
                        {priorityLabels[report.priority] ||
                          report.priority ||
                          '-'}
                      </span>
                    </td>

                    <td title={formatDate(report.created_at)}>
                      {formatDate(report.created_at)}
                    </td>

                    <td>
                      <button
                        className="details-button"
                        onClick={() => openReportDetails(report)}
                      >
                        عرض
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button
            className="secondary-button"
            disabled={page <= 1 || loading}
            onClick={() => loadReports(page - 1)}
          >
            السابق
          </button>

          <span>
            صفحة <strong>{page}</strong> من <strong>{totalPages}</strong>
          </span>

          <button
            className="secondary-button"
            disabled={page >= totalPages || loading}
            onClick={() => loadReports(page + 1)}
          >
            التالي
          </button>
        </div>
      </article>

      {selectedReport && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setSelectedReport(null)
            setReportDetails(null)
          }}
        >
          <div
            className="report-modal report-detail-modal panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="welcome-label">ملف البلاغ</span>
                <h3>
                  {reportDetails?.title ||
                    selectedReport.title ||
                    'بدون عنوان'}
                </h3>
                <span className="report-reference">
                  #{reportDetails?.reference_number ||
                    selectedReport.reference_number ||
                    selectedReport.id}
                </span>
              </div>

              <button
                className="modal-close"
                onClick={() => {
                  setSelectedReport(null)
                  setReportDetails(null)
                }}
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="report-detail-loading">
                <div className="loading-spinner" />
                <strong>جاري تحميل تفاصيل البلاغ...</strong>
                <span>يتم جلب المعلومات المرتبطة بالبلاغ.</span>
              </div>
            ) : detailsError ? (
              <div className="error-message" role="alert">
                {detailsError}
              </div>
            ) : reportDetails ? (
              <>
                <div className="report-status-banner">
                  <div>
                    <span>الحالة الحالية</span>
                    <strong>
                      {statusLabels[reportDetails.status] ||
                        reportDetails.status ||
                        '-'}
                    </strong>
                  </div>

                  <span
                    className={`badge priority-${
                      priorityTones[reportDetails.priority] || 'blue'
                    }`}
                  >
                    {priorityLabels[reportDetails.priority] ||
                      reportDetails.priority ||
                      '-'}
                  </span>
                </div>

                <div className="report-edit-section">
                  <div className="detail-section-title">
                    <ShieldCheck size={18} />
                    <h4>إدارة البلاغ</h4>
                  </div>

                  <div className="report-edit-grid">
                    <label>
                      <span>الحالة</span>
                      <select
                        value={editStatus}
                        onChange={(event) => setEditStatus(event.target.value)}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>الأولوية</span>
                      <select
                        value={editPriority}
                        onChange={(event) => setEditPriority(event.target.value)}
                      >
                        {Object.entries(priorityLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>الموظف</span>
                      <select
                        value={editEmployee}
                        onChange={(event) => setEditEmployee(event.target.value)}
                      >
                        <option value="">اختيار الموظف</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.full_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <button
                    className="primary-button"
                    type="button"
                    disabled={savingAction}
                    onClick={saveReportChanges}
                  >
                    {savingAction ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                </div>

                <div className="report-detail-section">
                  <div className="detail-section-title">
                    <FileText size={18} />
                    <h4>معلومات البلاغ</h4>
                  </div>

                  <div className="report-detail-grid">
                    <div>
                      <span>رقم البلاغ</span>
                      <strong>
                        #{reportDetails.reference_number || reportDetails.id}
                      </strong>
                    </div>

                    <div>
                      <span>التصنيف</span>
                      <strong>
                        {reportDetails.category?.name ||
                          `#${reportDetails.category_id}`}
                      </strong>
                    </div>

                    <div>
                      <span>المحافظة</span>
                      <strong>
                        {reportDetails.governorate?.name ||
                          `#${reportDetails.governorate_id}`}
                      </strong>
                    </div>

                    <div>
                      <span>المنطقة</span>
                      <strong>
                        {reportDetails.area?.name ||
                          `#${reportDetails.area_id}`}
                      </strong>
                    </div>

                    <div>
                      <span>تاريخ الإنشاء</span>
                      <strong>{formatDate(reportDetails.created_at)}</strong>
                    </div>

                    <div>
                      <span>آخر تحديث</span>
                      <strong>{formatDate(reportDetails.updated_at)}</strong>
                    </div>
                  </div>

                  <div className="report-description">
                    <span>الوصف</span>
                    <p>
                      {reportDetails.description ||
                        'لا يوجد وصف إضافي لهذا البلاغ.'}
                    </p>
                  </div>

                  {reportDetails.address_details && (
                    <div className="detail-address">
                      <span>تفاصيل الموقع</span>
                      <strong>{reportDetails.address_details}</strong>
                    </div>
                  )}
                </div>

                <div className="report-detail-section">
                  <div className="detail-section-title">
                    <Users size={18} />
                    <h4>الأطراف المرتبطة</h4>
                  </div>

                  <div className="people-grid">
                    <div className="person-card">
                      <span>المواطن</span>
                      <strong>
                        {reportDetails.citizen?.full_name || 'غير متوفر'}
                      </strong>
                      <small>
                        {reportDetails.citizen?.email || 'لا يوجد بريد'}
                      </small>
                    </div>

                    <div className="person-card">
                      <span>الموظف المحال إليه</span>
                      <strong>
                        {reportDetails.assigned_employee?.full_name ||
                          'لم يتم الإحالة بعد'}
                      </strong>
                      <small>
                        {reportDetails.assigned_employee?.email ||
                          'لا يوجد موظف معيّن'}
                      </small>
                    </div>
                  </div>
                </div>

                {(reportDetails.resolution_summary ||
                  reportDetails.resolved_at) && (
                  <div className="resolution-box">
                    <div className="detail-section-title">
                      <ShieldCheck size={18} />
                      <h4>نتيجة المعالجة</h4>
                    </div>

                    <p>
                      {reportDetails.resolution_summary ||
                        'تمت معالجة البلاغ.'}
                    </p>

                    {reportDetails.resolved_at && (
                      <span>
                        تاريخ الحل: {formatDate(reportDetails.resolved_at)}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}

function StatusRow({ label, value, tone }) {
  return (
    <div className="status-row">
      <div>
        <span className={`dot ${tone}`} />
        {label}
      </div>

      <strong>{value}</strong>
    </div>
  )
}

export default App
