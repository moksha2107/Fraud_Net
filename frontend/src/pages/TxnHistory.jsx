import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  CreditCard, Upload, Download, X,
  ChevronUp, ChevronDown, AlertTriangle, Mail, CheckCircle,
} from 'lucide-react'
import api from '../api.js'
import styles from './TxnHistory.module.css'

/* ── Required / optional CSV columns ───────────────────────────── */
const REQUIRED_COLS = ['date', 'amount', 'merchant']
const OPTIONAL_COLS = ['category', 'location', 'card_type', 'channel']
const ALL_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS]

/* ── Template CSV ───────────────────────────────────────────────── */
const TEMPLATE_CSV = `date,amount,merchant,category,location,card_type,channel
2024-03-15 14:30:00,45.99,Whole Foods Market,groceries,domestic,credit,in-store
2024-03-15 02:15:00,3499.00,Unknown Online Store,online,international,credit,online
2024-03-14 09:00:00,12.50,Starbucks,restaurant,domestic,credit,contactless
`

/* ── Feature conversion ─────────────────────────────────────────── */
function rowToFeatures(row) {
  const d = new Date(row.date)
  const hour = isNaN(d) ? 12 : d.getHours()
  const dow  = isNaN(d) ? 1  : d.getDay()

  const catStr = (row.category || '').toLowerCase()
  let merchantCat = 2
  if (/grocery|food|supermarket|mart/.test(catStr))              merchantCat = 0
  if (/restaurant|cafe|coffee|bar|dining/.test(catStr))          merchantCat = 1
  if (/online|ecommerce|e-commerce|amazon|ebay/.test(catStr))    merchantCat = 3
  if (/travel|airline|hotel|flight|booking/.test(catStr))        merchantCat = 4
  if (/entertainment|cinema|gaming|streaming/.test(catStr))      merchantCat = 5
  if (/fuel|gas|petrol/.test(catStr))                            merchantCat = 6
  if (/pharmacy|medical|health/.test(catStr))                    merchantCat = 7

  const ch = (row.channel || 'in-store').toLowerCase()
  const payMethod = ch.includes('online') ? 0 : ch.includes('contactless') ? 2 : 1

  const loc = (row.location || '').toLowerCase()
  const isIntl = /intl|international|abroad|foreign|overseas/.test(loc)

  const cardType = (row.card_type || 'credit').toLowerCase().includes('debit') ? 0 : 1

  const amount = parseFloat(row.amount) || 0
  const amountSentiment = amount < 10 ? 0 : amount < 100 ? 1 : amount < 500 ? 2 : 3
  const txnCount = 1
  const isNewMerchant = 0
  const pinEntered = payMethod === 1 ? 1 : 0
  const failedAttempts = 0

  const v14 = -0.4
    - (payMethod === 0 ? 1.2 : 0)
    - (isIntl ? 0.9 : 0)
    - (hour >= 0 && hour < 6 ? 0.7 : 0)
    - (amountSentiment === 3 ? 0.5 : 0)
    + (merchantCat === 0 ? 0.3 : 0)
    + (pinEntered ? 0.4 : 0)

  const v4 = 0.2
    + (payMethod === 0 ? 0.8 : 0)
    + (merchantCat === 3 ? 0.5 : 0)
    + (merchantCat === 4 ? 0.4 : 0)
    - (merchantCat === 0 ? 0.3 : 0)
    + (cardType === 0 ? 0.2 : 0)
    + (isIntl ? 0.5 : 0)

  const v12 = -0.1
    - (hour >= 0 && hour < 6 ? 0.9 : 0)
    - (amountSentiment >= 2 ? 0.4 : 0)
    + (merchantCat <= 1 ? 0.3 : 0)
    + (pinEntered ? 0.3 : 0)
    - (isIntl ? 0.4 : 0)

  const v10 = -0.1
    - (payMethod === 0 ? 0.7 : 0)
    - (isIntl ? 0.5 : 0)
    + (pinEntered ? 0.5 : 0)
    + (merchantCat === 0 ? 0.2 : 0)

  const v17 = -0.05
    - (amountSentiment === 3 ? 0.9 : 0)
    - (hour >= 0 && hour < 4 ? 0.5 : 0)
    + (merchantCat <= 1 ? 0.3 : 0)
    - (isIntl ? 0.3 : 0)
    + (payMethod === 1 ? 0.2 : 0)

  const v3 = 0.05
    + (txnCount > 5 ? 0.7 : 0)
    + (txnCount > 10 ? 0.5 : 0)
    + (hour >= 0 && hour < 6 ? 0.4 : 0)

  const v11 = 0.1
    + (merchantCat >= 3 ? 0.5 : 0)
    - (merchantCat <= 1 ? 0.3 : 0)
    + (isIntl ? 0.4 : 0)
    + (amountSentiment >= 2 ? 0.3 : 0)

  const v16 = -0.05
    - (isIntl ? 0.8 : 0)
    - (payMethod === 0 ? 0.5 : 0)
    + (merchantCat <= 1 ? 0.2 : 0)

  const v9 = -0.05
    + (failedAttempts > 0 ? 0.8 : 0)
    + (isNewMerchant ? 0.4 : 0)
    - (pinEntered ? 0.4 : 0)
    + (payMethod === 0 ? 0.2 : 0)

  const v7 = 0.05
    + (amountSentiment === 3 ? 0.7 : 0)
    + (amountSentiment === 2 ? 0.3 : 0)
    - (merchantCat === 0 ? 0.3 : 0)

  const v1 = -0.1
    - (payMethod === 0 ? 0.3 : 0)
    - (isIntl ? 0.2 : 0)
    + (pinEntered ? 0.2 : 0)

  const v2 = 0.1
    + (txnCount > 5 ? 0.4 : 0)
    + (amountSentiment >= 2 ? 0.3 : 0)
    - (merchantCat === 0 ? 0.2 : 0)

  const v18 = 0.05
    + (txnCount > 5 ? 0.5 : 0)
    - (pinEntered ? 0.3 : 0)
    + (failedAttempts > 0 ? 0.4 : 0)

  const v19 = 0.05
    + (isNewMerchant ? 0.6 : 0)
    + (isIntl ? 0.3 : 0)
    - (merchantCat <= 1 ? 0.2 : 0)

  const v20 = 0.02
    + (amountSentiment === 3 ? 0.4 : 0)
    + (cardType === 0 ? 0.2 : 0)
    - (merchantCat === 0 ? 0.2 : 0)

  return {
    amount:       parseFloat(amount.toFixed(2)),
    hour_of_day:  hour,
    day_of_week:  dow,
    v1:  parseFloat(v1.toFixed(4)),
    v2:  parseFloat(v2.toFixed(4)),
    v3:  parseFloat(v3.toFixed(4)),
    v4:  parseFloat(v4.toFixed(4)),
    v7:  parseFloat(v7.toFixed(4)),
    v9:  parseFloat(v9.toFixed(4)),
    v10: parseFloat(v10.toFixed(4)),
    v11: parseFloat(v11.toFixed(4)),
    v12: parseFloat(v12.toFixed(4)),
    v14: parseFloat(v14.toFixed(4)),
    v16: parseFloat(v16.toFixed(4)),
    v17: parseFloat(v17.toFixed(4)),
    v18: parseFloat(v18.toFixed(4)),
    v19: parseFloat(v19.toFixed(4)),
    v20: parseFloat(v20.toFixed(4)),
  }
}

