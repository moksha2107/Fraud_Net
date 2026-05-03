import { useState, useRef, useCallback } from 'react'
import { FileSpreadsheet, Upload, Download, X, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import api from '../api.js'
import styles from './Batch.module.css'

const REQUIRED_HEADERS = [
  'amount', 'hour_of_day', 'day_of_week',
  'v1', 'v2', 'v3', 'v4', 'v7', 'v9', 'v10',
  'v11', 'v12', 'v14', 'v16', 'v17', 'v18', 'v19', 'v20',
]

const TEMPLATE_ROWS = [
  [124.50, 14, 2, -1.36, 1.19, -0.47, 0.42, 0.24, -0.07, -0.33, 1.12, -0.18, -0.82, -0.09, 0.12, 0.22, -0.04, 0.18],
  [9999.00, 2, 5, -3.04, 2.87, -3.31, -2.59, 2.06, -3.05, 2.41, -4.80, 3.50, -5.79, 2.21, -4.09, 3.43, -1.74, 0.44],
  [22.30, 10, 1, 1.20, 0.26, 0.98, 1.40, -0.10, 0.31, -0.18, 0.64, -0.29, 0.07, 0.05, -0.03, 0.12, 0.09, -0.11],
]

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h))
  if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`)
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim())
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = vals[idx] })
    rows.push(obj)
  }
  return { headers, rows }
}

function downloadTemplate() {
  const header = REQUIRED_HEADERS.join(',')
  const dataRows = TEMPLATE_ROWS.map(r => r.join(',')).join('\n')
  const csv = `${header}\n${dataRows}`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fraudnet_batch_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function exportResults(results) {
  const header = ['row', 'verdict', 'risk_score', 'confidence', 'model_used', 'top_factor', 'time_ms'].join(',')
  const dataRows = results.map(r =>
    [
      r.rowNum,
      r.verdict,
      r.risk_score,
      (r.confidence * 100).toFixed(1),
      r.model_used,
      `"${(r.top_risk_factors?.[0] ?? '').replace(/"/g, '""')}"`,
      r.timeTaken,
    ].join(',')
  )
  const csv = [header, ...dataRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fraudnet_batch_results.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function getRiskColor(score) {
  if (score > 65) return 'var(--red)'
  if (score > 35) return 'var(--yellow)'
  return 'var(--green)'
}

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

export default function Batch() {
  const [phase, setPhase] = useState('idle') // idle | ready | scanning | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [fileName, setFileName] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentRow, setCurrentRow] = useState(0)
  const [results, setResults] = useState([])
  const [sortDir, setSortDir] = useState('desc')
  const [etaMs, setEtaMs] = useState(null)
  const cancelRef = useRef(false)
  const fileInputRef = useRef(null)

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
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [])

  const onDragOver = useCallback(e => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => setDragOver(false), [])

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
        const payload = Object.fromEntries(
          REQUIRED_HEADERS.map(h => [h, parseFloat(rows[i][h])])
        )
        const { data } = await api.post('/predict', payload)
        const timeTaken = Math.round(performance.now() - t0)
        timings.push(timeTaken)
        accumulated.push({ ...data, rowNum: i + 1, timeTaken })
      } catch {
        const timeTaken = Math.round(performance.now() - t0)
        timings.push(timeTaken)
        accumulated.push({
          rowNum: i + 1,
          verdict: 'ERROR',
          risk_score: 0,
          confidence: 0,
          model_used: '—',
          top_risk_factors: [],
          shap_explanation: [],
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
  }

  function cancelScan() {
    cancelRef.current = true
  }

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

  const sortedResults = [...results].sort((a, b) =>
    sortDir === 'desc' ? b.risk_score - a.risk_score : a.risk_score - b.risk_score
  )

  const summary = results.length > 0 ? {
    total: results.length,
    fraud: results.filter(r => r.verdict === 'FRAUD').length,
    legit: results.filter(r => r.verdict === 'LEGITIMATE').length,
    avgRisk: (results.reduce((s, r) => s + r.risk_score, 0) / results.length).toFixed(1),
    highestRisk: Math.max(...results.map(r => r.risk_score)),
  } : null

  const fmtEta = ms => {
    if (ms == null || ms <= 0) return '—'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <FileSpreadsheet size={20} color="var(--green)" />
          </div>
          <div>
            <h1 className={styles.title}>Batch Scanner</h1>
            <p className={styles.subtitle}>Upload a CSV to scan multiple transactions at once</p>
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

      {/* Drop zone */}
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
              {dragOver ? 'Drop your CSV here' : 'Drag & drop a CSV file'}
            </div>
            <div className={styles.dropSub}>or click to browse — must contain all 18 required columns</div>
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

      {/* File ready preview */}
      {(phase === 'ready') && parsedData && (
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <div className={styles.previewMeta}>
              <FileSpreadsheet size={15} color="var(--green)" />
              <span className={styles.previewFileName}>{fileName}</span>
              <span className={styles.previewCount}>{parsedData.rows.length} rows</span>
            </div>
            <button className={styles.scanBtn} onClick={startScan}>
              <FileSpreadsheet size={14} />
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
                    {parsedData.headers.map(h => <td key={h}>{row[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scanning progress */}
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
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={styles.progressPct}>{progress}% complete</div>
        </div>
      )}

      {/* Done — summary + results */}
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
            <button className={styles.exportBtn} onClick={() => exportResults(results)}>
              <Download size={13} />
              Export Results CSV
            </button>
          </div>

          <div className={styles.resultsTableWrap}>
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Verdict</th>
                  <th
                    className={styles.sortableHeader}
                    onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  >
                    Risk Score
                    {sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  </th>
                  <th>Confidence</th>
                  <th>Top Factor</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map(r => {
                  const isFraud = r.verdict === 'FRAUD'
                  return (
                    <tr
                      key={r.rowNum}
                      className={isFraud ? styles.fraudRow : ''}
                    >
                      <td className={styles.monoCell}>{r.rowNum}</td>
                      <td>
                        <span className={`${styles.verdictBadge} ${isFraud ? styles.fraudBadge : styles.legitBadge}`}>
                          {r.verdict}
                        </span>
                      </td>
                      <td>
                        <MiniBar value={r.risk_score} />
                      </td>
                      <td className={styles.monoCell}>{(r.confidence * 100).toFixed(1)}%</td>
                      <td className={styles.factorCell}>{r.top_risk_factors?.[0] ?? '—'}</td>
                      <td className={styles.monoCell}>{r.timeTaken}ms</td>
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
