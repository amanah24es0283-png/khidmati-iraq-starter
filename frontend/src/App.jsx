import { Bell, ChevronLeft, FileText, Home, LogOut, Menu, Settings, ShieldCheck, Users, X } from 'lucide-react'
import { useState } from 'react'
import './App.css'
import Login from './Login'
import { clearSession, getToken, getUser } from './auth'

const navigation = [
  { label: 'الرئيسية', icon: Home, active: true },
  { label: 'البلاغات', icon: FileText },
  { label: 'المستخدمون', icon: Users },
  { label: 'سجل التدقيق', icon: ShieldCheck },
  { label: 'الإعدادات', icon: Settings },
]

const stats = [
  { label: 'إجمالي البلاغات', value: '128', change: '+12%', tone: 'blue' },
  { label: 'بلاغات مفتوحة', value: '46', change: '+8%', tone: 'amber' },
  { label: 'بلاغات محلولة', value: '82', change: '+18%', tone: 'green' },
  { label: 'بلاغات عاجلة', value: '9', change: '-4%', tone: 'red' },
]

const recentReports = [
  { id: '#KH-1028', title: 'انقطاع ماء في حي الجامعة', category: 'الماء', status: 'قيد المراجعة', priority: 'عاجل', date: 'اليوم، 10:32' },
  { id: '#KH-1027', title: 'مشكلة إنارة في شارع النصر', category: 'الكهرباء', status: 'قيد التنفيذ', priority: 'متوسط', date: 'اليوم، 09:18' },
  { id: '#KH-1026', title: 'تراكم نفايات في المنطقة الصناعية', category: 'النظافة', status: 'تم الحل', priority: 'منخفض', date: 'أمس، 18:40' },
  { id: '#KH-1025', title: 'حفرة كبيرة قرب المدرسة', category: 'الطرق', status: 'قيد التنفيذ', priority: 'عاجل', date: 'أمس، 15:12' },
]

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(getUser)
  const [token] = useState(getToken)

  if (!token || !user) {
    return <Login onLogin={setUser} />
  }

  function handleLogout() {
    clearSession()
    setUser(null)
  }

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
          {navigation.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {active && <ChevronLeft className="nav-arrow" size={17} />}
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
            <button className="icon-button notification" aria-label="الإشعارات">
              <Bell size={20} />
              <span />
            </button>

            <div className="user-chip">
              <div className="avatar">{user.full_name?.charAt(0) || "خ"}</div>

              <div className="user-info">
                <strong>{user.full_name}</strong>
                <span>{user.role}</span>
              </div>
            </div>
          </div>
        </header>

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

        <section className="stats-grid">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <div className={`stat-icon ${stat.tone}`}>
                <FileText size={20} />
              </div>

              <div className="stat-copy">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>

              <span className={`stat-change ${stat.tone}`}>
                {stat.change}
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

              <button className="select-button">
                هذا الأسبوع
                <ChevronLeft size={15} />
              </button>
            </div>

            <div className="chart-placeholder">
              {[35, 52, 44, 70, 58, 82, 67].map((height, index) => (
                <div className="chart-column" key={index}>
                  <div style={{ height: `${height}%` }} />
                  <span>
                    {['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'][index]}
                  </span>
                </div>
              ))}
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
              <StatusRow label="تم الحل" value="64%" tone="green" />
              <StatusRow label="قيد التنفيذ" value="21%" tone="blue" />
              <StatusRow label="قيد المراجعة" value="11%" tone="amber" />
              <StatusRow label="مرفوض" value="4%" tone="red" />
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
                {recentReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <strong>{report.title}</strong>
                      <span>{report.id}</span>
                    </td>

                    <td>{report.category}</td>

                    <td>
                      <span
                        className={`badge status-${
                          report.status === 'تم الحل'
                            ? 'green'
                            : report.status === 'قيد التنفيذ'
                              ? 'blue'
                              : 'amber'
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`badge priority-${
                          report.priority === 'عاجل'
                            ? 'red'
                            : report.priority === 'متوسط'
                              ? 'amber'
                              : 'green'
                        }`}
                      >
                        {report.priority}
                      </span>
                    </td>

                    <td>{report.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer>
          خدمتي العراق © 2026 — منصة رقمية لإدارة بلاغات الخدمات العامة
        </footer>
      </main>
    </div>
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
