import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import api from './api/client'
import { saveSession } from './auth'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.')
      return
    }

    try {
      setLoading(true)

      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      })

      const { access_token, user } = response.data

      saveSession(access_token, user)
      onLogin(user)
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.')
      } else if (requestError.response?.status === 403) {
        setError('هذا الحساب غير مفعّل حالياً.')
      } else {
        setError(
          'تعذر الاتصال بالخادم. تأكدي من تشغيل FastAPI ثم حاولي مرة أخرى.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page" dir="rtl">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />

      <main className="login-container">
        <section className="login-brand-panel">
          <div className="login-brand-mark">خ</div>

          <span className="login-kicker">منصة الخدمات العامة</span>

          <h1>
            خدمتي
            <span>Khidmati Iraq</span>
          </h1>

          <p>
            منصة رقمية لإدارة البلاغات والخدمات العامة، ومتابعة حالة الطلبات
            بكل وضوح وأمان.
          </p>

          <div className="login-security">
            <ShieldCheck size={22} />
            <div>
              <strong>نظام آمن وموثوق</strong>
              <span>المصادقة وحماية الحسابات مفعّلة</span>
            </div>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-header">
            <span>مرحباً بعودتك 👋</span>
            <h2>تسجيل الدخول</h2>
            <p>دخلي بيانات حسابچ للوصول إلى منصة خدمتي.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label>
              البريد الإلكتروني
              <div className="input-wrapper">
                <Mail size={19} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="example@email.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </label>

            <label>
              كلمة المرور
              <div className="input-wrapper">
                <LockKeyhole size={19} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="أدخلي كلمة المرور"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && <div className="login-error">{error}</div>}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? 'جاري تسجيل الدخول...' : 'دخول إلى المنصة'}
            </button>
          </form>

          <div className="login-footer">
            <span>خدمتي العراق © 2026</span>
            <span>حماية البيانات والخصوصية</span>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Login
