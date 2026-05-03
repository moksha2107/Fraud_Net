/* ═══════════════════════════════════════════════════════════════
   Diagrams.jsx — System Architecture & Data Flow Diagrams
   Clean use-case-style inline SVG diagrams. Five tabs.
═══════════════════════════════════════════════════════════════ */
import { useState, useRef } from 'react'
import styles from './Diagrams.module.css'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

/* ── Palette ── */
const BG     = '#1a1728'
const OUTER  = '#1e1b30'
const OSTK   = '#4a4870'
const BAND   = '#221f38'
const ACTF   = '#141228'
const ACTS   = '#8888bb'
const PROC   = '#7a1d8a'
const PROCS  = '#b040b0'
const PROCG  = '#1a4a1a'
const PROCGS = '#30aa60'
const PROCB  = '#1a2a4a'
const PROCBS = '#3070c0'
const PROCA  = '#3a1a00'
const PROCAS = '#c07020'
const LN     = '#4a4898'
const LBL    = '#9090c0'
const TXT    = '#e8e6ff'
const TDIM   = '#8888aa'

/* ── Performance chart data ── */
const PERF_DATA = [
  { model: 'XGBoost',  precision: 81.97, recall: 85.71, f1: 83.80, prauc: 82.21, rocauc: 97.01, cost: 6105 },
  { model: 'LightGBM', precision: 80.88, recall: 86.73, f1: 83.70, prauc: 83.34, rocauc: 97.12, cost: 6735 },
  { model: 'CatBoost', precision: 83.54, recall: 85.71, f1: 84.61, prauc: 82.67, rocauc: 96.98, cost: 5920 },
  { model: 'Stacking', precision: 85.34, recall: 88.78, f1: 87.03, prauc: 84.99, rocauc: 97.60, cost: 5710 },
]

const SHAP_DATA = [
  { feature: 'V14',    importance: 0.312 },
  { feature: 'V4',     importance: 0.287 },
  { feature: 'V12',    importance: 0.241 },
  { feature: 'V17',    importance: 0.198 },
  { feature: 'V10',    importance: 0.176 },
  { feature: 'V3',     importance: 0.154 },
  { feature: 'V7',     importance: 0.131 },
  { feature: 'Amount', importance: 0.118 },
  { feature: 'V11',    importance: 0.097 },
  { feature: 'V16',    importance: 0.082 },
]

const COST_DATA = PERF_DATA.map(d => ({ model: d.model, cost: d.cost }))

const CHART_TOOLTIP = {
  background: '#0a0f1a',
  border: '1px solid #1e2a3a',
  borderRadius: '8px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: '#e2eaf6',
}

/* ── Shared arrowhead defs ── */
function AD({ id }) {
  const mk = (sfx, fill) => (
    <marker key={sfx} id={`${id}${sfx}`} markerWidth="8" markerHeight="6"
      refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill={fill} />
    </marker>
  )
  return (
    <defs>
      {mk('',  LN)}
      {mk('g', '#30aa60')}
      {mk('c', '#3070c0')}
      {mk('a', '#c07020')}
      {mk('p', PROCS)}
      {mk('w', '#8888bb')}
    </defs>
  )
}

/* ── Actor: rounded rect ── */
function ActBox({ cx, y = 42, w = 148, h = 36, label }) {
  return (
    <g>
      <rect x={cx - w / 2} y={y} width={w} height={h} rx="7"
        fill={ACTF} stroke={ACTS} strokeWidth="1.5" />
      <text x={cx} y={y + h / 2 + 5} textAnchor="middle"
        fill={TXT} fontSize="12" fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif">
        {label}
      </text>
    </g>
  )
}

/* ── Process oval (use-case ellipse) ── */
function Oval({ cx, cy, rx = 104, ry = 28, label, sub,
                fill = PROC, stroke = PROCS }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx + 6} ry={ry + 6}
        fill={`${fill}33`} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
        fill={fill} stroke={stroke} strokeWidth="1.5" />
      <ellipse cx={cx} cy={cy - ry * 0.32} rx={rx * 0.68} ry={ry * 0.28}
        fill="rgba(255,200,255,0.06)" />
      <text x={cx} y={sub ? cy + 2 : cy + 5} textAnchor="middle"
        fill={TXT} fontSize="11" fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif">
        {label}
      </text>
      {sub && (
        <text x={cx} y={cy + 17} textAnchor="middle"
          fill={TDIM} fontSize="9"
          fontFamily="Inter, system-ui, sans-serif">
          {sub}
        </text>
      )}
    </g>
  )
}

/* ── Small module pill (for architecture tier 1) ── */
function Pill({ cx, cy, w = 88, h = 28, label, fill, stroke }) {
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx="6"
        fill={fill} stroke={stroke} strokeWidth="1.2" />
      <text x={cx} y={cy + 5} textAnchor="middle"
        fill={TXT} fontSize="9.5" fontWeight="500"
        fontFamily="Inter, system-ui, sans-serif">
        {label}
      </text>
    </g>
  )
}

/* ════════════════════════════════════════════
   DIAGRAM 1 — Use Case Diagram
════════════════════════════════════════════ */
const UC_COLS = [
  { cx: 148, label: 'User',    acts: ['Login', 'History', 'Stats'] },
  { cx: 404, label: 'Analyst', acts: ['Predict', 'Batch', 'Analyze'] },
  { cx: 660, label: 'Admin',   acts: ['Users', 'Monitor', 'Compare'] },
  { cx: 940, label: 'System',  acts: ['Score', 'Explain', 'Notify'] },
]
const UC_ROWS = [
  [
    { label: 'Authenticate',      sub: 'Login / JWT'   },
    { label: 'Submit Transaction', sub: '/predict'      },
    { label: 'Manage Users',      sub: '/auth/me'       },
    { label: 'ML Engine',         sub: 'XGB+LGB+CAT'   },
  ],
  [
    { label: 'View History',      sub: 'Predictions'   },
    { label: 'Batch Scanner',     sub: 'CSV Upload'     },
    { label: 'Monitor Risk',      sub: 'Alert Thresh.'  },
    { label: 'SHAP Explainer',    sub: 'TreeExplainer'  },
  ],
  [
    { label: 'Dashboard',         sub: 'Stats & Charts' },
    { label: 'Analyze',           sub: 'Friendly UI'    },
    { label: 'Compare',           sub: 'SHAP Delta'     },
    { label: 'Email Notifier',    sub: '/notify'        },
  ],
]
const UC_ROW_CY  = [260, 358, 458]
const UC_LBL_Y   = [174, 306, 406]

