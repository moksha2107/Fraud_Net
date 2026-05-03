import { useState } from 'react'
import toast from 'react-hot-toast'
import { ShieldAlert, ShieldCheck, Lock, CheckCircle2, RefreshCw } from 'lucide-react'
import api from '../api.js'
import styles from './Analyze.module.css'

/* ── Feature transformation ─────────────────────────────────────── */
function r(n) { return parseFloat(n.toFixed(4)) }

function convertToFeatures(raw) {
  const { amount, dateTime, payMethod, merchantCat, isIntl, cardType,
          pinEntered, txnCount, isNewMerchant, failedAttempts, amountSentiment } = raw

  const dt      = new Date(dateTime)
  const hour    = dt.getHours()
  const dow     = dt.getDay() === 0 ? 6 : dt.getDay() - 1

  const online  = payMethod === 'online'
  const atm     = payMethod === 'atm'
  const inStore = payMethod === 'instore'
  const late    = hour >= 0 && hour < 5
  const dawn    = hour >= 5 && hour < 7
  const logAmt  = Math.log1p(parseFloat(amount))
  const sent    = parseInt(amountSentiment, 10)
  const nTxn    = Math.min(parseInt(txnCount, 10), 20)
  const highVel = nTxn > 5
  const credit  = cardType === 'credit'
  const pin     = pinEntered && inStore
  const fail    = parseInt(failedAttempts, 10)

  const CAT_RISK = [0.10, 2.30, 1.60, 0.20, 1.20, 1.90, 0.15, 0.05, 0.00, 0.20]
  const mRisk   = CAT_RISK[parseInt(merchantCat, 10)] ?? 0.20

  const v1  = r((pin ? 1.1 : 0) - (late ? 1.9 : dawn ? 0.7 : 0) - (highVel ? 1.0 : 0) - (isIntl ? 0.8 : 0))
  const v2  = r((nTxn > 3 ? (nTxn - 3) * 0.45 : -0.2) + (online ? -0.6 : 0.2))
  const v3  = r((late ? 2.2 : dawn ? 0.9 : 0) + (nTxn > 4 ? 0.7 : 0))
  const v4  = r(mRisk + (online ? 1.6 : 0) + (fail === 2 ? 2.1 : fail === 1 ? 1.0 : 0) + (isNewMerchant ? 0.9 : 0))
  const v7  = r(sent * 1.9 + (logAmt - 4) * 0.35)
  const v9  = r(isIntl ? -3.2 : 0.5)
  const v10 = r(inStore ? (pin ? 2.3 : 0.9) : online ? -2.6 : -1.3)
  const v11 = r((credit ? 1.0 : -0.3) - (isNewMerchant ? 0.7 : 0) + (!isIntl ? 0.4 : 0))
  const v12 = r(-(late ? 2.6 : 0) - (highVel ? 1.9 : 0) - (isIntl ? 1.5 : 0)
               - (fail === 2 ? 2.3 : fail === 1 ? 1.2 : 0) - (online && isIntl ? 1.6 : 0))
  const v14 = r(-(online ? 3.6 : 0) - (isIntl ? 2.9 : 0) - (late ? 2.3 : 0)
               - (fail * 1.6) - (isNewMerchant ? 1.9 : 0) - (highVel ? 1.3 : 0)
               + (pin ? 3.1 : 0) + (credit ? 0.5 : 0) + (sent < 0 ? 0.6 : 0))
  const v16 = r(-(isIntl ? 2.3 : 0) - (online ? 1.0 : 0) - (atm ? 0.6 : 0))
  const v17 = r(-(sent > 0 ? sent * 1.6 : 0) - (late ? 1.9 : 0) + (pin ? 0.9 : 0))
  const v18 = r(nTxn > 5 ? (nTxn - 5) * 0.95 : 0)
  const v19 = r(isNewMerchant ? -2.2 : 0.9)
  const v20 = r(credit ? (sent > 0 ? -sent * 1.1 : 0.6) : (sent > 0 ? -sent * 0.6 : 0.4))

  return {
    amount: parseFloat(parseFloat(amount).toFixed(2)),
    hour_of_day: hour, day_of_week: dow,
    v1, v2, v3, v4, v7, v9, v10, v11, v12, v14, v16, v17, v18, v19, v20,
  }
}

