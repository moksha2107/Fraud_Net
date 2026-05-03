import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Eye, EyeOff } from 'lucide-react'
import LogoIcon from '../components/LogoIcon.jsx'
import api from '../api.js'
import styles from './Auth.module.css'

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(1)           // 1 = details, 2 = OTP
  const [form, setForm]       = useState({ username: '', email: '', password: '' })
  const [otp, setOtp]         = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setEmailSent(data.email_sent)
      toast.success(data.email_sent
        ? `OTP sent to ${form.email}`
        : 'OTP printed to server terminal (no SMTP configured)'
      , { duration: 5000 })
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/verify-otp', { username: form.username, otp })
      toast.success('Account created — please sign in')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brandRow}>
          <div className={styles.brandIcon}>
            <LogoIcon size={22} color="#0d1117" />
          </div>
          <div className={styles.brand}>FRAUD<span>NET</span></div>
        </div>

        {step === 1 ? (
          <>
            <p className={styles.sub}>Create your analyst account</p>
            <div className={styles.divider} />
            <form onSubmit={handleRegister} className={styles.form}>
              <div className={styles.field}>
                <label>Username</label>
                <input type="text" placeholder="analyst_01"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required autoFocus />
              </div>
              <div className={styles.field}>
                <label>Email</label>
                <input type="email" placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required />
              </div>
              <div className={styles.field}>
                <label>Password</label>
                <div className={styles.passwordWrap}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="min. 8 characters"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPwd(v => !v)}
                    tabIndex={-1}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button className={styles.btn} disabled={loading}>
                {loading ? 'Sending OTP…' : 'Continue →'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className={styles.sub}>
              {emailSent
                ? `Enter the 6-digit OTP sent to ${form.email}`
                : 'Check the server terminal for your OTP (no SMTP configured)'}
            </p>
            <div className={styles.divider} />

            <div className={styles.otpHint}>
              <Mail size={16} />
              <span>{form.email}</span>
            </div>

            <form onSubmit={handleVerify} className={styles.form}>
              <div className={styles.field}>
                <label>6-Digit OTP</label>
                <input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className={styles.otpInput}
                  required autoFocus
                />
              </div>
              <button className={styles.btn} disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying…' : 'Verify & Create Account'}
              </button>
              <button type="button" className={styles.backBtn} onClick={() => setStep(1)}>
                ← Change details
              </button>
            </form>
          </>
        )}

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