function UseCaseSVG() {
  return (
    <svg viewBox="0 0 1100 510" width="100%" height="auto"
      preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}
      aria-label="System Use Case Diagram">
      <AD id="uc" />

      {/* Canvas */}
      <rect width="1100" height="510" fill={BG} rx="12" />

      {/* Outer dashed box */}
      <rect x="10" y="10" width="1080" height="490" rx="12"
        fill={OUTER} stroke={OSTK} strokeWidth="1.5" strokeDasharray="8,4" />

      {/* "User Roles" chip */}
      <rect x="445" y="3" width="210" height="22" rx="5" fill={BG} />
      <text x="550" y="18" textAnchor="middle" fill={TXT}
        fontSize="13" fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif">User Roles</text>

      {/* Actor band */}
      <rect x="18" y="27" width="1064" height="64" rx="8" fill={BAND} />

      {/* Actor boxes */}
      {UC_COLS.map(col => (
        <ActBox key={col.label} cx={col.cx} y={40} w={148} h={36} label={col.label} />
      ))}

      {/* System boundary */}
      <rect x="18" y="130" width="1064" height="370" rx="10"
        fill="#181630" stroke={OSTK} strokeWidth="1.5" strokeDasharray="6,3" />
      <rect x="415" y="123" width="270" height="20" rx="4" fill={BG} />
      <text x="550" y="137" textAnchor="middle" fill={TDIM}
        fontSize="11" fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif">Fraud Detection System</text>

      {/* Trunk lines + action labels */}
      {UC_COLS.map((col, ci) => (
        <g key={col.label}>
          <line x1={col.cx} y1={76} x2={col.cx} y2={492}
            stroke={LN} strokeWidth="1.2" strokeDasharray="3,2" />
          {col.acts.map((act, ai) => (
            <text key={act} x={col.cx + 10} y={UC_LBL_Y[ai]}
              fill={LBL} fontSize="9"
              fontFamily="Inter, system-ui, sans-serif">{act}</text>
          ))}
        </g>
      ))}

      {/* Process ovals */}
      {UC_ROWS.map((row, ri) =>
        row.map((uc, ci) => (
          <Oval key={`${ri}-${ci}`}
            cx={UC_COLS[ci].cx} cy={UC_ROW_CY[ri]}
            label={uc.label} sub={uc.sub} />
        ))
      )}
    </svg>
  )
}

