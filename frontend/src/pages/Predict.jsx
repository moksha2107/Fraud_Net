import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { ShieldAlert, ShieldCheck, Info, RefreshCw } from 'lucide-react'
import api from '../api.js'
import styles from './Predict.module.css'

const FIELDS = [
  { key: 'amount',      label: 'Amount ($)',  placeholder: '0.00',
    info: 'Transaction amount in USD. Unusually large or small amounts relative to cardholder history are a fraud signal.' },
  { key: 'hour_of_day', label: 'Hour of Day', placeholder: '0–23',
    info: 'Hour the transaction occurred (0 = midnight, 23 = 11 PM). Transactions in the early hours carry higher baseline risk.' },
  { key: 'day_of_week', label: 'Day of Week', placeholder: '0=Mon … 6=Sun',
    info: 'Day of the week (0 = Monday). Weekend spending patterns differ from weekday norms and can affect risk scoring.' },
  { key: 'v1',  label: 'V1',  placeholder: '–',
    info: 'PCA component 1 — overall transaction context. Strong negative values correlate with abnormal activity in cardholder history.' },
  { key: 'v2',  label: 'V2',  placeholder: '–',
    info: 'PCA component 2 — spending velocity signal. Encodes how rapidly charges are accumulating relative to baseline.' },
  { key: 'v3',  label: 'V3',  placeholder: '–',
    info: 'PCA component 3 — time-since-last-transaction. Large positive values indicate unusually rapid successive transactions.' },
  { key: 'v4',  label: 'V4',  placeholder: '–',
    info: 'PCA component 4 — merchant category match. Whether the merchant type fits the cardholder\'s typical purchasing pattern.' },
  { key: 'v7',  label: 'V7',  placeholder: '–',
    info: 'PCA component 7 — amount deviation. How far the current amount deviates from the cardholder\'s historical average spend.' },
  { key: 'v9',  label: 'V9',  placeholder: '–',
    info: 'PCA component 9 — geographic signal. Encodes transaction origin patterns relative to the cardholder\'s typical locations.' },
  { key: 'v10', label: 'V10', placeholder: '–',
    info: 'PCA component 10 — card-present indicator. Online/CNP transactions have distinctly different values from in-person ones.' },
  { key: 'v11', label: 'V11', placeholder: '–',
    info: 'PCA component 11 — account age and card usage pattern. Reflects how established this spending behaviour is.' },
  { key: 'v12', label: 'V12', placeholder: '–',
    info: 'PCA component 12 — top fraud discriminator. Captures complex interactions between time, amount, and merchant type.' },
  { key: 'v14', label: 'V14', placeholder: '–',
    info: 'PCA component 14 — strongest single fraud predictor in the dataset. Highly negative values are a strong fraud signal.' },
  { key: 'v16', label: 'V16', placeholder: '–',
    info: 'PCA component 16 — cross-border indicator. Flags transactions that appear geographically inconsistent with usual patterns.' },
  { key: 'v17', label: 'V17', placeholder: '–',
    info: 'PCA component 17 — second strongest fraud predictor. Relates to high-value transaction anomalies and rapid balance changes.' },
  { key: 'v18', label: 'V18', placeholder: '–',
    info: 'PCA component 18 — short-window velocity. High values indicate many transactions in a very short time period.' },
  { key: 'v19', label: 'V19', placeholder: '–',
    info: 'PCA component 19 — new payee / new merchant signal. Whether the cardholder has previously transacted with this merchant.' },
  { key: 'v20', label: 'V20', placeholder: '–',
    info: 'PCA component 20 — balance and credit limit signal. How the current transaction interacts with available credit.' },
]

const DEFAULTS = Object.fromEntries(FIELDS.map(f => [f.key, '']))

function FieldInfo({ info }) {
  const [pos, setPos] = useState(null)
  const ref = useRef(null)

  function handleEnter() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.top - 8, left: r.left + r.width / 2 })
    }
  }

  return (
    <span
      ref={ref}
      className={styles.infoIcon}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setPos(null)}
    >
      <Info size={11} />
      {pos && (
        <span
          className={styles.tooltip}
          style={{
            top: pos.top,
            left: pos.left,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          {info}
        </span>
      )}
    </span>
  )
}

