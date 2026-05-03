import { useEffect, useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { Trophy, Zap, Target, TrendingUp, DollarSign } from 'lucide-react'
import api from '../api.js'
import styles from './Models.module.css'

const METRICS = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc', 'pr_auc']
const METRIC_LABELS = {
  accuracy: 'Accuracy', precision: 'Precision', recall: 'Recall',
  f1: 'F1 Score', roc_auc: 'ROC-AUC', pr_auc: 'PR-AUC',
}
const COLORS = ['#00ff88', '#ffd700', '#4fc3f7', '#ff7043']

function MetricBar({ value, color, max = 1 }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className={styles.metricBarWrap}>
      <div className={styles.metricTrack}>
        <div
          className={styles.metricFill}
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}44` }}
        />
      </div>
      <span className={styles.metricPct} style={{ color }}>{(value * 100).toFixed(2)}%</span>
    </div>
  )
}

function ModelCard({ model, color, isBest }) {
  const keyMetrics = [
    { key: 'pr_auc',   label: 'PR-AUC',    icon: <Target size={12} /> },
    { key: 'roc_auc',  label: 'ROC-AUC',   icon: <TrendingUp size={12} /> },
    { key: 'f1',       label: 'F1 Score',  icon: <Zap size={12} /> },
    { key: 'recall',   label: 'Recall',    icon: <TrendingUp size={12} /> },
  ]

  return (
    <div className={`${styles.modelCard} ${isBest ? styles.modelCardBest : ''}`}
      style={isBest ? { borderColor: `${color}44`, boxShadow: `0 0 24px ${color}11` } : {}}>
      {isBest && (
        <div className={styles.bestBadge} style={{ background: color, color: '#000' }}>
          <Trophy size={10} /> Best PR-AUC
        </div>
      )}
      <div className={styles.modelCardHeader}>
        <span className={styles.modelDot} style={{ background: color }} />
        <span className={styles.modelName}>{model.name}</span>
      </div>
      <div className={styles.modelMetrics}>
        {keyMetrics.map(({ key, label, icon }) => (
          <div key={key} className={styles.modelMetricRow}>
            <span className={styles.modelMetricLabel}>
              {icon} {label}
            </span>
            <MetricBar value={model[key]} color={color} />
          </div>
        ))}
      </div>
      {model.cost_sensitive_loss !== undefined && (
        <div className={styles.costRow}>
          <DollarSign size={11} />
          <span>Cost Sensitive Loss: </span>
          <span className={styles.costVal}>${model.cost_sensitive_loss.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}

export default function Models() {
  const [models,  setModels]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.get('/models')
      .then(r => setModels(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Failed to load metrics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className={styles.msg}>
      <div className={styles.loadSpinner} />
      Loading model metrics…
    </div>
  )

  if (error) return (
    <div className={styles.msg}>
      <p style={{ color: 'var(--text-muted)' }}>{error}</p>
      <p style={{ fontSize: 12, marginTop: 8 }}>
        Run <code>python ml/train.py --data creditcard.csv</code> first.
      </p>
    </div>
  )

  const best = [...models].sort((a, b) => b.pr_auc - a.pr_auc)[0]

  // Build radar data
  const radarData = METRICS.map(m => {
    const entry = { metric: m.replace('_', ' ').toUpperCase() }
    models.forEach(model => { entry[model.name] = +(model[m] * 100).toFixed(2) })
    return entry
  })

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Model Comparison</h1>
          <p className={styles.subtitle}>Performance metrics across all trained models</p>
        </div>
        {best && (
          <div className={styles.winnerBadge}>
            <Trophy size={13} />
            <span>Best: </span>
            <strong>{best.name}</strong>
            <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
              {(best.pr_auc * 100).toFixed(2)}% PR-AUC
            </span>
          </div>
        )}
      </div>

      {/* Model cards grid */}
      <div className={styles.cardGrid}>
        {models.map((m, i) => (
          <ModelCard key={m.name} model={m} color={COLORS[i % COLORS.length]} isBest={m.name === best?.name} />
        ))}
      </div>

      {/* Full metrics table */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Full Metrics Table</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Model</th>
                {METRICS.map(m => <th key={m}>{METRIC_LABELS[m]}</th>)}
                <th>Cost ($)</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m, i) => (
                <tr key={m.name} className={m.name === best?.name ? styles.bestRow : ''}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={styles.dot} style={{ background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                      {m.name === best?.name && (
                        <span className={styles.inlineBest}>BEST</span>
                      )}
                    </div>
                  </td>
                  {METRICS.map(k => (
                    <td key={k} style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      className={k === 'pr_auc' && m.name === best?.name ? styles.highlight : ''}>
                      {(m[k] * 100).toFixed(2)}%
                    </td>
                  ))}
                  <td style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {m.cost_sensitive_loss !== undefined ? `$${m.cost_sensitive_loss.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grouped bar chart */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Side-by-Side Metric Comparison — % scale</div>
        <div className={styles.radarCard}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={radarData} margin={{ left: -8, right: 8, top: 10, bottom: 0 }}>
              <CartesianGrid stroke="#1e2a3a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="metric"
                tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#1e2a3a' }} tickLine={false}
              />
              <YAxis domain={[0, 100]} unit="%"
                tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#0a0f1a',
                  border: '1px solid #1e2a3a',
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px',
                  color: '#e2eaf6',
                }}
                formatter={v => `${v}%`}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', paddingTop: 14 }} />
              {models.map((m, i) => (
                <Bar key={m.name} dataKey={m.name} fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.85} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar chart */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Metric Radar — % scale</div>
        <div className={styles.radarCard}>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
              />
              {models.map((m, i) => (
                <Radar
                  key={m.name}
                  name={m.name}
                  dataKey={m.name}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
              ))}
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                }}
                formatter={v => `${v}%`}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className={styles.legend}>
            {models.map((m, i) => (
              <span key={m.name} className={styles.legendItem}>
                <span className={styles.dot} style={{ background: COLORS[i % COLORS.length] }} />
                {m.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