/* ════════════════════════════════════════════
   DIAGRAM 2 — System Architecture (3-Tier)
════════════════════════════════════════════ */
function SystemArchSVG() {
  const VW = 1100

  /* ── Tier 1 — page pills ── */
  const FE_PAGES = ['Dashboard','Predict','Analyze','Batch','Compare','Monitor','History','Diagrams']
  const PILL_W = 102, PILL_H = 34, PILL_GAP = 8
  const PILL_TOTAL = FE_PAGES.length * PILL_W + (FE_PAGES.length - 1) * PILL_GAP
  const PILL_X0 = (VW - PILL_TOTAL) / 2   // 114

  /* ── Tier 2 — endpoints ── */
  const ENDPOINTS = [
    { label: '/auth',    sub: 'JWT + OTP'   },
    { label: '/predict', sub: 'Ensemble ML'  },
    { label: '/history', sub: 'Predictions'  },
    { label: '/stats',   sub: 'Dashboard'    },
    { label: '/models',  sub: 'Metrics'      },
    { label: '/notify',  sub: 'Email'        },
  ]
  const EP_RX = 74, EP_RY = 28, EP_GAP = 12
  const EP_TOTAL = ENDPOINTS.length * (EP_RX * 2) + (ENDPOINTS.length - 1) * EP_GAP // 948
  const EP_CX0  = (VW - EP_TOTAL) / 2 + EP_RX   // 150

  /* ── Tier 2 — ML engine pills ── */
  const ML_MODELS = ['XGBoost', 'LightGBM', 'CatBoost', 'Stacking + SHAP']
  const ML_W = 118, ML_H = 28, ML_GAP = 16
  const ML_TOTAL = ML_MODELS.length * ML_W + (ML_MODELS.length - 1) * ML_GAP  // 520
  const ML_X0 = (VW - ML_TOTAL) / 2  // 290

  /* ── Tier 3 — data stores ── */
  const DATASTORES = [
    { label: 'SQLite DB',       sub: 'users · predictions'        },
    { label: 'creditcard.csv',  sub: '284,807 transactions'       },
    { label: 'Model Artefacts', sub: 'xgb · lgb · cat · stacker' },
  ]
  const ST_RX = 140, ST_RY = 33, ST_GAP = 24
  const ST_TOTAL = DATASTORES.length * (ST_RX * 2) + (DATASTORES.length - 1) * ST_GAP  // 888
  const ST_CX0  = (VW - ST_TOTAL) / 2 + ST_RX  // 246

  /* ── Vertical layout ── */
  const T1_Y = 28,  T1_H = 106   // y=28→134
  const A1_Y1 = 136, A1_Y2 = 162  // REST/JSON arrow
  const T2_Y = 170, T2_H = 188   // y=170→358
  const A2_Y1 = 360, A2_Y2 = 386  // SQL arrow
  const T3_Y = 394, T3_H = 112   // y=394→506
  const LEG_Y = 518
  const TOTAL_H = 548

  /* helper y centres */
  const PILL_CY = T1_Y + 32 + PILL_H / 2    // 77
  const EP_CY   = T2_Y + 66                  // 236
  const ML_CY   = T2_Y + T2_H - 42          // 316 → pill top = 316-14=302
  const ST_CY   = T3_Y + 56                  // 450

  return (
    <svg viewBox={`0 0 ${VW} ${TOTAL_H}`} width="100%" height="auto"
      preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}
      aria-label="3-Tier System Architecture">
      <AD id="sa" />

      {/* Canvas */}
      <rect width={VW} height={TOTAL_H} fill={BG} rx="12" />
      <rect x="10" y="10" width={VW - 20} height={TOTAL_H - 20} rx="12"
        fill={OUTER} stroke={OSTK} strokeWidth="1.5" strokeDasharray="8,4" />

      {/* Title chip */}
      <rect x="360" y="3" width="380" height="22" rx="5" fill={BG} />
      <text x={VW / 2} y="18" textAnchor="middle" fill={TXT}
        fontSize="13" fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif">3-Tier System Architecture</text>

      {/* ══ TIER 1 ══ */}
      <rect x="18" y={T1_Y} width={VW - 36} height={T1_H} rx="8" fill="#1b2818" />
      <text x="30" y={T1_Y + 18} fill="#30aa60" fontSize="10" fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif">
        TIER 1 — Frontend (React 18 + Vite · SPA)
      </text>

      {/* Page pills — all evenly spread, no overlap */}
      {FE_PAGES.map((page, i) => {
        const px = PILL_X0 + i * (PILL_W + PILL_GAP)
        return (
          <g key={page}>
            <rect x={px} y={PILL_CY - PILL_H / 2} width={PILL_W} height={PILL_H} rx="6"
              fill="#0f2010" stroke="#30aa60" strokeWidth="1.2" />
            <text x={px + PILL_W / 2} y={PILL_CY + 5} textAnchor="middle"
              fill={TXT} fontSize="10" fontWeight="500"
              fontFamily="Inter, system-ui, sans-serif">{page}</text>
          </g>
        )
      })}

      {/* T1 → T2 arrow */}
      <line x1={VW / 2} y1={A1_Y1} x2={VW / 2} y2={A1_Y2}
        stroke="#30aa60" strokeWidth="2" markerEnd="url(#sag)" />
      <rect x={VW / 2 - 82} y={A1_Y1 + 4} width="164" height="14" rx="3" fill={BG} />
      <text x={VW / 2} y={A1_Y1 + 14} textAnchor="middle" fill="#30aa60"
        fontSize="9" fontFamily="Inter, system-ui, sans-serif">REST / JSON (HTTP)</text>

      {/* ══ TIER 2 ══ */}
      <rect x="18" y={T2_Y} width={VW - 36} height={T2_H} rx="8" fill="#181c2a" />
      <text x="30" y={T2_Y + 18} fill="#5090e0" fontSize="10" fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif">
        TIER 2 — Backend (FastAPI + Uvicorn)
      </text>

      {/* API endpoint ovals — 6 evenly spaced */}
      {ENDPOINTS.map((ep, i) => (
        <Oval key={ep.label}
          cx={EP_CX0 + i * (EP_RX * 2 + EP_GAP)} cy={EP_CY}
          rx={EP_RX} ry={EP_RY}
          label={ep.label} sub={ep.sub}
          fill={PROCB} stroke={PROCBS} />
      ))}

      {/* ML Engine sub-row */}
      <rect x="22" y={ML_CY - ML_H / 2 - 4} width={VW - 44} height={ML_H + 8} rx="5"
        fill="#0f1520" stroke="#334455" strokeWidth="1" />
      <text x="36" y={ML_CY + 5} fill={TDIM} fontSize="9" fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif">ML Engine:</text>
      {ML_MODELS.map((m, i) => (
        <g key={m}>
          <rect x={ML_X0 + i * (ML_W + ML_GAP)} y={ML_CY - ML_H / 2}
            width={ML_W} height={ML_H} rx="4"
            fill="#0a1a0a" stroke={PROCGS}
            strokeWidth={i === ML_MODELS.length - 1 ? 1.6 : 1} />
          <text x={ML_X0 + i * (ML_W + ML_GAP) + ML_W / 2} y={ML_CY + 5}
            textAnchor="middle" fill="#30aa60" fontSize="9.5" fontWeight="600"
            fontFamily="Inter, system-ui, sans-serif">{m}</text>
          {/* Arrow between boxes */}
          {i < ML_MODELS.length - 1 && (
            <text x={ML_X0 + i * (ML_W + ML_GAP) + ML_W + ML_GAP / 2} y={ML_CY + 5}
              textAnchor="middle" fill={TDIM} fontSize="12"
              fontFamily="Inter, system-ui, sans-serif">→</text>
          )}
        </g>
      ))}

      {/* T2 → T3 arrow */}
      <line x1={VW / 2} y1={A2_Y1} x2={VW / 2} y2={A2_Y2}
        stroke={PROCAS} strokeWidth="2" markerEnd="url(#saa)" />
      <rect x={VW / 2 - 70} y={A2_Y1 + 4} width="140" height="14" rx="3" fill={BG} />
      <text x={VW / 2} y={A2_Y1 + 14} textAnchor="middle" fill={PROCAS}
        fontSize="9" fontFamily="Inter, system-ui, sans-serif">SQL / file I/O</text>

      {/* ══ TIER 3 ══ */}
      <rect x="18" y={T3_Y} width={VW - 36} height={T3_H} rx="8" fill="#201808" />
      <text x="30" y={T3_Y + 18} fill={PROCAS} fontSize="10" fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif">TIER 3 — Data Layer</text>

      {DATASTORES.map((s, i) => (
        <Oval key={s.label}
          cx={ST_CX0 + i * (ST_RX * 2 + ST_GAP)} cy={ST_CY}
          rx={ST_RX} ry={ST_RY}
          label={s.label} sub={s.sub}
          fill={PROCA} stroke={PROCAS} />
      ))}

      {/* Legend */}
      <line x1="18" y1={LEG_Y} x2={VW - 18} y2={LEG_Y}
        stroke={OSTK} strokeWidth="0.8" />
      <text x="28" y={LEG_Y + 14} fill={TDIM} fontSize="9" fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif">Legend:</text>
      {[
        { fill: PROCG, stroke: PROCGS, label: 'Frontend (React)' },
        { fill: PROCB, stroke: PROCBS, label: 'Backend API'       },
        { fill: PROCA, stroke: PROCAS, label: 'Data Layer'        },
      ].map((l, i) => (
        <g key={l.label}>
          <rect x={92 + i * 160} y={LEG_Y + 5} width="10" height="10" rx="2"
            fill={l.fill} stroke={l.stroke} strokeWidth="1" />
          <text x={106 + i * 160} y={LEG_Y + 14} fill={TDIM} fontSize="9"
            fontFamily="Inter, system-ui, sans-serif">{l.label}</text>
        </g>
      ))}
    </svg>
  )
}

