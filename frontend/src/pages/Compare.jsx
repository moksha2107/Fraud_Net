import { useState } from 'react'
import { SplitSquareHorizontal, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import api from '../api.js'
import styles from './Compare.module.css'

const FIELDS = [
  { key: 'amount',      label: 'Amount' },
  { key: 'hour_of_day', label: 'Hour' },
  { key: 'day_of_week', label: 'Day' },
  { key: 'v1',  label: 'V1' },
  { key: 'v2',  label: 'V2' },
  { key: 'v3',  label: 'V3' },
  { key: 'v4',  label: 'V4' },
  { key: 'v7',  label: 'V7' },
  { key: 'v9',  label: 'V9' },
  { key: 'v10', label: 'V10' },
  { key: 'v11', label: 'V11' },
  { key: 'v12', label: 'V12' },
  { key: 'v14', label: 'V14' },
  { key: 'v16', label: 'V16' },
  { key: 'v17', label: 'V17' },
  { key: 'v18', label: 'V18' },
  { key: 'v19', label: 'V19' },
  { key: 'v20', label: 'V20' },
]

const EMPTY_FORM = Object.fromEntries(FIELDS.map(f => [f.key, '']))

function TransactionPanel({ label, form, setForm, sampling, onLoadSample, result, groundTruth }) {
  const isFraud = result?.verdict === 'FRAUD'
  const gtIsFraud = groundTruth === 1 || groundTruth === true

  return (
    <div className={`${styles.panel} ${result ? (isFraud ? styles.panelFraud : styles.panelLegit) : ''}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelLabel}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {groundTruth !== null && groundTruth !== undefined && !result && (
            <span className={styles.sampleTag}>📋 Ground truth from dataset sample</span>
          )}
          <button
            className={styles.sampleBtn}
            onClick={onLoadSample}
            disabled={sampling}
            type="button"
          >
            <RefreshCw size={12} className={sampling ? styles.spin : ''} />
            {sampling ? 'Loading…' : 'Random Sample'}
          </button>
        </div>
      </div>

      <div className={styles.inputGrid}>
        {FIELDS.map(({ key, label: fieldLabel }) => (
          <div key={key} className={styles.inputField}>
            <label className={styles.inputLabel}>{fieldLabel}</label>
            <input
              type="number"
              step="any"
              placeholder="0"
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {result && (
        <div className={styles.resultCard}>
          <div className={styles.resultVerdict}>
            {isFraud
              ? <ShieldAlert size={20} color="var(--red)" />
              : <ShieldCheck size={20} color="var(--green)" />
            }
            <span
              className={styles.resultVerdictText}
              style={{ color: isFraud ? 'var(--red)' : 'var(--green)' }}
            >
              {result.verdict}
            </span>
          </div>
          {groundTruth !== null && groundTruth !== undefined && (
            <div className={styles.groundTruthBanner}>
              <span className={styles.gtLabel}>Ground Truth:</span>
              <span
                className={styles.gtBadge}
                style={{ color: gtIsFraud ? 'var(--red)' : 'var(--green)' }}
              >
                {gtIsFraud ? 'FRAUD' : 'LEGITIMATE'}
              </span>
              {(() => {
                const modelSaysFraud = result.verdict === 'FRAUD'
                const correct = modelSaysFraud === gtIsFraud
                return (
                  <span className={correct ? styles.gtCorrect : styles.gtWrong}>
                    {correct ? '✓ Model Correct' : '✗ Model Wrong'}
                  </span>
                )
              })()}
            </div>
          )}
          <div className={styles.resultMetrics}>
            <div className={styles.resultMetric}>
              <div
                className={styles.resultMetricVal}
                style={{ color: isFraud ? 'var(--red)' : 'var(--green)' }}
              >
                {result.risk_score}%
              </div>
              <div className={styles.resultMetricKey}>Risk</div>
            </div>
            <div className={styles.resultDivider} />
            <div className={styles.resultMetric}>
              <div className={styles.resultMetricVal}>{(result.confidence * 100).toFixed(1)}%</div>
              <div className={styles.resultMetricKey}>Confidence</div>
            </div>
          </div>
          <div className={styles.riskBarTrack}>
            <div
              className={styles.riskBarFill}
              style={{
                width: `${result.risk_score}%`,
                background: isFraud
                  ? 'linear-gradient(90deg, #ff8c00, var(--red))'
                  : 'linear-gradient(90deg, var(--green-dim), var(--green))',
                boxShadow: isFraud ? 'var(--glow-red)' : 'var(--glow-green)',
              }}
            />
          </div>
          <div className={styles.resultModel}>{result.model_used}</div>
        </div>
      )}
    </div>
  )
}

export default function Compare() {
  const [formA, setFormA] = useState(EMPTY_FORM)
  const [formB, setFormB] = useState(EMPTY_FORM)
  const [samplingA, setSamplingA] = useState(false)
  const [samplingB, setSamplingB] = useState(false)
  const [resultA, setResultA] = useState(null)
  const [resultB, setResultB] = useState(null)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState('')
  const [groundTruthA, setGroundTruthA] = useState(null)
  const [groundTruthB, setGroundTruthB] = useState(null)

  async function loadSample(setForm, setSampling, setGroundTruth) {
    setSampling(true)
    try {
      const { data } = await api.get('/predict/sample')
      const { is_fraud, ...fields } = data
      setForm(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v)])))
      setGroundTruth(is_fraud)
    } catch {
      // silently ignore — user can enter manually
    } finally {
      setSampling(false)
    }
  }

  async function handleCompare() {
    setError('')
    const missingA = FIELDS.some(f => formA[f.key] === '')
    const missingB = FIELDS.some(f => formB[f.key] === '')
    if (missingA || missingB) {
      setError('Please fill in all fields for both transactions, or use "Random Sample" to auto-fill.')
      return
    }
    setComparing(true)
    setResultA(null)
    setResultB(null)
    setGroundTruthA(null)
    setGroundTruthB(null)
    try {
      const payloadA = Object.fromEntries(FIELDS.map(f => [f.key, parseFloat(formA[f.key])]))
      const payloadB = Object.fromEntries(FIELDS.map(f => [f.key, parseFloat(formB[f.key])]))
      const [resA, resB] = await Promise.all([
        api.post('/predict', payloadA),
        api.post('/predict', payloadB),
      ])
      setResultA(resA.data)
      setResultB(resB.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Comparison failed. Please check your inputs.')
    } finally {
      setComparing(false)
    }
  }

  const shapDelta = (resultA && resultB) ? (() => {
    const mapA = Object.fromEntries((resultA.shap_explanation ?? []).map(d => [d.feature, d.shap_value]))
    const mapB = Object.fromEntries((resultB.shap_explanation ?? []).map(d => [d.feature, d.shap_value]))
    const allFeatures = Array.from(new Set([
      ...(resultA.shap_explanation ?? []).map(d => d.feature),
      ...(resultB.shap_explanation ?? []).map(d => d.feature),
    ]))
    return allFeatures
      .map(feat => ({
        feature: feat,
        shapA: mapA[feat] ?? 0,
        shapB: mapB[feat] ?? 0,
        delta: (mapA[feat] ?? 0) - (mapB[feat] ?? 0),
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 10)
  })() : null

  const winner = (resultA && resultB) ? (() => {
    const diff = resultA.risk_score - resultB.risk_score
    if (Math.abs(diff) < 1) return { text: 'Both transactions have similar risk levels', neutral: true }
    const more = Math.abs(diff).toFixed(0)
    return {
      text: diff > 0
        ? `Transaction A is ${more}% more suspicious`
        : `Transaction B is ${more}% more suspicious`,
      neutral: false,
      aWorse: diff > 0,
    }
  })() : null

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <SplitSquareHorizontal size={20} color="var(--green)" />
          </div>
          <div>
            <h1 className={styles.title}>Transaction Comparison</h1>
            <p className={styles.subtitle}>Side-by-side fraud analysis with SHAP delta</p>
          </div>
        </div>
      </div>

      {/* Two panels */}
      <div className={styles.panelsWrap}>
        <TransactionPanel
          label="Transaction A"
          form={formA}
          setForm={setFormA}
          sampling={samplingA}
          onLoadSample={() => loadSample(setFormA, setSamplingA, setGroundTruthA)}
          result={resultA}
          groundTruth={groundTruthA}
        />
        <div className={styles.panelDivider} />
        <TransactionPanel
          label="Transaction B"
          form={formB}
          setForm={setFormB}
          sampling={samplingB}
          onLoadSample={() => loadSample(setFormB, setSamplingB, setGroundTruthB)}
          result={resultB}
          groundTruth={groundTruthB}
        />
      </div>

      {/* Compare button */}
      <div className={styles.compareButtonWrap}>
        {error && (
          <div className={styles.errorMsg}>{error}</div>
        )}
        <button
          className={styles.compareBtn}
          onClick={handleCompare}
          disabled={comparing}
        >
          {comparing
            ? <><span className={styles.spinner} /> Comparing…</>
            : <><SplitSquareHorizontal size={15} /> Compare Transactions</>
          }
        </button>
      </div>

      {/* Winner banner */}
      {winner && (
        <div className={`${styles.winnerBanner} ${winner.neutral ? styles.winnerNeutral : winner.aWorse ? styles.winnerA : styles.winnerB}`}>
          {winner.text}
        </div>
      )}

      {/* SHAP delta table */}
      {shapDelta && shapDelta.length > 0 && (
        <div className={styles.deltaSection}>
          <div className={styles.deltaSectionTitle}>SHAP Feature Delta (Top 10)</div>
          <div className={styles.deltaNote}>
            Red delta = Transaction A more suspicious for this feature &nbsp;·&nbsp; Green = Transaction B more suspicious
          </div>
          <div className={styles.deltaTableWrap}>
            <table className={styles.deltaTable}>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>SHAP A</th>
                  <th>SHAP B</th>
                  <th>Delta (A − B)</th>
                </tr>
              </thead>
              <tbody>
                {shapDelta.map((row, i) => {
                  const deltaColor = row.delta > 0 ? 'var(--red)' : 'var(--green)'
                  return (
                    <tr key={i}>
                      <td className={styles.featureCell}>{row.feature}</td>
                      <td className={styles.monoCell}>{row.shapA > 0 ? '+' : ''}{row.shapA.toFixed(5)}</td>
                      <td className={styles.monoCell}>{row.shapB > 0 ? '+' : ''}{row.shapB.toFixed(5)}</td>
                      <td className={styles.monoCell} style={{ color: deltaColor, fontWeight: 700 }}>
                        {row.delta > 0 ? '+' : ''}{row.delta.toFixed(5)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