/* ── CSV parser ─────────────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.')

  const rawHeaders = lines[0].split(',').map(h => h.trim())
  const headers = rawHeaders.map(h => h.toLowerCase())

  const missing = REQUIRED_COLS.filter(c => !headers.includes(c))
  if (missing.length > 0)
    throw new Error(`Missing required column(s): ${missing.join(', ')}. Required: date, amount, merchant.`)

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim())
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = vals[idx] ?? '' })
    rows.push(obj)
  }

  return { headers: rawHeaders, rows }
}

/* ── Template download ──────────────────────────────────────────── */
function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'fraudnet_card_history_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Export results ─────────────────────────────────────────────── */
function exportResults(results) {
  const header = ['date', 'merchant', 'amount', 'verdict', 'risk_score', 'confidence', 'top_factor'].join(',')
  const dataRows = results.map(r =>
    [
      `"${(r.date || '').replace(/"/g, '""')}"`,
      `"${(r.merchant || '').replace(/"/g, '""')}"`,
      r.amount,
      r.verdict,
      r.risk_score,
      (r.confidence * 100).toFixed(1),
      `"${(r.top_risk_factors?.[0] ?? '').replace(/"/g, '""')}"`,
    ].join(',')
  )
  const csv  = [header, ...dataRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'fraudnet_card_history_results.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Risk colour helper ─────────────────────────────────────────── */
function getRiskColor(score) {
  if (score > 65) return 'var(--red)'
  if (score > 35) return 'var(--yellow)'
  return 'var(--green)'
}

/* ── Mini risk bar ──────────────────────────────────────────────── */
function MiniBar({ value }) {
  const color = getRiskColor(value)
  return (
    <div className={styles.miniBarWrap}>
      <div className={styles.miniTrack}>
        <div className={styles.miniFill} style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}55` }} />
      </div>
      <span className={styles.miniVal} style={{ color }}>{value}%</span>
    </div>
  )
}

/* ── ETA formatter ──────────────────────────────────────────────── */
function fmtEta(ms) {
  if (ms == null || ms <= 0) return '—'
  if (ms < 1000)  return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

/* ════════════════════════════════════════════════════════════════ */
export default function TxnHistory() {
  const [phase,      setPhase]      = useState('idle') // idle | ready | scanning | done | error
  const [errorMsg,   setErrorMsg]   = useState('')
  const [fileName,   setFileName]   = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [dragOver,   setDragOver]   = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [currentRow, setCurrentRow] = useState(0)
  const [results,    setResults]    = useState([])
  const [sortDir,    setSortDir]    = useState('desc')
  const [etaMs,      setEtaMs]      = useState(null)
  const cancelRef   = useRef(false)
  const fileInputRef = useRef(null)

  /* ── File handling ──────────────────────────────────────────── */
  function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setPhase('error')
      setErrorMsg('Only CSV files are supported. Please upload a .csv file.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const parsed = parseCSV(e.target.result)
        setParsedData(parsed)
        setFileName(file.name)
        setPhase('ready')
        setErrorMsg('')
      } catch (err) {
        setPhase('error')
        setErrorMsg(err.message)
      }
    }
    reader.readAsText(file)
  }

  const onDrop = useCallback(e => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const onDragOver  = useCallback(e => { e.preventDefault(); setDragOver(true) }, [])
  const onDragLeave = useCallback(() => setDragOver(false), [])

  /* ── Scan loop ──────────────────────────────────────────────── */
  async function startScan() {
    if (!parsedData) return
    cancelRef.current = false
    setPhase('scanning')
    setResults([])
    setProgress(0)
    setCurrentRow(0)
    setEtaMs(null)

    const { rows } = parsedData
    const total = rows.length
    const accumulated = []
    const timings = []

    for (let i = 0; i < total; i++) {
      if (cancelRef.current) break
      const t0 = performance.now()
      try {
        const features = rowToFeatures(rows[i])
        const { data } = await api.post('/predict', features)
        const timeTaken = Math.round(performance.now() - t0)
        timings.push(timeTaken)
        accumulated.push({
          ...data,
          rowNum:   i + 1,
          date:     rows[i].date     || '',
          merchant: rows[i].merchant || '',
          amount:   parseFloat(rows[i].amount) || 0,
          timeTaken,
        })
      } catch {
        const timeTaken = Math.round(performance.now() - t0)
        timings.push(timeTaken)
        accumulated.push({
          rowNum:          i + 1,
          date:            rows[i].date     || '',
          merchant:        rows[i].merchant || '',
          amount:          parseFloat(rows[i].amount) || 0,
          verdict:         'ERROR',
          risk_score:      0,
          confidence:      0,
          model_used:      '—',
          top_risk_factors: [],
          timeTaken,
        })
      }

      const done = i + 1
      setCurrentRow(done)
      setProgress(Math.round((done / total) * 100))
      if (timings.length > 0) {
        const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length
        setEtaMs(Math.round(avgMs * (total - done)))
      }
    }

    setResults(accumulated)
    setPhase('done')

    /* ── Fire-and-forget email notification ─────────────────── */
    const fraud      = accumulated.filter(r => r.verdict === 'FRAUD').length
    const legit      = accumulated.filter(r => r.verdict === 'LEGITIMATE').length
    const avg_risk   = parseFloat((accumulated.reduce((s, r) => s + r.risk_score, 0) / accumulated.length).toFixed(1))
    const highest_risk = Math.max(...accumulated.map(r => r.risk_score))
    api.post('/notify/scan-complete', {
      total: accumulated.length,
      fraud,
      legit,
      avg_risk,
      highest_risk,
      scan_type: 'Card History',
    }).then(() => {
      toast.success('📧 Scan summary emailed to you', { duration: 4000 })
    }).catch(() => {/* silent — email is best-effort */})
  }

  function cancelScan() { cancelRef.current = true }

  function reset() {
    setPhase('idle')
    setParsedData(null)
    setFileName('')
    setResults([])
    setProgress(0)
    setCurrentRow(0)
    setEtaMs(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* ── Derived state ──────────────────────────────────────────── */
  const sortedResults = [...results].sort((a, b) =>
    sortDir === 'desc' ? b.risk_score - a.risk_score : a.risk_score - b.risk_score
  )

  const summary = results.length > 0 ? {
    total:       results.length,
    fraud:       results.filter(r => r.verdict === 'FRAUD').length,
    legit:       results.filter(r => r.verdict === 'LEGITIMATE').length,
    avgRisk:     (results.reduce((s, r) => s + r.risk_score, 0) / results.length).toFixed(1),
    highestRisk: Math.max(...results.map(r => r.risk_score)),
  } : null

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <CreditCard size={20} color="var(--green)" />
          </div>
          <div>
            <h1 className={styles.title}>Card History Scanner</h1>
            <p className={styles.subtitle}>
              Upload your bank statement CSV — we convert it to ML features automatically
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.templateBtn} onClick={downloadTemplate}>
            <Download size={13} />
            Download Template
          </button>
          {phase !== 'idle' && (
            <button className={styles.resetBtn} onClick={reset}>
              <X size={13} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Column info strip ── */}
      <div className={styles.colInfo}>
        <span className={styles.colInfoLabel}>Required columns:</span>
        {REQUIRED_COLS.map(c => (
          <span key={c} className={styles.colTag}>{c}</span>
        ))}
        <span className={styles.colInfoSep} />
        <span className={styles.colInfoLabel}>Optional:</span>
        {OPTIONAL_COLS.map(c => (
          <span key={c} className={`${styles.colTag} ${styles.colTagOpt}`}>{c}</span>
        ))}
      </div>

      {/* ── Drop zone ── */}
      {(phase === 'idle' || phase === 'error') && (
        <>
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} color={dragOver ? 'var(--green)' : 'var(--text-dim)'} />
            <div className={styles.dropTitle}>
              {dragOver ? 'Drop your CSV here' : 'Drag & drop your bank statement CSV'}
            </div>
            <div className={styles.dropSub}>
              or click to browse — must contain: date, amount, merchant
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className={styles.hiddenInput}
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>
          {phase === 'error' && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}
        </>
      )}

      {/* ── File ready / preview ── */}
      {phase === 'ready' && parsedData && (
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <div className={styles.previewMeta}>
              <CreditCard size={15} color="var(--green)" />
              <span className={styles.previewFileName}>{fileName}</span>
              <span className={styles.previewCount}>{parsedData.rows.length} rows</span>
            </div>
            <button className={styles.scanBtn} onClick={startScan}>
              <CheckCircle size={14} />
              Scan All Transactions
            </button>
          </div>

          <div className={styles.previewTableWrap}>
            <div className={styles.previewLabel}>Preview — first 3 rows</div>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  {parsedData.headers.map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {parsedData.rows.slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    {parsedData.headers.map(h => (
                      <td key={h}>{row[h.toLowerCase()] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Scanning progress ── */}
      {phase === 'scanning' && (
        <div className={styles.progressCard}>
          <div className={styles.progressTopRow}>
            <div className={styles.progressInfo}>
              <span className={styles.progressLabel}>Scanning transactions</span>
              <span className={styles.progressCounter}>
                {currentRow} / {parsedData?.rows.length ?? '?'}
              </span>
            </div>
            <div className={styles.progressMeta}>
              <span className={styles.etaLabel}>ETA: {fmtEta(etaMs)}</span>
              <button className={styles.cancelBtn} onClick={cancelScan}>
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.progressPct}>{progress}% complete</div>
        </div>
      )}

      {/* ── Done — summary + results ── */}
      {phase === 'done' && summary && (
        <>
          <div className={styles.summaryStrip}>
            <div className={styles.summaryItem}>
              <div className={styles.summaryVal}>{summary.total}</div>
              <div className={styles.summaryKey}>Total</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryVal} style={{ color: 'var(--red)' }}>{summary.fraud}</div>
              <div className={styles.summaryKey}>Fraud</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryVal} style={{ color: 'var(--green)' }}>{summary.legit}</div>
              <div className={styles.summaryKey}>Legitimate</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryVal} style={{ color: 'var(--yellow)' }}>{summary.avgRisk}%</div>
              <div className={styles.summaryKey}>Avg Risk</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryVal} style={{ color: 'var(--red)' }}>{summary.highestRisk}%</div>
              <div className={styles.summaryKey}>Highest Risk</div>
            </div>
            <div className={styles.summaryActions}>
              <button className={styles.exportBtn} onClick={() => exportResults(results)}>
                <Download size={13} />
                Export CSV
              </button>
            </div>
          </div>

          <div className={styles.resultsTableWrap}>
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Verdict</th>
                  <th
                    className={styles.sortableHeader}
                    onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  >
                    Risk Score
                    {sortDir === 'desc'
                      ? <ChevronDown size={12} />
                      : <ChevronUp size={12} />}
                  </th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map(r => {
                  const isFraud = r.verdict === 'FRAUD'
                  return (
                    <tr key={r.rowNum} className={isFraud ? styles.fraudRow : ''}>
                      <td className={styles.monoCell}>{r.date || '—'}</td>
                      <td className={styles.merchantCell}>{r.merchant || '—'}</td>
                      <td className={styles.monoCell}>${r.amount.toFixed(2)}</td>
                      <td>
                        <span className={`${styles.verdictBadge} ${isFraud ? styles.fraudBadge : styles.legitBadge}`}>
                          {r.verdict}
                        </span>
                      </td>
                      <td>
                        <MiniBar value={r.risk_score} />
                      </td>
                      <td className={styles.monoCell}>{(r.confidence * 100).toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