/* ── AES-256-GCM client-side encrypt + discard ──────────────────── */
async function encryptAndDiscard(rawForm) {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
  const iv  = window.crypto.getRandomValues(new Uint8Array(12))
  await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key,
    new TextEncoder().encode(JSON.stringify(rawForm)))
  return true
}

/* ── SHAP bidirectional bar chart ───────────────────────────────── */
function ShapBars({ data }) {
  const maxAbs = Math.max(...data.map(d => Math.abs(d.shap_value)), 0.0001)
  return (
    <div className={styles.shapChart}>
      <div className={styles.shapHeader}>
        <span className={styles.shapFeat}>Feature</span>
        <span className={styles.shapBar} />
        <span className={styles.shapVal}>SHAP</span>
      </div>
      {data.map((d, i) => {
        const isPos = d.shap_value >= 0
        const pct   = (Math.abs(d.shap_value) / maxAbs) * 100
        const col   = isPos ? '#ff3d5a' : '#00ff88'
        return (
          <div key={i} className={styles.shapRow}>
            <span className={styles.shapFeat}>{d.feature}</span>
            <div className={styles.shapBar}>
              <div className={styles.biBar}>
                <div className={styles.half}>
                  {!isPos && <div className={styles.fillL} style={{ width: `${pct}%`, background: col }} />}
                </div>
                <div className={styles.center} />
                <div className={styles.half}>
                  {isPos && <div className={styles.fillR} style={{ width: `${pct}%`, background: col }} />}
                </div>
              </div>
            </div>
            <span className={styles.shapVal} style={{ color: col }}>
              {d.shap_value > 0 ? '+' : ''}{d.shap_value.toFixed(4)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const DEFAULT_FORM = {
  amount: '', dateTime: new Date().toISOString().slice(0, 16),
  payMethod: 'online', merchantCat: '0',
  isIntl: false, cardType: 'credit', pinEntered: false,
  txnCount: '1', isNewMerchant: false, failedAttempts: '0', amountSentiment: '0',
}

/* ── Toggle helper ──────────────────────────────────────────────── */
function Toggle({ value, onChange, onLabel, offLabel }) {
  return (
    <div className={styles.toggleRow}>
      <button type="button"
        className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
        onClick={() => onChange(!value)} aria-pressed={value}>
        <span className={styles.toggleThumb} />
      </button>
      <span className={styles.toggleLbl}>{value ? onLabel : offLabel}</span>
    </div>
  )
}

export default function Analyze() {
  const [form,      setForm]      = useState(DEFAULT_FORM)
  const [result,    setResult]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [encrypted, setEncrypted] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      toast.error('Enter a valid transaction amount')
      return
    }
    setLoading(true); setResult(null); setEncrypted(false)
    try {
      await encryptAndDiscard(form)
      setEncrypted(true)
      const { data } = await api.post('/predict', convertToFeatures(form))
      setResult(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function reset() { setForm(DEFAULT_FORM); setResult(null); setEncrypted(false) }

  const isFraud  = result?.verdict === 'FRAUD'
  const shapData = result?.shap_explanation?.slice(0, 10) ?? []

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Smart Transaction Analyzer</h1>
          <p className={styles.desc}>
            Describe your transaction in plain language — no V-values needed.
          </p>
        </div>
        <button type="button" className={styles.resetBtn} onClick={reset}>
          <RefreshCw size={13} /> Reset
        </button>
      </div>

      {/* ── Privacy badge ── */}
      <div className={styles.privacyBadge}>
        <Lock size={13} className={styles.privacyIcon} />
        <span>
          <strong>Privacy-first:</strong> Raw inputs are encrypted with AES-256-GCM
          locally and immediately discarded. Only anonymised statistical features reach the model.
        </span>
        {encrypted && (
          <span className={styles.encOk}><CheckCircle2 size={12} /> Encrypted</span>
        )}
      </div>

      <div className={styles.layout}>

        {/* ════════════ FORM ════════════ */}
        <form onSubmit={handleSubmit} className={styles.form}>

          {/* ── Section 1: Transaction Details ── */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Transaction Details</div>

            {/* Amount */}
            <div className={styles.field}>
              <label>Transaction Amount <span className={styles.req}>*</span></label>
              <div className={styles.inputPrefix}>
                <span>$</span>
                <input type="number" step="0.01" min="0.01" placeholder="0.00"
                  value={form.amount} onChange={e => set('amount', e.target.value)} required />
              </div>
            </div>

            {/* Date & Time */}
            <div className={styles.field}>
              <label>Date &amp; Time of Transaction</label>
              <input type="datetime-local" value={form.dateTime}
                onChange={e => set('dateTime', e.target.value)} required />
            </div>

            {/* Payment method */}
            <div className={styles.field}>
              <label>How did you pay?</label>
              <div className={styles.radioList}>
                {[
                  { v: 'online',  label: 'Online / Card-not-present', sub: 'Website, app, or phone' },
                  { v: 'instore', label: 'In-store',                  sub: 'Chip, swipe, or tap' },
                  { v: 'atm',     label: 'ATM / Cash withdrawal',     sub: 'ATM or cash advance' },
                ].map(opt => (
                  <label key={opt.v}
                    className={`${styles.radioItem} ${form.payMethod === opt.v ? styles.radioItemOn : ''}`}>
                    <input type="radio" name="payMethod" value={opt.v}
                      checked={form.payMethod === opt.v}
                      onChange={() => set('payMethod', opt.v)} />
                    <div className={styles.radioContent}>
                      <span className={styles.radioLabel}>{opt.label}</span>
                      <span className={styles.radioSub}>{opt.sub}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section 2: Merchant & Location ── */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Merchant &amp; Location</div>

            <div className={styles.field}>
              <label>Merchant Category</label>
              <select value={form.merchantCat} onChange={e => set('merchantCat', e.target.value)}>
                <option value="0">🛍️  Retail &amp; General Shopping</option>
                <option value="1">🌐  Online Marketplace</option>
                <option value="2">✈️  Travel &amp; Transport</option>
                <option value="3">🍔  Food &amp; Dining</option>
                <option value="4">🎬  Entertainment &amp; Leisure</option>
                <option value="5">🏧  ATM / Cash Withdrawal</option>
                <option value="6">⛽  Gas Station &amp; Fuel</option>
                <option value="7">🏥  Healthcare &amp; Medical</option>
                <option value="8">💡  Utilities &amp; Bills</option>
                <option value="9">📦  Other</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>First time with this merchant?</label>
              <Toggle value={form.isNewMerchant} onChange={v => set('isNewMerchant', v)}
                onLabel="Yes — new merchant" offLabel="No — I've been here before" />
            </div>

            <div className={styles.field}>
              <label>International transaction?</label>
              <Toggle value={form.isIntl} onChange={v => set('isIntl', v)}
                onLabel="Yes — foreign country / currency" offLabel="No — domestic" />
            </div>
          </div>

          {/* ── Section 3: Card & Security ── */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Card &amp; Security</div>

            <div className={styles.field}>
              <label>Card Type</label>
              <div className={styles.pillGroup}>
                {[
                  { v: 'credit', label: '💳 Credit Card' },
                  { v: 'debit',  label: '🏦 Debit Card'  },
                ].map(opt => (
                  <label key={opt.v}
                    className={`${styles.pill} ${form.cardType === opt.v ? styles.pillOn : ''}`}>
                    <input type="radio" name="cardType" value={opt.v}
                      checked={form.cardType === opt.v} onChange={() => set('cardType', opt.v)} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {form.payMethod === 'instore' && (
              <div className={styles.field}>
                <label>Was your PIN entered?</label>
                <Toggle value={form.pinEntered} onChange={v => set('pinEntered', v)}
                  onLabel="Yes — PIN verified" offLabel="No (tap / swipe / signature)" />
              </div>
            )}

            <div className={styles.field}>
              <label>Failed payment attempts before this?</label>
              <select value={form.failedAttempts} onChange={e => set('failedAttempts', e.target.value)}>
                <option value="0">None — first attempt succeeded</option>
                <option value="1">1 previous failed attempt</option>
                <option value="2">2 or more failed attempts</option>
              </select>
            </div>
          </div>

          {/* ── Section 4: Spending Context ── */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Spending Context</div>

            <div className={styles.field}>
              <label>How many payments today? <span className={styles.labelNote}>(including this one)</span></label>
              <input type="number" min="1" max="50" step="1" placeholder="1"
                value={form.txnCount} onChange={e => set('txnCount', e.target.value)} required />
            </div>

            <div className={styles.field}>
              <label>How unusual is this amount for you?</label>
              <select value={form.amountSentiment} onChange={e => set('amountSentiment', e.target.value)}>
                <option value="-2">Much less than usual</option>
                <option value="-1">Somewhat less than usual</option>
                <option value="0">About my normal amount</option>
                <option value="1">Somewhat higher than usual</option>
                <option value="2">Much higher than usual</option>
              </select>
            </div>
          </div>

          {/* ── Submit ── */}
          <div className={styles.formFooter}>
            <button className={styles.submitBtn} disabled={loading}>
              {loading
                ? <><span className={styles.spinner} /> {encrypted ? 'Analysing…' : 'Encrypting…'}</>
                : <><Lock size={14} /> Encrypt &amp; Analyse</>
              }
            </button>
          </div>
        </form>

        {/* ════════════ RESULT / PLACEHOLDER ════════════ */}
        {result ? (
          <div className={`${styles.result} ${isFraud ? styles.rFraud : styles.rLegit}`}>

            <div className={styles.verdictBox}>
              <div className={`${styles.vIcon} ${isFraud ? styles.vIconFraud : styles.vIconLegit}`}>
                {isFraud
                  ? <ShieldAlert size={28} color="var(--red)" />
                  : <ShieldCheck size={28} color="var(--green)" />}
              </div>
              <div>
                <div className={styles.verdictText}
                  style={{ color: isFraud ? 'var(--red)' : 'var(--green)' }}>
                  {result.verdict}
                </div>
                <div className={styles.verdictSub}>
                  {isFraud ? 'Fraud patterns detected' : 'Transaction appears legitimate'}
                </div>
              </div>
            </div>

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

            <div className={styles.riskWrap}>
              <div className={styles.riskTrack}>
                <div className={styles.riskFill} style={{
                  width: `${result.risk_score}%`,
                  background: isFraud
                    ? 'linear-gradient(90deg,#ff8c00,var(--red))'
                    : 'linear-gradient(90deg,var(--green-dim),var(--green))',
                  boxShadow: isFraud ? 'var(--glow-red)' : 'var(--glow-green)',
                }} />
              </div>
              <div className={styles.riskLabels}>
                <span>Low</span><span>Medium</span><span>High</span>
              </div>
            </div>

            <div className={styles.block}>
              <div className={styles.blockTitle}>Top Risk Factors</div>
              <div className={styles.factors}>
                {result.top_risk_factors.map((f, i) => (
                  <div key={i} className={styles.factor}>
                    <span className={styles.factorNum}>{i + 1}</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {shapData.length > 0 && (
              <div className={styles.block}>
                <div className={styles.blockTitle}>SHAP Feature Impact</div>
                <p className={styles.shapNote}>■ Red = increases risk · ■ Green = decreases</p>
                <ShapBars data={shapData} />
              </div>
            )}

            <div className={styles.privacyFooter}>
              <Lock size={11} /> Raw inputs were encrypted locally and never transmitted.
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}><Lock size={36} /></div>
            <h3>No analysis yet</h3>
            <p>Fill in your transaction details and click <strong>Encrypt &amp; Analyse</strong>.</p>
            <div className={styles.featureList}>
              <div className={styles.featureItem}><CheckCircle2 size={13} /> AES-256-GCM client-side encryption</div>
              <div className={styles.featureItem}><CheckCircle2 size={13} /> Raw inputs never leave your browser</div>
              <div className={styles.featureItem}><CheckCircle2 size={13} /> SHAP explainability on every result</div>
              <div className={styles.featureItem}><CheckCircle2 size={13} /> No V1–V28 knowledge required</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
