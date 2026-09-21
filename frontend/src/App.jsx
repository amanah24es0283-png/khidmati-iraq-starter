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

  function handleSearch(event) {
    event.preventDefault()
    loadReports(1)
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setPriority('')
    setUrgentOnly(false)
    setPage(1)
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
                        onClick={() => setSelectedReport(report)}
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
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="report-modal panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="welcome-label">تفاصيل البلاغ</span>
                <h3>{selectedReport.title || 'بدون عنوان'}</h3>
              </div>

              <button
                className="modal-close"
                onClick={() => setSelectedReport(null)}
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <div className="report-detail-grid">
              <div>
                <span>رقم البلاغ</span>
                <strong>
                  #{selectedReport.reference_number || selectedReport.id}
                </strong>
              </div>

              <div>
                <span>التصنيف</span>
                <strong>#{selectedReport.category_id ?? '-'}</strong>
              </div>

              <div>
                <span>الحالة</span>
                <strong>
                  {statusLabels[selectedReport.status] ||
                    selectedReport.status ||
                    '-'}
                </strong>
              </div>

              <div>
                <span>الأولوية</span>
                <strong>
                  {priorityLabels[selectedReport.priority] ||
                    selectedReport.priority ||
                    '-'}
                </strong>
              </div>

              <div>
                <span>المحافظة</span>
                <strong>#{selectedReport.governorate_id ?? '-'}</strong>
              </div>

              <div>
                <span>الموظف المحال إليه</span>
                <strong>
                  #{selectedReport.assigned_employee_id ?? '-'}
                </strong>
              </div>
            </div>

            <div className="report-description">
              <span>الوصف</span>
              <p>
                {selectedReport.description ||
                  'لا يوجد وصف إضافي لهذا البلاغ.'}
              </p>
            </div>

            <div className="report-meta">
              <span>
                تاريخ الإنشاء: {formatDate(selectedReport.created_at)}
              </span>
            </div>
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
