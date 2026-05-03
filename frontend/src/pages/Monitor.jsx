import { useEffect, useState, useMemo } from 'react'
import { Bell, BellRing, RefreshCw, CheckCircle } from 'lucide-react'
import api from '../api.js'
import styles from './Monitor.module.css'

const PRESETS = [
  { label: 'Low (50%)',         value: 50 },
  { label: 'Recommended (70%)', value: 70 },
  { label: 'Strict (90%)',      value: 90 },
]

function getSeverity(score) {
  if (score >= 85) return { label: 'CRITICAL', color: 'var(--red)',    bg: 'var(--red-glow)',               border: 'rgba(255,61,90,0.28)',    borderLeft: 'var(--red)' }
  if (score >= 70) return { label: 'HIGH',     color: '#ff7043',       bg: 'rgba(255,112,67,0.1)',          border: 'rgba(255,112,67,0.25)',   borderLeft: '#ff7043' }
  return               { label: 'ELEVATED',  color: 'var(--yellow)',  bg: 'rgba(255,204,0,0.08)',          border: 'rgba(255,204,0,0.2)',     borderLeft: 'var(--yellow)' }
}

function fmt(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function AlertCard({ record }) {
  const sev = getSeverity(record.risk_score)
  const isFraud = record.verdict === 'FRAUD'

  return (
    <div
      className={styles.alertCard}
      style={{
        borderLeft: `3px solid ${sev.borderLeft}`,
        background: sev.bg,
        borderColor: sev.border,
      }}
    >
      <div className={styles.alertTopRow}>
        <div className={styles.alertLeft}>
          <span
            className={styles.severityBadge}
            style={{ color: sev.color, borderColor: sev.border, background: 'rgba(0,0,0,0.3)' }}
          >
            {sev.label}
          </span>
          <span
            className={`${styles.verdictBadge} ${isFraud ? styles.fraudBadge : styles.legitBadge}`}
          >
            {record.verdict}
          </span>
        </div>
        <div className={styles.alertRight}>
          <span className={styles.alertId}>#{record.id}</span>
          <span className={styles.alertTime}>{fmt(record.created_at)}</span>
        </div>
      </div>

      <div className={styles.alertBody}>
        <div className={styles.riskScoreDisplay} style={{ color: sev.color }}>
          {record.risk_score}
          <span className={styles.riskScoreUnit}>%</span>
        </div>
        <div className={styles.alertDetails}>
          <div className={styles.alertDetailRow}>
            <span className={styles.alertDetailKey}>Confidence</span>
            <span className={styles.alertDetailVal}>{(record.confidence * 100).toFixed(1)}%</span>
          </div>
          <div className={styles.alertDetailRow}>
            <span className={styles.alertDetailKey}>Model</span>
            <span className={styles.alertDetailVal}>{record.model_used}</span>
          </div>
        </div>
      </div>

      <div className={styles.alertBarTrack}>
        <div
          className={styles.alertBarFill}
          style={{
            width: `${record.risk_score}%`,
            background: sev.borderLeft,
            boxShadow: `0 0 8px ${sev.borderLeft}55`,
          }}
        />
      </div>
    </div>
  )
}

export default function Monitor() {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [threshold, setThreshold]   = useState(70)

  async function fetchHistory(showSpinner) {
    if (showSpinner) setRefreshing(true)
    try {
      const { data } = await api.get('/history?limit=200')
      setRecords(data)
    } catch {
      // silently ignore fetch errors — show empty state
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchHistory(false) }, [])

  const alerts = useMemo(
    () => records
      .filter(r => r.risk_score >= threshold)
      .sort((a, b) => b.risk_score - a.risk_score),
    [records, threshold]
  )

  const thresholdColor = threshold >= 85 ? 'var(--red)' : threshold >= 70 ? '#ff7043' : 'var(--yellow)'

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            {alerts.length > 0
              ? <BellRing size={20} color="var(--red)" />
              : <Bell size={20} color="var(--green)" />
            }
          </div>
          <div>
            <h1 className={styles.title}>Risk Monitor</h1>
            <p className={styles.subtitle}>Alert feed for transactions exceeding the risk threshold</p>
          </div>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={() => fetchHistory(true)}
          disabled={refreshing}
        >
          <RefreshCw size={13} className={refreshing ? styles.spin : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Threshold card */}
      <div className={styles.thresholdCard}>
        <div className={styles.thresholdTopRow}>
          <div className={styles.thresholdLabelGroup}>
            <span className={styles.thresholdLabel}>Alert Threshold</span>
            <span className={styles.thresholdValue} style={{ color: thresholdColor }}>
              {threshold}%
            </span>
          </div>
          <div className={styles.presetBtns}>
            {PRESETS.map(p => (
              <button
                key={p.value}
                className={`${styles.presetBtn} ${threshold === p.value ? styles.presetActive : ''}`}
                onClick={() => setThreshold(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <input
          type="range"
          min={40}
          max={95}
          step={5}
          value={threshold}
          onChange={e => setThreshold(Number(e.target.value))}
          className={styles.slider}
          style={{ '--thumb-color': thresholdColor }}
        />

        <div className={styles.thresholdSummary}>
          {loading ? (
            <span className={styles.summaryText}>Loading records…</span>
          ) : alerts.length > 0 ? (
            <span className={styles.summaryText}>
              <span style={{ color: thresholdColor, fontWeight: 700 }}>{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
              {' '}above{' '}
              <span style={{ color: thresholdColor }}>{threshold}%</span>
              {' '}threshold out of {records.length} records
            </span>
          ) : (
            <span className={styles.summaryText}>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>All clear</span>
              {' '}— no transactions exceed{' '}
              <span style={{ color: thresholdColor }}>{threshold}%</span>
              {records.length > 0 ? ` (${records.length} records checked)` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Alert feed */}
      {!loading && records.length > 0 && (
        alerts.length > 0 ? (
          <div className={styles.alertFeed}>
            <div className={styles.feedHeader}>
              <BellRing size={13} color="var(--red)" />
              <span className={styles.feedTitle}>Active Alerts</span>
              <span className={styles.feedCount}>{alerts.length}</span>
            </div>
            <div className={styles.alertList}>
              {alerts.map(record => (
                <AlertCard key={record.id} record={record} />
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <CheckCircle size={40} className={styles.emptyCheckIcon} />
            </div>
            <div className={styles.emptyTitle}>No alerts — all clear at {threshold}%</div>
            <div className={styles.emptySubtext}>
              All {records.length} record{records.length !== 1 ? 's' : ''} are below the current threshold.
              Lower the threshold to see more results.
            </div>
          </div>
        )
      )}

      {/* Loading state */}
      {loading && (
        <div className={styles.loadingWrap}>
          <div className={styles.loadingSpinner} />
          <span>Loading history records…</span>
        </div>
      )}

      {/* No records at all */}
      {!loading && records.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>
            <Bell size={40} className={styles.emptyBellIcon} />
          </div>
          <div className={styles.emptyTitle}>No prediction history yet</div>
          <div className={styles.emptySubtext}>
            Run transactions on the Predict page — they will appear here once stored.
          </div>
        </div>
      )}
    </div>
  )
}