/* ════════════════════════════════════════════
   DIAGRAM 3 — DFD Level 1 (clean, no crossing arrows)
════════════════════════════════════════════ */
function DFDLevel1SVG() {
  /* Process oval helper (inline — rx=100, ry=30) */
  function DfdOval({ cx, cy, num, label, sub, fill, stroke }) {
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={106} ry={36} fill={`${fill}33`} />
        <ellipse cx={cx} cy={cy} rx={100} ry={30} fill={fill} stroke={stroke} strokeWidth="1.5" />
        <ellipse cx={cx} cy={cy - 9} rx={68} ry={10} fill="rgba(255,255,255,0.05)" />
        <text x={cx} y={cy + 2} textAnchor="middle" fill={TXT} fontSize="11" fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif">{label}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill={TDIM} fontSize="9"
          fontFamily="Inter, system-ui, sans-serif">{sub}</text>
        <circle cx={cx - 84} cy={cy - 22} r="11" fill={stroke} />
        <text x={cx - 84} y={cy - 18} textAnchor="middle" fill="#000" fontSize="9" fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif">{num}</text>
      </g>
    )
  }

  /* Data store helper */
  function DfdStore({ x, y, w, label }) {
    return (
      <g>
        <line x1={x} y1={y} x2={x + w} y2={y} stroke={PROCAS} strokeWidth="1.8" />
        <rect x={x} y={y} width={w} height={30} fill="#201808" stroke="none" />
        <line x1={x} y1={y + 30} x2={x + w} y2={y + 30} stroke={PROCAS} strokeWidth="1.8" />
        <line x1={x + 28} y1={y} x2={x + 28} y2={y + 30} stroke={PROCAS} strokeWidth="1.4" />
        <text x={x + w / 2 + 14} y={y + 20} textAnchor="middle" fill={TXT} fontSize="9.5"
          fontFamily="Inter, system-ui, sans-serif">{label}</text>
      </g>
    )
  }

  /* External entity box helper */
  function DfdEntity({ x, y, w, h, label, sub }) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx="7" fill={ACTF} stroke={ACTS} strokeWidth="1.5" />
        <text x={x + w / 2} y={y + h / 2 + (sub ? -3 : 5)} textAnchor="middle" fill={TXT}
          fontSize="11" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">{label}</text>
        {sub && (
          <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" fill={TDIM}
            fontSize="8" fontFamily="Inter, system-ui, sans-serif">{sub}</text>
        )}
      </g>
    )
  }

  const SH = '#b040b0'  /* SHAP stroke colour — same value as module-level PROCS */

  return (
    <svg viewBox="0 0 1100 510" width="100%" height="auto"
      preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}
      aria-label="DFD Level 1 — Internal Processes">
      <AD id="d1" />

      {/* Canvas */}
      <rect width="1100" height="510" fill={BG} rx="12" />
      <rect x="10" y="10" width="1080" height="490" rx="12"
        fill={OUTER} stroke={OSTK} strokeWidth="1.5" strokeDasharray="8,4" />

      {/* Title */}
      <rect x="340" y="3" width="420" height="22" rx="5" fill={BG} />
      <text x="550" y="18" textAnchor="middle" fill={TXT}
        fontSize="13" fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif">Data Flow Diagram — Level 1</text>

      {/* ── External entities ── */}
      {/* Left Analyst (sends) */}
      <DfdEntity x={22} y={56} w={90} h={34} label="Analyst" sub="(sends)" />
      {/* Right Analyst (receives) */}
      <DfdEntity x={988} y={56} w={90} h={34} label="Analyst" sub="(receives)" />
      {/* Email Server */}
      <DfdEntity x={988} y={318} w={90} h={34} label="Email Svr" />

      {/* ── Process ovals ── */}
      <DfdOval cx={220} cy={200} num="1.0" label="Authentication" sub="Validate → JWT"
        fill={PROCB} stroke={PROCBS} />
      <DfdOval cx={440} cy={200} num="2.0" label="Feature Eng." sub="18 ML features"
        fill={PROCG} stroke={PROCGS} />
      <DfdOval cx={660} cy={200} num="3.0" label="Ensemble Pred." sub="XGB+LGB+CAT→Stack"
        fill={PROCG} stroke={PROCGS} />
      <DfdOval cx={880} cy={200} num="4.0" label="SHAP Explain." sub="TreeExplainer"
        fill={PROC} stroke={SH} />
      <DfdOval cx={640} cy={355} num="5.0" label="Persistence" sub="DB + Notify"
        fill={PROCA} stroke={PROCAS} />

      {/* ── Data stores ── */}
      {/* D1 Users DB — below 1.0 (cx=220) */}
      <DfdStore x={120} y={446} w={180} label="D1 — Users DB" />
      {/* D3 creditcard.csv — below 2.0 (cx=440) */}
      <DfdStore x={350} y={446} w={190} label="D3 — creditcard.csv" />
      {/* D2 Predictions DB — below 5.0 (cx=640) */}
      <DfdStore x={548} y={446} w={196} label="D2 — Predictions DB" />

      {/* ══ Arrows ══ */}

      {/* 1. Left Analyst right-edge → 1.0: credentials */}
      <line x1="112" y1="73" x2="208" y2="174"
        stroke={PROCBS} strokeWidth="1.5" markerEnd="url(#d1c)" />
      <text x="124" y="128" fill={TDIM} fontSize="8.5"
        fontFamily="Inter, system-ui, sans-serif">credentials</text>

      {/* 2. 1.0 right-edge → 2.0 left-edge: authenticated request */}
      <line x1="320" y1="200" x2="340" y2="200"
        stroke={PROCBS} strokeWidth="1.5" markerEnd="url(#d1c)" />
      <text x="322" y="193" fill={TDIM} fontSize="8"
        fontFamily="Inter, system-ui, sans-serif">auth. request</text>

      {/* 3. JWT return — routed path from 1.0 left-bottom back up to Left Analyst */}
      <path d="M 198 228 L 56 228 L 56 90"
        fill="none" stroke={PROCGS} strokeWidth="1.5" markerEnd="url(#d1g)" />
      <text x="62" y="196" fill={TDIM} fontSize="8.5"
        fontFamily="Inter, system-ui, sans-serif">JWT token</text>

      {/* 4. 1.0 bottom → D1 top: read/write users (dashed) */}
      <line x1="210" y1="230" x2="210" y2="446"
        stroke={LN} strokeWidth="1.2" strokeDasharray="4,2" markerEnd="url(#d1)" />
      <text x="215" y="344" fill={LBL} fontSize="8"
        fontFamily="Inter, system-ui, sans-serif">read/write users</text>

      {/* 5. 2.0 right → 3.0 left: 18 features */}
      <line x1="540" y1="200" x2="560" y2="200"
        stroke={PROCGS} strokeWidth="1.5" markerEnd="url(#d1g)" />
      <text x="541" y="193" fill={TDIM} fontSize="8.5"
        fontFamily="Inter, system-ui, sans-serif">18 features</text>

      {/* 6. 2.0 bottom → D3 top: load scaler (near-vertical, dashed) */}
      <line x1="445" y1="230" x2="448" y2="446"
        stroke={LN} strokeWidth="1.2" strokeDasharray="4,2" markerEnd="url(#d1)" />
      <text x="451" y="344" fill={LBL} fontSize="8"
        fontFamily="Inter, system-ui, sans-serif">load scaler</text>

      {/* 7. 3.0 right → 4.0 left: raw scores */}
      <line x1="760" y1="200" x2="780" y2="200"
        stroke={PROCGS} strokeWidth="1.5" markerEnd="url(#d1g)" />
      <text x="754" y="193" fill={TDIM} fontSize="8.5"
        fontFamily="Inter, system-ui, sans-serif">raw scores</text>

      {/* 8. 3.0 bottom → 5.0 top-left: verdict (diagonal) */}
      <line x1="638" y1="228" x2="606" y2="327"
        stroke={PROCGS} strokeWidth="1.5" markerEnd="url(#d1g)" />
      <text x="598" y="282" fill={TDIM} fontSize="8"
        fontFamily="Inter, system-ui, sans-serif">verdict</text>

      {/* 9. 4.0 bottom-left → 5.0 top-right: SHAP vals (diagonal) */}
      <line x1="822" y1="222" x2="700" y2="328"
        stroke={SH} strokeWidth="1.5" markerEnd="url(#d1p)" />
      <text x="760" y="272" fill={TDIM} fontSize="8"
        fontFamily="Inter, system-ui, sans-serif">SHAP vals</text>

      {/* 10. 5.0 bottom → D2 top: write prediction (vertical) */}
      <line x1="646" y1="385" x2="648" y2="446"
        stroke={PROCAS} strokeWidth="1.5" markerEnd="url(#d1a)" />
      <text x="652" y="420" fill={TDIM} fontSize="8"
        fontFamily="Inter, system-ui, sans-serif">write prediction</text>

      {/* 11. 5.0 right-edge → Email left-edge: scan notification (dashed diagonal) */}
      <line x1="740" y1="355" x2="988" y2="335"
        stroke={PROCAS} strokeWidth="1.5" strokeDasharray="4,2" markerEnd="url(#d1a)" />
      <text x="828" y="340" fill={TDIM} fontSize="8.5"
        fontFamily="Inter, system-ui, sans-serif">scan notification</text>

      {/* 12. 4.0 top-right → Right Analyst bottom-left: fraud verdict + SHAP */}
      <line x1="950" y1="176" x2="1010" y2="90"
        stroke={SH} strokeWidth="1.5" markerEnd="url(#d1p)" />
      <text x="944" y="138" fill={TDIM} fontSize="8"
        fontFamily="Inter, system-ui, sans-serif">fraud verdict + SHAP</text>

      {/* ── Legend ── */}
      <line x1="18" y1="490" x2="1082" y2="490"
        stroke={OSTK} strokeWidth="0.8" />
      {[
        { fill: PROCB, stroke: PROCBS,  label: 'Auth process'     },
        { fill: PROCG, stroke: PROCGS,  label: 'ML process'       },
        { fill: PROC,  stroke: SH,      label: 'Explain process'  },
        { fill: PROCA, stroke: PROCAS,  label: 'Persist / notify' },
      ].map((l, i) => (
        <g key={l.label}>
          <rect x={28 + i * 260} y="496" width="10" height="10" rx="2"
            fill={l.fill} stroke={l.stroke} strokeWidth="1" />
          <text x={42 + i * 260} y="505" fill={TDIM} fontSize="9"
            fontFamily="Inter, system-ui, sans-serif">{l.label}</text>
        </g>
      ))}
    </svg>
  )
}

