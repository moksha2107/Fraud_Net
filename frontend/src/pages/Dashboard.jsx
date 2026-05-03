import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert, ShieldCheck, Activity, TrendingUp,
  Zap, Clock, AlertTriangle, CheckCircle2, BarChart3,
  Target, Percent, ArrowUpRight, Flame, TrendingDown, Gauge
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import api from '../api.js'
import styles from './Dashboard.module.css'

const TOOLTIP_STYLE = {
  background: '#0a0f1a',
  border: '1px solid #1e2a3a',
  borderRadius: '8px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: '#e2eaf6',
  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
}

/* ── Simple risk bar ───────────────────────────────────────────── */
function RiskBar({ value }) {
  const clamped = Math.round(Math.min(100, Math.max(0, value)))
  const rest    = 100 - clamped
  const color   = clamped > 65 ? '#ff3d5a' : clamped > 35 ? '#ffcc00' : '#00ff88'

  return (
    <div className={styles.splitWrap}>
      <div className={styles.splitRow}>
        <span className={styles.splitPct} style={{ color }}>{clamped}%</span>
        <div className={styles.splitTrack}>
          <div className={styles.splitFill} style={{
            width: `${clamped}%`,
            background: color,
            boxShadow: `0 0 10px ${color}88`,
          }} />
        </div>
        <span className={styles.splitPctRight}>{rest}%</span>
      </div>
    </div>
  )
}