/* ── Custom SHAP bar chart ──────────────────────────────────────── */
function ShapBars({ data }) {
  const maxAbs = Math.max(...data.map(d => Math.abs(d.shap_value)), 0.0001)

  return (
    <div className={styles.shapChart}>
      {/* Header row */}
      <div className={styles.shapHeader}>
        <span className={styles.shapFeatureCol}>Feature</span>
        <span className={styles.shapBarCol} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>← decreases risk &nbsp;|&nbsp; increases risk →</span>
        <span className={styles.shapValCol}>SHAP</span>
      </div>

      {data.map((d, i) => {
        const isPos  = d.shap_value >= 0
        const pct    = (Math.abs(d.shap_value) / maxAbs) * 100
        const color  = isPos ? '#ff3d5a' : '#00ff88'

        return (
          <div key={i} className={styles.shapRow}>
            {/* Feature name */}
            <span className={styles.shapFeatureCol}>{d.feature}</span>

            {/* Bidirectional bar — left half (negative) and right half (positive) */}
            <div className={styles.shapBarCol}>
              <div className={styles.shapBiBar}>
                {/* Left half: negative (green) bars grow right→left */}
                <div className={styles.shapHalf}>
                  {!isPos && (
                    <div
                      className={styles.shapFillLeft}
                      style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}55` }}
                    />
                  )}
                </div>
                {/* Center line */}
                <div className={styles.shapCenterLine} />
                {/* Right half: positive (red) bars grow left→right */}
                <div className={styles.shapHalf}>
                  {isPos && (
                    <div
                      className={styles.shapFillRight}
                      style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}55` }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Numeric value */}
            <span className={styles.shapValCol} style={{ color }}>
              {d.shap_value > 0 ? '+' : ''}{d.shap_value.toFixed(5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function Predict() {
  const [form, setForm]     = useState(DEFAULTS)
  const [result, setResult] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [sampling, setSampling] = useState(false)
  const [sampleLabel, setSampleLabel] = useState(null) // actual class from CSV

  async function loadSample() {
    setSampling(true)
    setSampleLabel(null)
    try {
      const { data } = await api.get('/predict/sample')
      const { is_fraud, ...fields } = data
      setForm(Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, String(v)])
      ))
      setSampleLabel(is_fraud)
      toast.success(is_fraud
        ? '⚠ Loaded a real FRAUD transaction from dataset'
        : '✓ Loaded a real LEGITIMATE transaction from dataset',
        { duration: 4000 }
      )
      setResult(null)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load sample'
      toast.error(`Sample error: ${msg}`, { duration: 6000 })
    } finally {
      setSampling(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, parseFloat(v)])
      )
      const { data } = await api.post('/predict', payload)
      setResult(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const isFraud  = result?.verdict === 'FRAUD'
  const shapData = result?.shap_explanation?.slice(0, 10) ?? []

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Transaction Analysis</h1>
          <p className={styles.desc}>Run real-time fraud detection with SHAP explainability</p>
        </div>
        <button
          type="button"
          className={styles.sampleBtn}
          onClick={loadSample}
          disabled={sampling}
        >
          <RefreshCw size={13} className={sampling ? styles.spin : ''} />
          {sampling ? 'Loading…' : 'Random from Dataset'}
        </button>
      </div>

      {/* Ground truth banner when sample loaded */}
      {sampleLabel !== null && (
        <div className={`${styles.groundTruth} ${sampleLabel ? styles.gtFraud : styles.gtLegit}`}>
          <strong>Dataset ground truth:</strong>&nbsp;
          {sampleLabel
            ? 'This is a confirmed FRAUD transaction from the real dataset'
            : 'This is a confirmed LEGITIMATE transaction from the real dataset'}
          {result && (
            <span className={styles.gtMatch}>
              {(isFraud && sampleLabel) || (!isFraud && !sampleLabel)
                ? '  ✓ Model prediction matches'
                : '  ✗ Model prediction differs'}
            </span>
          )}
        </div>
      )}

      <div className={styles.layout}>
        {/* ── Input form ── */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formHeader}>
            <span className={styles.sectionLabel}>Feature Inputs</span>
            <span className={styles.fieldCount}>{FIELDS.length} features</span>
          </div>

          <div className={styles.grid}>
            {FIELDS.map(({ key, label, placeholder, info }) => (
              <div key={key} className={styles.field}>
                <div className={styles.labelRow}>
                  <span className={styles.label}>{label}</span>
                  <FieldInfo info={info} />
                </div>
                <input
                  type="number"
                  step="any"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  required
                />
              </div>
            ))}
          </div>

          <button className={styles.submitBtn} disabled={loading}>
            {loading
              ? <><span className={styles.spinner} /> Analysing transaction…</>
              : <><ShieldAlert size={14} /> Analyse Transaction</>
            }
          </button>
        </form>

        {/* ── Result panel ── */}
        {result ? (
          <div className={`${styles.result} ${isFraud ? styles.resultFraud : styles.resultLegit}`}>
            {/* Verdict */}
            <div className={styles.verdictBox}>
              <div className={`${styles.verdictIconBox} ${isFraud ? styles.viBoxFraud : styles.viBoxLegit}`}>
                {isFraud
                  ? <ShieldAlert size={28} color="var(--red)" />
                  : <ShieldCheck size={28} color="var(--green)" />
                }
              </div>
              <div>
                <div className={styles.verdictText}
                  style={{ color: isFraud ? 'var(--red)' : 'var(--green)' }}>
                  {result.verdict}
                </div>
                <div className={styles.verdictSub}>
                  {isFraud
                    ? 'Fraud patterns detected in this transaction'
                    : 'Transaction appears legitimate'}
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <div className={styles.metricVal}
                  style={{ color: result.risk_score > 50 ? 'var(--red)' : 'var(--green)' }}>
                  {result.risk_score}%
                </div>
                <div className={styles.metricKey}>Risk Score</div>
              </div>
              <div className={styles.metricSep} />
              <div className={styles.metric}>
                <div className={styles.metricVal}>{(result.confidence * 100).toFixed(1)}%</div>
                <div className={styles.metricKey}>Confidence</div>
              </div>
              <div className={styles.metricSep} />
              <div className={styles.metric}>
                <div className={styles.metricVal} style={{ fontSize: 11 }}>{result.model_used}</div>
                <div className={styles.metricKey}>Model</div>
              </div>
            </div>

            {/* Risk bar */}
            <div className={styles.riskWrap}>
              <div className={styles.riskTrack}>
                <div className={styles.riskFill}
                  style={{
                    width: `${result.risk_score}%`,
                    background: isFraud
                      ? 'linear-gradient(90deg, #ff8c00, var(--red))'
                      : 'linear-gradient(90deg, var(--green-dim), var(--green))',
                    boxShadow: isFraud ? 'var(--glow-red)' : 'var(--glow-green)',
                  }}
                />
              </div>
              <div className={styles.riskLabels}>
                <span>Low</span><span>Medium</span><span>High</span>
              </div>
            </div>

            {/* Top factors */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Top Risk Factors</div>
              <div className={styles.factorList}>
                {result.top_risk_factors.map((f, i) => (
                  <div key={i} className={styles.factor}>
                    <span className={styles.factorNum}>{i + 1}</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SHAP */}
            {shapData.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>SHAP Feature Impact</div>
                <p className={styles.shapNote}>
                  ■ Red = increases fraud risk &nbsp;·&nbsp; ■ Green = decreases fraud risk
                </p>
                <ShapBars data={shapData} />
              </div>
            )}
          </div>
        ) : (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>
              <ShieldAlert size={36} />
            </div>
            <h3>No analysis yet</h3>
            <p>Load a random transaction from the dataset or enter values manually, then click <strong>Analyse</strong>.</p>
          </div>
        )}
      </div>
    </div>
  )
}