/* ════════════════════════════════════════════
   DIAGRAM 4 — ML Pipeline
════════════════════════════════════════════ */
const STAGES = [
  { label: 'Raw CSV',      sub: '284,807 txns',      fill: PROCA, stroke: PROCAS },
  { label: 'Feature Eng.', sub: '18 features',        fill: PROCB, stroke: PROCBS },
  { label: 'SMOTEENN',    sub: 'Balanced dataset',   fill: PROC,  stroke: PROCS  },
  { label: 'Train/Test',  sub: '80 / 20 split',      fill: PROCB, stroke: PROCBS },
  { label: 'XGBoost',     sub: 'Base learner 1',     fill: PROCG, stroke: PROCGS },
  { label: 'LightGBM',    sub: 'Base learner 2',     fill: PROCG, stroke: PROCGS },
  { label: 'CatBoost',    sub: 'Base learner 3',     fill: PROCG, stroke: PROCGS },
  { label: 'Stacking',    sub: 'LR meta-learner',    fill: PROCG, stroke: PROCGS },
  { label: 'SHAP',        sub: 'TreeExplainer',      fill: PROC,  stroke: PROCS  },
  { label: 'REST API',    sub: '/predict (FastAPI)',  fill: PROCA, stroke: PROCAS },
]
const METRICS = [
  { label: 'PR-AUC', val: '0.8499' },
  { label: 'Recall', val: '88.78%' },
  { label: 'Precis.', val: '85.34%' },
  { label: 'F1',    val: '0.8703'  },
  { label: 'ROC-AUC', val: '0.9760' },
  { label: 'Cost ($)', val: '5,710' },
]