/* ── Stat card ─────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className={styles.statCard} style={{ '--accent': color }}>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statIcon} style={{ color, background: `${color}15` }}>
          <Icon size={15} />
        </span>
      </div>
      <div className={styles.statValue} style={{ color }}>{value}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
}

/* ── Recent prediction row ─────────────────────────────────────── */
function RecentRow({ record, idx }) {
  const fraud = record.verdict === 'FRAUD'
  const time  = new Date(record.created_at).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  return (
    <div className={`${styles.recentRow} ${fraud ? styles.recentRowFraud : styles.recentRowLegit}`}>
      <span className={styles.recentIdx}>#{idx + 1}</span>
      <span className={`${styles.badge} ${fraud ? styles.badgeFraud : styles.badgeLegit}`}>
        {fraud ? <ShieldAlert size={10} /> : <ShieldCheck size={10} />}
        {record.verdict}
      </span>
      <div className={styles.recentBar}>
        <div
          className={styles.recentFill}
          style={{
            width: `${record.risk_score}%`,
            background: fraud
              ? 'linear-gradient(90deg,#ff8c00,#ff3d5a)'
              : 'linear-gradient(90deg,#00cc6a,#00ff88)',
          }}
        />
      </div>
      <span className={styles.recentScore} style={{ color: fraud ? 'var(--red)' : 'var(--green)' }}>
        {record.risk_score}%
      </span>
      <span className={styles.recentConf}>{(record.confidence * 100).toFixed(0)}%</span>
      <span className={styles.recentTime}><Clock size={9} />{time}</span>
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────── */
export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [user,    setUser]    = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/stats'),
      api.get('/history?limit=30'),
      api.get('/auth/me'),
    ]).then(([s, h, u]) => {
      setStats(s.data)
      setHistory(h.data)
      setUser(u.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingDot} />
      <span>Loading dashboard…</span>
    </div>
  )

  /* Derived data */
  const pieData = stats ? [
    { name: 'Legitimate', value: stats.legitimate    },
    { name: 'Fraud',      value: stats.fraud_detected },
  ] : []

  // Build timeline — group by day+hour if spread across hours, else show each individually
  const timelineMap = {}
  history.forEach((r, i) => {
    const d = new Date(r.created_at)
    const key = new Date(r.created_at).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit',
    })
    if (!timelineMap[key]) timelineMap[key] = { time: key, fraud: 0, legit: 0 }
    if (r.verdict === 'FRAUD') timelineMap[key].fraud++
    else                       timelineMap[key].legit++
  })

  let timeline = Object.values(timelineMap).slice(-14)

  // If everything collapsed into 1 bucket, show each prediction individually
  if (timeline.length === 1) {
    timeline = history.slice(0, 14).map((r, i) => ({
      time: `#${i + 1}`,
      fraud: r.verdict === 'FRAUD' ? 1 : 0,
      legit: r.verdict !== 'FRAUD' ? 1 : 0,
    })).reverse()
  }
  const lastFraud  = history.find(r => r.verdict === 'FRAUD')
  const avgConf    = history.length
    ? history.reduce((a, r) => a + r.confidence, 0) / history.length
    : 0

  /* ── Additional derived metrics ── */
  const peakRisk       = history.length ? Math.max(...history.map(r => r.risk_score)) : 0
  const highRiskCount  = history.filter(r => r.risk_score > 65).length
  const medRiskCount   = history.filter(r => r.risk_score > 35 && r.risk_score <= 65).length
  const lowRiskCount   = history.filter(r => r.risk_score <= 35).length
  const fraudList      = history.filter(r => r.verdict === 'FRAUD')
  const legitList      = history.filter(r => r.verdict !== 'FRAUD')
  const fraudAvgRisk   = fraudList.length
    ? Math.round(fraudList.reduce((a, r) => a + r.risk_score, 0) / fraudList.length)
    : 0
  const legitAvgRisk   = legitList.length
    ? Math.round(legitList.reduce((a, r) => a + r.risk_score, 0) / legitList.length)
    : 0
  const highConf       = history.filter(r => r.confidence >= 0.9).length
  const lowConf        = history.filter(r => r.confidence < 0.7).length

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className={styles.page}>

      {/* ── Page header ── */}
      <div className={styles.header}>
        <div>
          <p className={styles.greeting}>{greeting}{user ? `, ${user.username}` : ''}</p>
          <h1 className={styles.title}>Fraud Detection Dashboard</h1>
          <p className={styles.subtitle}>Real-time overview of all transaction analyses</p>
        </div>
        <Link to="/predict" className={styles.cta}>
          <Zap size={13} /> Analyse Transaction
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* ── Alert banner ── */}
      {stats?.fraud_detected > 0 && (
        <div className={styles.alertBanner}>
          <AlertTriangle size={14} />
          <span>
            <strong>{stats.fraud_detected} fraud{stats.fraud_detected > 1 ? 's' : ''} detected</strong>
            {lastFraud && ` — last flagged on ${new Date(lastFraud.created_at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}`}
          </span>
          <Link to="/history" className={styles.alertLink}>View history →</Link>
        </div>
      )}

      {/* ── Empty state ── */}
      {!stats || stats.total_predictions === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><BarChart3 size={38} /></div>
          <h2>No data yet</h2>
          <p>Start analysing transactions and your insights will appear here.</p>
          <Link to="/predict" className={styles.cta} style={{ marginTop: 8 }}>
            <Zap size={13} /> Make your first prediction
          </Link>
        </div>
      ) : (
        <>
          {/* ── Stat cards row 1 ── */}
          <div className={styles.statsRow}>
            <StatCard label="Total Analysed"  value={stats.total_predictions.toLocaleString()} icon={Activity}     color="#4fc3f7" sub="transactions processed" />
            <StatCard label="Fraud Detected"  value={stats.fraud_detected.toLocaleString()}    icon={ShieldAlert}  color="#ff3d5a" sub={`${stats.fraud_rate}% fraud rate`} />
            <StatCard label="Legitimate"       value={stats.legitimate.toLocaleString()}        icon={CheckCircle2} color="#00ff88" sub="cleared transactions" />
            <StatCard label="Avg Confidence"  value={`${(avgConf * 100).toFixed(1)}%`}         icon={Target}       color="#a78bfa" sub="model certainty" />
            <StatCard
              label="Threat Level"
              value={stats.fraud_rate > 30 ? 'HIGH' : stats.fraud_rate > 10 ? 'MEDIUM' : 'LOW'}
              icon={TrendingUp}
              color={stats.fraud_rate > 30 ? '#ff3d5a' : stats.fraud_rate > 10 ? '#ffcc00' : '#00ff88'}
              sub="based on fraud rate"
            />
          </div>

          {/* ── Stat cards row 2 ── */}
          <div className={styles.statsRow2}>
            <StatCard label="Peak Risk Score"   value={`${peakRisk}%`}        icon={Flame}         color="#ff7043" sub="highest recorded risk" />
            <StatCard label="High Risk Cases"   value={highRiskCount}          icon={ShieldAlert}   color="#ff3d5a" sub="risk score > 65%" />
            <StatCard label="Medium Risk Cases" value={medRiskCount}           icon={Gauge}         color="#ffcc00" sub="risk score 35–65%" />
            <StatCard label="Low Risk Cases"    value={lowRiskCount}           icon={TrendingDown}  color="#00ff88" sub="risk score < 35%" />
            <StatCard label="High Confidence"   value={highConf}               icon={Target}        color="#a78bfa" sub="confidence ≥ 90%" />
          </div>

          {/* ── Main two-column grid ── */}
          <div className={styles.mainGrid}>

            {/* Left: Risk meter + Pie ── */}
            <div className={styles.leftCol}>

              {/* Risk meter card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Risk Overview</h2>
                  <span className={styles.cardPill} style={{
                    color: stats.avg_risk_score > 65 ? '#ff3d5a' : stats.avg_risk_score > 35 ? '#ffcc00' : '#00ff88',
                    background: stats.avg_risk_score > 65 ? '#ff3d5a15' : stats.avg_risk_score > 35 ? '#ffcc0015' : '#00ff8815',
                    border: `1px solid ${stats.avg_risk_score > 65 ? '#ff3d5a30' : stats.avg_risk_score > 35 ? '#ffcc0030' : '#00ff8830'}`,
                  }}>
                    {stats.total_predictions} scans
                  </span>
                </div>
                <RiskBar value={stats.avg_risk_score} />
              </div>

              {/* Risk Distribution card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Risk Distribution</h2>
                  <span className={styles.cardSub}>{history.length} predictions</span>
                </div>
                <div className={styles.distList}>
                  {[
                    { label: 'High Risk',   count: highRiskCount,  color: '#ff3d5a', pct: history.length ? (highRiskCount / history.length) * 100 : 0 },
                    { label: 'Medium Risk', count: medRiskCount,   color: '#ffcc00', pct: history.length ? (medRiskCount  / history.length) * 100 : 0 },
                    { label: 'Low Risk',    count: lowRiskCount,   color: '#00ff88', pct: history.length ? (lowRiskCount  / history.length) * 100 : 0 },
                  ].map(d => (
                    <div key={d.label} className={styles.distRow}>
                      <span className={styles.distLabel}>{d.label}</span>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${d.pct}%`, background: d.color }} />
                      </div>
                      <span className={styles.distCount} style={{ color: d.color }}>{d.count}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.distDivider} />
                <div className={styles.distAvgRow}>
                  <div className={styles.distAvg}>
                    <span className={styles.distAvgLabel}>Avg Fraud Risk</span>
                    <span className={styles.distAvgVal} style={{ color: '#ff3d5a' }}>{fraudAvgRisk}%</span>
                  </div>
                  <div className={styles.distAvg}>
                    <span className={styles.distAvgLabel}>Avg Legit Risk</span>
                    <span className={styles.distAvgVal} style={{ color: '#00ff88' }}>{legitAvgRisk}%</span>
                  </div>
                </div>
              </div>

              {/* Verdict donut card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Verdict Split</h2>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={44} outerRadius={64}
                      paddingAngle={4}
                      dataKey="value"
                      startAngle={90} endAngle={-270}
                    >
                      <Cell fill="#00ff88" fillOpacity={0.9} />
                      <Cell fill="#ff3d5a" fillOpacity={0.9} />
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.pieLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.dot} style={{ background: '#00ff88', boxShadow: '0 0 6px #00ff8866' }} />
                    <span>Legit</span>
                    <strong style={{ color: '#00ff88' }}>{stats.legitimate}</strong>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.dot} style={{ background: '#ff3d5a', boxShadow: '0 0 6px #ff3d5a66' }} />
                    <span>Fraud</span>
                    <strong style={{ color: '#ff3d5a' }}>{stats.fraud_detected}</strong>
                  </div>
                </div>
                {/* Mini progress bars */}
                <div className={styles.splitBars}>
                  <div className={styles.splitBar}>
                    <span className={styles.splitLabel}>Legitimate</span>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${100 - stats.fraud_rate}%`, background: '#00ff88' }} />
                    </div>
                    <span className={styles.splitPct} style={{ color: '#00ff88' }}>{(100 - stats.fraud_rate).toFixed(1)}%</span>
                  </div>
                  <div className={styles.splitBar}>
                    <span className={styles.splitLabel}>Fraud</span>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${stats.fraud_rate}%`, background: '#ff3d5a' }} />
                    </div>
                    <span className={styles.splitPct} style={{ color: '#ff3d5a' }}>{stats.fraud_rate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Timeline card ── */}
            <div className={styles.rightCol}>
              <div className={`${styles.card} ${styles.cardFull}`}>
                <div className={styles.cardHeader}>
                  <h2>Activity Timeline</h2>
                  <span className={styles.cardSub}>Last {history.length} predictions grouped by hour</span>
                </div>
                {timeline.length >= 1 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={timeline} margin={{ left: -8, right: 8, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gLegit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#00ff88" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gFraud" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#ff3d5a" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#ff3d5a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e2a3a" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time"
                        tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                        axisLine={{ stroke: '#1e2a3a' }} tickLine={false}
                      />
                      <YAxis allowDecimals={false}
                        tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                        axisLine={false} tickLine={false}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', paddingTop: 12 }} />
                      <Area type="monotone" dataKey="legit" name="Legitimate"
                        stroke="#00ff88" strokeWidth={2} fill="url(#gLegit)"
                        dot={timeline.length <= 3 ? { r: 4, fill: '#00ff88', strokeWidth: 0 } : false}
                        activeDot={{ r: 4, fill: '#00ff88' }}
                      />
                      <Area type="monotone" dataKey="fraud" name="Fraud"
                        stroke="#ff3d5a" strokeWidth={2} fill="url(#gFraud)"
                        dot={timeline.length <= 3 ? { r: 4, fill: '#ff3d5a', strokeWidth: 0 } : false}
                        activeDot={{ r: 4, fill: '#ff3d5a' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.chartEmpty}>
                    <BarChart3 size={28} />
                    <p>Need more predictions to plot a timeline</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Recent predictions (full width) ── */}
          <div className={styles.card} style={{ marginTop: 14 }}>
            <div className={styles.cardHeader}>
              <h2>Recent Predictions</h2>
              <Link to="/history" className={styles.viewAll}>View all →</Link>
            </div>

            {/* Column headers */}
            <div className={styles.tableHead}>
              <span>#</span>
              <span>Verdict</span>
              <span>Risk Score</span>
              <span style={{ textAlign: 'right' }}>Risk%</span>
              <span style={{ textAlign: 'right' }}>Conf.</span>
              <span style={{ textAlign: 'right' }}>Time</span>
            </div>

            <div className={styles.recentList}>
              {history.slice(0, 10).map((r, i) => (
                <RecentRow key={r.id} record={r} idx={i} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
