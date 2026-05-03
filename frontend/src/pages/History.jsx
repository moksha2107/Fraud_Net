import { useEffect, useState, useMemo } from 'react'
import { ShieldAlert, ShieldCheck, Search, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import api from '../api.js'
import styles from './History.module.css'

const TOOLTIP_STYLE = {
  background: '#0a0f1a',
  border: '1px solid #1e2a3a',
  borderRadius: '8px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: '#e2eaf6',
  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
}

function fmt(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function MiniRiskBar({ value, isFraud }) {
  const color = value > 65 ? '#ff3d5a' : value > 35 ? '#ffcc00' : '#00ff88'
  return (
    <div className={styles.miniBarWrap}>
      <div className={styles.miniTrack}>
        <div
          className={styles.miniFill}
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
      <span className={styles.miniVal} style={{ color }}>{value}%</span>
    </div>
  )
}

export default function History() {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search,  setSearch]    = useState('')
  const [filter,  setFilter]    = useState('all') // 'all' | 'fraud' | 'legit'

  useEffect(() => {
    api.get('/history?limit=100')
      .then(r => setRecords(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const total   = records.length
    const frauds  = records.filter(r => r.verdict === 'FRAUD').length
    const legits  = total - frauds
    const avgRisk = total ? (records.reduce((s, r) => s + r.risk_score, 0) / total).toFixed(1) : '—'
    return { total, frauds, legits, avgRisk }
  }, [records])

  const riskBuckets = useMemo(() => {
    const buckets = [
      { range: '0–20',   color: '#00ff88', count: 0 },
      { range: '20–40',  color: '#4fc3f7', count: 0 },
      { range: '40–60',  color: '#ffcc00', count: 0 },
      { range: '60–80',  color: '#ff7043', count: 0 },
      { range: '80–100', color: '#ff3d5a', count: 0 },
    ]
    records.forEach(r => {
      const idx = Math.min(4, Math.floor(r.risk_score / 20))
      buckets[idx].count++
    })
    return buckets
  }, [records])

  const confBuckets = useMemo(() => {
    const buckets = [
      { range: '50–60%',  color: '#6b7fa3', count: 0 },
      { range: '60–70%',  color: '#4fc3f7', count: 0 },
      { range: '70–80%',  color: '#a78bfa', count: 0 },
      { range: '80–90%',  color: '#ffcc00', count: 0 },
      { range: '90–100%', color: '#00ff88', count: 0 },
    ]
    records.forEach(r => {
      const pct = r.confidence * 100
      const idx = Math.min(4, Math.max(0, Math.floor((pct - 50) / 10)))
      buckets[idx].count++
    })
    return buckets
  }, [records])

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchVerdict = filter === 'all' || (filter === 'fraud' ? r.verdict === 'FRAUD' : r.verdict !== 'FRAUD')
      const matchSearch  = search === '' || r.model_used?.toLowerCase().includes(search.toLowerCase()) ||
        String(r.risk_score).includes(search)
      return matchVerdict && matchSearch
    })
  }, [records, filter, search])

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.loadingSpinner} />
      <span>Loading history…</span>
    </div>
  )

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Prediction History</h1>
          <p className={styles.subtitle}>Full audit trail of all fraud analyses</p>
        </div>
        <div className={styles.countBadge}>
          <Clock size={12} />
          {records.length} records
        </div>
      </div>

      {/* Stats row */}
      {records.length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <div className={styles.statVal}>{stats.total}</div>
            <div className={styles.statKey}>Total</div>
          </div>
          <div className={`${styles.statBox} ${styles.statFraud}`}>
            <div className={styles.statVal} style={{ color: 'var(--red)' }}>{stats.frauds}</div>
            <div className={styles.statKey}><AlertTriangle size={10} /> Fraud</div>
          </div>
          <div className={`${styles.statBox} ${styles.statLegit}`}>
            <div className={styles.statVal} style={{ color: 'var(--green)' }}>{stats.legits}</div>
            <div className={styles.statKey}><CheckCircle size={10} /> Legit</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statVal} style={{ color: 'var(--yellow)' }}>{stats.avgRisk}%</div>
            <div className={styles.statKey}><TrendingUp size={10} /> Avg Risk</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statVal} style={{ color: 'var(--red)', fontSize: 13 }}>
              {stats.total > 0 ? ((stats.frauds / stats.total) * 100).toFixed(1) : 0}%
            </div>
            <div className={styles.statKey}>Fraud Rate</div>
          </div>
        </div>
      )}

      {/* Charts */}
      {records.length > 0 && (
        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartLabel}>Risk Score Distribution</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={riskBuckets} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="#1e2a3a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range"
                  tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#1e2a3a' }} tickLine={false}
                />
                <YAxis allowDecimals={false}
                  tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" name="Predictions" radius={[4, 4, 0, 0]}>
                  {riskBuckets.map((b, i) => (
                    <Cell key={i} fill={b.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartLabel}>Confidence Distribution</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={confBuckets} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="#1e2a3a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range"
                  tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#1e2a3a' }} tickLine={false}
                />
                <YAxis allowDecimals={false}
                  tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" name="Predictions" radius={[4, 4, 0, 0]}>
                  {confBuckets.map((b, i) => (
                    <Cell key={i} fill={b.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Clock size={40} />
          </div>
          <h3 className={styles.emptyTitle}>No predictions yet</h3>
          <p className={styles.emptyText}>Run your first transaction analysis on the Predict page to see results here.</p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className={styles.controls}>
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search by model or risk score…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className={styles.filterTabs}>
              {['all', 'fraud', 'legit'].map(f => (
                <button
                  key={f}
                  className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'fraud' ? '⚠ Fraud' : '✓ Legit'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Verdict</th>
                  <th>Risk Score</th>
                  <th>Confidence</th>
                  <th>Model</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.noMatch}>No records match your filter.</td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isFraud = r.verdict === 'FRAUD'
                    return (
                      <tr key={r.id} className={isFraud ? styles.rowFraud : ''}>
                        <td className={styles.id}>{r.id}</td>
                        <td>
                          <span className={`${styles.badge} ${isFraud ? styles.fraud : styles.legit}`}>
                            {isFraud ? <ShieldAlert size={11} /> : <ShieldCheck size={11} />}
                            {r.verdict}
                          </span>
                        </td>
                        <td>
                          <MiniRiskBar value={r.risk_score} isFraud={isFraud} />
                        </td>
                        <td className={styles.mono}>{(r.confidence * 100).toFixed(1)}%</td>
                        <td className={styles.modelCell}>{r.model_used}</td>
                        <td className={styles.date}>{fmt(r.created_at)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className={styles.tableFooter}>
              Showing {filtered.length} of {records.length} records
            </div>
          )}
        </>
      )}
    </div>
  )
}