function MLPipelineSVG() {
  /* Two rows of 5 boxes each */
  const ROW1 = STAGES.slice(0, 5)
  const ROW2 = STAGES.slice(5)
  const BOX_W = 172
  const BOX_H = 68
  const GAP   = 14
  const ROW1_Y = 130
  const ROW2_Y = 290

  const r1Start = 18
  const r2Start = 18 + (5 - ROW2.length) * (BOX_W + GAP) / 2

  return (
    <svg viewBox="0 0 900 510" width="100%" height="auto"
      preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}
      aria-label="ML Training and Inference Pipeline">
      <AD id="ml" />

      <rect width="900" height="510" fill={BG} rx="12" />
      <rect x="10" y="10" width="880" height="490" rx="12"
        fill={OUTER} stroke={OSTK} strokeWidth="1.5" strokeDasharray="8,4" />
      <rect x="280" y="3" width="340" height="22" rx="5" fill={BG} />
      <text x="450" y="18" textAnchor="middle" fill={TXT}
        fontSize="13" fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif">ML Training &amp; Inference Pipeline</text>

      {/* Row 1 */}
      {ROW1.map((s, i) => {
        const x = r1Start + i * (BOX_W + GAP)
        const cx = x + BOX_W / 2
        return (
          <g key={s.label}>
            {/* Glow */}
            <rect x={x - 3} y={ROW1_Y - 3} width={BOX_W + 6} height={BOX_H + 6}
              rx="12" fill={`${s.stroke}22`} />
            {/* Box */}
            <rect x={x} y={ROW1_Y} width={BOX_W} height={BOX_H}
              rx="10" fill={s.fill} stroke={s.stroke} strokeWidth="1.6" />
            {/* Step number circle */}
            <circle cx={x + 18} cy={ROW1_Y + 16} r="11" fill={s.stroke} />
            <text x={x + 18} y={ROW1_Y + 20} textAnchor="middle"
              fill="#000" fontSize="9" fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif">{i + 1}</text>
            {/* Label */}
            <text x={cx} y={ROW1_Y + 35} textAnchor="middle"
              fill={TXT} fontSize="12" fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif">{s.label}</text>
            <text x={cx} y={ROW1_Y + 52} textAnchor="middle"
              fill={TDIM} fontSize="9"
              fontFamily="Inter, system-ui, sans-serif">{s.sub}</text>
            {/* Arrow to next */}
            {i < ROW1.length - 1 && (
              <line
                x1={x + BOX_W + 2} y1={ROW1_Y + BOX_H / 2}
                x2={x + BOX_W + GAP - 2} y2={ROW1_Y + BOX_H / 2}
                stroke={s.stroke} strokeWidth="1.8"
                markerEnd={`url(#ml${s.stroke === PROCGS ? 'g' : s.stroke === PROCBS ? 'c' : s.stroke === PROCS ? 'p' : 'a'})`}
              />
            )}
          </g>
        )
      })}

      {/* Down arrow from row1 end to row2 start */}
      <line x1={r1Start + 4 * (BOX_W + GAP) + BOX_W / 2}
            y1={ROW1_Y + BOX_H + 2}
            x1_unused=""
            x2={r2Start + (ROW2.length - 1) * (BOX_W + GAP) + BOX_W / 2 + (ROW2.length < 5 ? 0 : 0)}
            y2={ROW2_Y - 2}
            stroke={PROCGS} strokeWidth="0" />
      {/* Simple curved connector */}
      <path
        d={`M ${r1Start + 4 * (BOX_W + GAP) + BOX_W / 2} ${ROW1_Y + BOX_H}
            L ${r1Start + 4 * (BOX_W + GAP) + BOX_W / 2} ${ROW2_Y - 20}
            L ${r2Start + BOX_W / 2} ${ROW2_Y - 20}
            L ${r2Start + BOX_W / 2} ${ROW2_Y}`}
        fill="none" stroke={PROCGS} strokeWidth="1.8"
        markerEnd="url(#mlg)" />

      {/* Row 2 */}
      {ROW2.map((s, i) => {
        const x = r2Start + i * (BOX_W + GAP)
        const cx = x + BOX_W / 2
        return (
          <g key={s.label}>
            <rect x={x - 3} y={ROW2_Y - 3} width={BOX_W + 6} height={BOX_H + 6}
              rx="12" fill={`${s.stroke}22`} />
            <rect x={x} y={ROW2_Y} width={BOX_W} height={BOX_H}
              rx="10" fill={s.fill} stroke={s.stroke} strokeWidth="1.6" />
            <circle cx={x + 18} cy={ROW2_Y + 16} r="11" fill={s.stroke} />
            <text x={x + 18} y={ROW2_Y + 20} textAnchor="middle"
              fill="#000" fontSize="9" fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif">{i + 6}</text>
            <text x={cx} y={ROW2_Y + 35} textAnchor="middle"
              fill={TXT} fontSize="12" fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif">{s.label}</text>
            <text x={cx} y={ROW2_Y + 52} textAnchor="middle"
              fill={TDIM} fontSize="9"
              fontFamily="Inter, system-ui, sans-serif">{s.sub}</text>
            {i < ROW2.length - 1 && (
              <line
                x1={x + BOX_W + 2} y1={ROW2_Y + BOX_H / 2}
                x2={x + BOX_W + GAP - 2} y2={ROW2_Y + BOX_H / 2}
                stroke={s.stroke} strokeWidth="1.8"
                markerEnd={`url(#ml${s.stroke === PROCGS ? 'g' : s.stroke === PROCBS ? 'c' : s.stroke === PROCS ? 'p' : 'a'})`}
              />
            )}
          </g>
        )
      })}

      {/* Metrics strip */}
      <rect x="18" y="382" width="862" height="50" rx="8" fill="#1a1a28" />
      <text x="28" y="400" fill={TDIM} fontSize="9" fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif">Stacking Ensemble — Final Metrics:</text>
      {METRICS.map((m, i) => (
        <g key={m.label}>
          <text x={140 + i * 124} y="398" fill={TDIM} fontSize="9"
            fontFamily="Inter, system-ui, sans-serif">{m.label}</text>
          <text x={140 + i * 124} y="418" fill={PROCGS} fontSize="13"
            fontWeight="700" fontFamily="JetBrains Mono, monospace">{m.val}</text>
        </g>
      ))}

      {/* Legend */}
      <line x1="18" y1="448" x2="882" y2="448"
        stroke={OSTK} strokeWidth="0.8" />
      {[
        { fill: PROCA, stroke: PROCAS, label: 'Data I/O' },
        { fill: PROCB, stroke: PROCBS, label: 'Preprocessing' },
        { fill: PROC,  stroke: PROCS,  label: 'Resampling / SHAP' },
        { fill: PROCG, stroke: PROCGS, label: 'ML Training / Inference' },
      ].map((l, i) => (
        <g key={l.label}>
          <rect x={30 + i * 210} y="453" width="10" height="10" rx="2"
            fill={l.fill} stroke={l.stroke} strokeWidth="1" />
          <text x={44 + i * 210} y="462" fill={TDIM} fontSize="9"
            fontFamily="Inter, system-ui, sans-serif">{l.label}</text>
        </g>
      ))}
    </svg>
  )
}

/* ════════════════════════════════════════════
   DIAGRAM 5 — Performance Charts (Recharts)
════════════════════════════════════════════ */
function PerformanceChartsSection() {
  return (
    <div className={styles.chartSection}>

      {/* ── Section 1: Model Performance Comparison ── */}
      <div className={styles.chartCard}>
        <div className={styles.chartCardTitle}>Model Performance Comparison</div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={PERF_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
            <XAxis dataKey="model" tick={{ fill: '#6b7fa3', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
            <YAxis domain={[79, 100]} tick={{ fill: '#6b7fa3', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
            <Tooltip
              contentStyle={CHART_TOOLTIP}
              labelStyle={{ color: '#e2eaf6', fontWeight: 700 }}
              formatter={(val) => val.toFixed(2) + '%'}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#6b7fa3', paddingTop: 10 }} />
            <Bar dataKey="precision" name="Precision" fill="#4fc3f7" radius={[3, 3, 0, 0]} />
            <Bar dataKey="recall"    name="Recall"    fill="#00ff88" radius={[3, 3, 0, 0]} />
            <Bar dataKey="f1"        name="F1"        fill="#a78bfa" radius={[3, 3, 0, 0]} />
            <Bar dataKey="prauc"     name="PR-AUC"    fill="#ffcc00" radius={[3, 3, 0, 0]} />
            <Bar dataKey="rocauc"    name="ROC-AUC"   fill="#ff7043" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Section 2: Confusion Matrix ── */}
      <div className={styles.chartCard}>
        <div className={styles.chartCardTitle}>Confusion Matrix — Stacking Ensemble</div>
        <div className={styles.chartCardSub}>Evaluated on the 20% held-out test set</div>
        <div className={styles.confMatrix}>
          <div className={styles.confCell} style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
            <span className={styles.confNum} style={{ color: '#00ff88' }}>87</span>
            <span className={styles.confLabel} style={{ color: '#00ff88' }}>True Positive</span>
            <span className={styles.confSub} style={{ color: '#6b7fa3' }}>Fraud correctly caught</span>
          </div>
          <div className={styles.confCell} style={{ background: 'rgba(255,153,0,0.08)', border: '1px solid rgba(255,153,0,0.2)' }}>
            <span className={styles.confNum} style={{ color: '#ff9900' }}>42</span>
            <span className={styles.confLabel} style={{ color: '#ff9900' }}>False Positive</span>
            <span className={styles.confSub} style={{ color: '#6b7fa3' }}>False alarm</span>
          </div>
          <div className={styles.confCell} style={{ background: 'rgba(255,61,90,0.08)', border: '1px solid rgba(255,61,90,0.2)' }}>
            <span className={styles.confNum} style={{ color: '#ff3d5a' }}>11</span>
            <span className={styles.confLabel} style={{ color: '#ff3d5a' }}>False Negative</span>
            <span className={styles.confSub} style={{ color: '#6b7fa3' }}>Missed fraud</span>
          </div>
          <div className={styles.confCell} style={{ background: 'rgba(79,195,247,0.08)', border: '1px solid rgba(79,195,247,0.2)' }}>
            <span className={styles.confNum} style={{ color: '#4fc3f7' }}>56,822</span>
            <span className={styles.confLabel} style={{ color: '#4fc3f7' }}>True Negative</span>
            <span className={styles.confSub} style={{ color: '#6b7fa3' }}>Correctly clear</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: SHAP Feature Importance ── */}
      <div className={styles.chartCard}>
        <div className={styles.chartCardTitle}>SHAP Feature Importance — Top 10 Features</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={SHAP_DATA} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" horizontal={false} />
            <XAxis type="number" domain={[0, 0.35]} tick={{ fill: '#6b7fa3', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
            <YAxis dataKey="feature" type="category" width={56} tick={{ fill: '#6b7fa3', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
            <Tooltip
              contentStyle={CHART_TOOLTIP}
              labelStyle={{ color: '#e2eaf6', fontWeight: 700 }}
              formatter={(val) => val.toFixed(3)}
            />
            <Bar dataKey="importance" name="SHAP Importance" fill="#b040b0" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Section 4: Financial Cost Comparison ── */}
      <div className={styles.chartCard}>
        <div className={styles.chartCardTitle}>Financial Cost Metric by Model</div>
        <div className={styles.chartCardSub}>Lower is better. Cost = FN×$500 + FP×$5</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={COST_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
            <XAxis dataKey="model" tick={{ fill: '#6b7fa3', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
            <YAxis domain={[5500, 7000]} tick={{ fill: '#6b7fa3', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
            <Tooltip
              contentStyle={CHART_TOOLTIP}
              labelStyle={{ color: '#e2eaf6', fontWeight: 700 }}
              formatter={(val) => '$' + val.toLocaleString()}
            />
            <Bar dataKey="cost" name="Financial Cost ($)" radius={[3, 3, 0, 0]}>
              {COST_DATA.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.model === 'Stacking' ? '#00ff88' : '#2a4060'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}

/* ════════════════════════════════════════════
   TABS CONFIG
════════════════════════════════════════════ */
const TABS = [
  {
    id: 'usecase', label: 'Use Case',
    Component: UseCaseSVG,
    description:
      'System use case diagram showing all four actor roles and their interactions with system processes. ' +
      'The User role covers authentication, history, and dashboard. The Analyst role adds transaction prediction, ' +
      'batch scanning, and the analyze flow. The Admin role handles user management, risk monitoring, and side-by-side comparison. ' +
      'The System actor represents internal automated processes: ML ensemble scoring, SHAP explainability, and email notification.',
  },
  {
    id: 'arch', label: 'System Architecture',
    Component: SystemArchSVG,
    description:
      'Three-tier architecture. Tier 1 is the React 18 + Vite single-page application with eight pages. ' +
      'Tier 2 is the FastAPI + Uvicorn backend exposing six authenticated REST endpoints and a ML engine ' +
      '(XGBoost + LightGBM + CatBoost → Stacking Ensemble → SHAP TreeExplainer). ' +
      'Tier 3 is the data layer: SQLite database (users + predictions tables), the creditcard.csv training dataset, and serialised model artefacts.',
  },
  {
    id: 'dfd1', label: 'DFD Level 1',
    Component: DFDLevel1SVG,
    description:
      'Level 1 DFD decomposing the system into five internal processes. ' +
      'Process 1.0 (Authentication) validates credentials against the Users DB and issues JWT tokens. ' +
      'Process 2.0 (Feature Engineering) transforms raw transactions into 18 ML features using RobustScaler. ' +
      'Process 3.0 (Ensemble Prediction) passes features through the stacking ensemble. ' +
      'Process 4.0 (SHAP) runs TreeExplainer for per-prediction attributions. ' +
      'Process 5.0 (Persistence) writes to the Predictions DB and dispatches email notifications.',
  },
  {
    id: 'ml', label: 'ML Pipeline',
    Component: MLPipelineSVG,
    description:
      'End-to-end ML pipeline in 10 numbered stages: raw creditcard.csv (284,807 rows) → ' +
      'feature engineering (18 features, RobustScaler) → SMOTEENN resampling → 80/20 stratified split → ' +
      'three gradient-boosting base learners (XGBoost, LightGBM, CatBoost) → ' +
      'Logistic Regression stacking meta-learner (5-fold CV) → SHAP TreeExplainer → FastAPI /predict endpoint. ' +
      'Final ensemble achieves PR-AUC 0.8499, Recall 88.78%, and a cost metric of $5,710.',
  },
  {
    id: 'charts', label: 'Performance Charts',
    Component: PerformanceChartsSection,
    isCharts: true,
    description:
      'Interactive charts comparing all four models across precision, recall, F1, PR-AUC, ROC-AUC, and financial cost metrics. ' +
      'The confusion matrix shows prediction outcomes for the stacking ensemble on the 20% test set. ' +
      'SHAP feature importance reveals which PCA components most strongly drive fraud predictions.',
  },
]

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function Diagrams() {
  const [activeTab, setActiveTab] = useState('usecase')
  const svgRef = useRef(null)
  const active = TABS.find(t => t.id === activeTab)

  function handleDownload() {
    const svg = svgRef.current?.querySelector('svg')
    if (!svg) return
    const blob = new Blob([new XMLSerializer().serializeToString(svg)],
      { type: 'image/svg+xml;charset=utf-8' })
    const a = Object.assign(document.createElement('a'),
      { href: URL.createObjectURL(blob), download: `diagram-${activeTab}.svg` })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>System Diagrams</h1>
          <p className={styles.subtitle}>Architecture and data flow documentation</p>
        </div>
        {!active.isCharts && (
          <button className={styles.downloadBtn} onClick={handleDownload}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1v9M4 7l4 4 4-4M2 13h12"
                stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download SVG
          </button>
        )}
      </header>

      <nav className={styles.tabBar} role="tablist">
        {TABS.map(tab => (
          <button key={tab.id} role="tab"
            aria-selected={tab.id === activeTab}
            className={`${styles.tab} ${tab.id === activeTab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.card} role="tabpanel">
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{active.label}</h2>
        </div>
        {active.isCharts ? (
          <div style={{ padding: '0', background: '#0d1117', borderBottom: '1px solid #1e2a3a' }}>
            <active.Component />
          </div>
        ) : (
          <div className={styles.svgWrapper} ref={svgRef}>
            <active.Component />
          </div>
        )}
        <p className={styles.description}>{active.description}</p>
      </div>
    </div>
  )
}
