import {
  Cpu, HardDrive, Code2, Layers, GitBranch,
  BarChart2, Package, Monitor, Terminal, Zap, Database,
  ChevronRight, CheckCircle2
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts'
import styles from './Algorithm.module.css'

/* ─── Data ────────────────────────────────────────────────────────── */

const PIPELINE_STEPS = [
  { num: 1, title: 'Load Dataset',        detail: 'creditcard.csv → pandas DataFrame (284,807 rows × 31 cols)',          color: '#4fc3f7' },
  { num: 2, title: 'Feature Engineering', detail: 'Derive hour_of_day & day_of_week from Time; select 15 V-features',     color: '#a78bfa' },
  { num: 3, title: 'Train / Test Split',  detail: '80/20 stratified split → 227,845 train, 56,962 test rows',             color: '#00ff88' },
  { num: 4, title: 'RobustScaler',        detail: 'Scale all 18 features using median & IQR — robust to outliers',        color: '#ffcc00' },
  { num: 5, title: 'SMOTEENN',            detail: 'Oversample minority class + Edited Nearest Neighbours cleaning',        color: '#ff7043' },
  { num: 6, title: 'Train Base Models',   detail: 'XGBoost · LightGBM · CatBoost — each with 400 estimators, depth 6',   color: '#00ff88' },
  { num: 7, title: 'Stacking Ensemble',   detail: '5-fold CV meta-features → Logistic Regression meta-learner',           color: '#4fc3f7' },
  { num: 8, title: 'Evaluate & Save',     detail: 'ROC-AUC, PR-AUC, cost-sensitive loss → ensemble.pkl + metrics.json',  color: '#a78bfa' },
]

const BASE_MODELS = [
  {
    name: 'XGBoost',
    version: '2.0.3',
    color: '#ff7043',
    params: [
      { k: 'n_estimators',    v: '400' },
      { k: 'max_depth',       v: '6' },
      { k: 'learning_rate',   v: '0.05' },
      { k: 'subsample',       v: '0.8' },
      { k: 'colsample_bytree',v: '0.8' },
      { k: 'eval_metric',     v: '"aucpr"' },
      { k: 'n_jobs',          v: '-1' },
      { k: 'random_state',    v: '42' },
    ],
    note: 'Extreme Gradient Boosting. Regularised boosting prevents overfitting on the highly imbalanced dataset. eval_metric=aucpr optimises the precision-recall curve directly.',
  },
  {
    name: 'LightGBM',
    version: '4.3.0',
    color: '#ffcc00',
    params: [
      { k: 'n_estimators',    v: '400' },
      { k: 'max_depth',       v: '6' },
      { k: 'learning_rate',   v: '0.05' },
      { k: 'subsample',       v: '0.8' },
      { k: 'colsample_bytree',v: '0.8' },
      { k: 'class_weight',    v: '"balanced"' },
      { k: 'n_jobs',          v: '-1' },
      { k: 'random_state',    v: '42' },
    ],
    note: 'Leaf-wise tree growth for speed on large datasets. Histogram-based splitting dramatically reduces memory usage. class_weight="balanced" provides additional imbalance correction.',
  },
  {
    name: 'CatBoost',
    version: '1.2.5',
    color: '#a78bfa',
    params: [
      { k: 'iterations',         v: '400' },
      { k: 'depth',              v: '6' },
      { k: 'learning_rate',      v: '0.05' },
      { k: 'auto_class_weights', v: '"Balanced"' },
      { k: 'eval_metric',        v: '"AUC"' },
      { k: 'random_seed',        v: '42' },
      { k: 'verbose',            v: '0' },
    ],
    note: 'Yandex\'s ordered boosting prevents target leakage during training. auto_class_weights="Balanced" automatically compensates for the 577:1 class imbalance.',
  },
]

const ENSEMBLE = {
  method: 'StackingClassifier',
  cv: 5,
  stack_method: 'predict_proba',
  meta: 'LogisticRegression(C=1.0, max_iter=1000)',
  note: 'Each base model generates out-of-fold probability predictions via 5-fold cross-validation. These stacked probabilities become the meta-features that Logistic Regression learns to combine optimally.',
}

const FEATURES = {
  raw: ['Amount', 'hour_of_day (from Time)', 'day_of_week (from Time)'],
  pca: ['V1','V2','V3','V4','V7','V9','V10','V11','V12','V14','V16','V17','V18','V19','V20'],
  scaler: 'RobustScaler (median & IQR — immune to outlier fraud values)',
  reason: 'V5, V6, V8, V13, V15, V21–V28 excluded after feature importance analysis across all three base models.',
}

const SMOTEENN = {
  class_ratio_before: '577 : 1 (legitimate : fraud)',
  class_ratio_after:  '≈ 1 : 1 after SMOTEENN',
  smote: 'Synthetic Minority Oversampling: generates synthetic fraud samples by interpolating between existing fraud neighbours in feature space.',
  enn:   'Edited Nearest Neighbours: removes majority class samples that are misclassified by their 3-NN — cleans the class boundary.',
}

const FEAT_SEL_DATA = [
  { name: 'Used (18)',     value: 18, fill: '#00ff88' },
  { name: 'Excluded (13)', value: 13, fill: '#1e2a3a' },
]

const SPLIT_DATA = [
  { set: 'Train (80%)', legit: 227451, fraud: 394 },
  { set: 'Test  (20%)', legit: 56864,  fraud: 98  },
]

const CLASS_BEFORE = [
  { name: 'Legitimate', value: 227451, pct: 99.83 },
  { name: 'Fraud',      value: 394,    pct: 0.17  },
]

const CLASS_AFTER = [
  { name: 'Legitimate', value: 197320, pct: 50.5 },
  { name: 'Fraud',      value: 193562, pct: 49.5 },
]

const MODEL_COLORS = { XGBoost: '#ff7043', LightGBM: '#ffcc00', CatBoost: '#a78bfa', StackingEnsemble: '#00ff88' }

const MODEL_PERF_DATA = [
  { metric: 'Recall',    XGBoost: 87.76, LightGBM: 86.73, CatBoost: 88.78, StackingEnsemble: 88.78 },
  { metric: 'Precision', XGBoost: 61.43, LightGBM: 64.39, CatBoost: 58.00, StackingEnsemble: 67.44 },
  { metric: 'F1 Score',  XGBoost: 72.27, LightGBM: 73.91, CatBoost: 70.16, StackingEnsemble: 76.65 },
  { metric: 'ROC-AUC',   XGBoost: 98.01, LightGBM: 97.39, CatBoost: 97.20, StackingEnsemble: 97.60 },
  { metric: 'PR-AUC',    XGBoost: 84.80, LightGBM: 84.84, CatBoost: 83.30, StackingEnsemble: 84.99 },
]

const DETECTION_DATA = [
  { model: 'XGBoost',         tp: 86, fn: 12, fp: 54 },
  { model: 'LightGBM',        tp: 85, fn: 13, fp: 47 },
  { model: 'CatBoost',        tp: 87, fn: 11, fp: 63 },
  { model: 'Ensemble',        tp: 87, fn: 11, fp: 42 },
]

const COST_DATA = [
  { model: 'XGBoost',  cost: 6270 },
  { model: 'LightGBM', cost: 6735 },
  { model: 'CatBoost', cost: 5815 },
  { model: 'Ensemble', cost: 5710 },
]

const TOOLTIP_STYLE = {
  background: '#0a0f1a',
  border: '1px solid #1e2a3a',
  borderRadius: '8px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: '#e2eaf6',
}

const METRICS_INFO = [
  { name: 'ROC-AUC', desc: 'Area under the Receiver Operating Characteristic curve. Measures separability at all thresholds. 1.0 = perfect, 0.5 = random.' },
  { name: 'PR-AUC',  desc: 'Area under the Precision-Recall curve. More informative than ROC-AUC for highly imbalanced datasets — rewards finding fraud without too many false alarms.' },
  { name: 'Recall',  desc: 'True Positive Rate — what fraction of actual fraud cases are caught. Maximising recall minimises missed fraud (false negatives).' },
  { name: 'F1 Score',desc: 'Harmonic mean of Precision and Recall. Balances the trade-off between catching fraud and avoiding false alarms.' },
  { name: 'Cost ($)', desc: 'Cost-sensitive loss = FN × $500 + FP × $5. Each missed fraud costs $500 (avg loss); each false alarm costs $5 (review labour).' },
]

const HW = [
  { label: 'CPU',           value: '12th Gen Intel® Core™ i5-1240P',       icon: Cpu     },
  { label: 'CPU Cores',     value: '12 cores / 16 threads (P+E hybrid)',     icon: Cpu     },
  { label: 'RAM',           value: '16 GB DDR5 (2 × 8 GB)',                  icon: HardDrive },
  { label: 'Architecture',  value: 'AMD64 (x86-64)',                          icon: Monitor },
  { label: 'OS',            value: 'Windows 10 (Build 26200)',                icon: Monitor },
  { label: 'Storage Type',  value: 'NVMe SSD',                                icon: HardDrive },
]

const SW = [
  { label: 'Python',        value: '3.11.9',                    tag: 'Runtime'  },
  { label: 'Compiler',      value: 'MSVC v1938 64-bit',          tag: 'Compiler' },
  { label: 'Package Mgr',   value: 'pip 24.x',                   tag: 'Tools'    },
  { label: 'Environment',   value: 'venv (virtualenv)',           tag: 'Tools'    },
  { label: 'Node.js',       value: '20.x LTS',                   tag: 'Frontend' },
  { label: 'npm',           value: '10.x',                        tag: 'Frontend' },
]

const BACKEND_DEPS = [
  // Web framework
  { name: 'fastapi',              version: '0.111.0', cat: 'API Framework',  desc: 'High-performance async Python web framework' },
  { name: 'uvicorn[standard]',    version: '0.29.0',  cat: 'API Framework',  desc: 'ASGI server; runs FastAPI with hot-reload' },
  { name: 'python-multipart',     version: '0.0.9',   cat: 'API Framework',  desc: 'Form-data parsing for file uploads' },
  // Auth & security
  { name: 'python-jose',          version: '3.3.0',   cat: 'Auth & Security',desc: 'JWT creation and verification (RS256 / HS256)' },
  { name: 'bcrypt',               version: '4.1.3',   cat: 'Auth & Security',desc: 'Password hashing with adaptive cost factor' },
  { name: 'python-dotenv',        version: '1.0.1',   cat: 'Auth & Security',desc: 'Loads .env secrets into environment variables' },
  // Database / ORM
  { name: 'sqlalchemy',           version: '2.0.30',  cat: 'Database',       desc: 'ORM for SQLite — Users, Predictions, PendingUsers tables' },
  // Validation
  { name: 'pydantic',             version: '2.7.1',   cat: 'Validation',     desc: 'Request/response schema validation and serialisation' },
  { name: 'pydantic-settings',    version: '2.2.1',   cat: 'Validation',     desc: 'Typed settings loaded from .env via BaseSettings' },
  // ML core
  { name: 'numpy',                version: '1.26.4',  cat: 'ML Core',        desc: 'Numerical arrays — feature matrix and SHAP values' },
  { name: 'pandas',               version: '2.2.2',   cat: 'ML Core',        desc: 'DataFrame loading and feature engineering pipeline' },
  { name: 'scikit-learn',         version: '1.4.2',   cat: 'ML Core',        desc: 'StackingClassifier, RobustScaler, train_test_split, metrics' },
  { name: 'scipy',                version: '1.13.0',  cat: 'ML Core',        desc: 'Statistical computations used internally by scikit-learn' },
  { name: 'joblib',               version: '1.4.2',   cat: 'ML Core',        desc: 'Serialise and load trained model artifacts (.pkl files)' },
  // Ensemble models
  { name: 'xgboost',              version: '2.0.3',   cat: 'Ensemble Models',desc: 'Extreme Gradient Boosting — base learner 1' },
  { name: 'lightgbm',             version: '4.3.0',   cat: 'Ensemble Models',desc: 'Light Gradient Boosting Machine — base learner 2' },
  { name: 'catboost',             version: '1.2.5',   cat: 'Ensemble Models',desc: 'Categorical Boosting (Yandex) — base learner 3' },
  // Resampling & explainability
  { name: 'imbalanced-learn',     version: '0.12.2',  cat: 'Resampling',     desc: 'SMOTEENN — oversampling + boundary cleaning' },
  { name: 'shap',                 version: '0.45.0',  cat: 'Explainability', desc: 'TreeExplainer for per-prediction SHAP feature attribution' },
  // Visualisation (training only)
  { name: 'matplotlib',           version: '3.8.4',   cat: 'Visualisation',  desc: 'Plots during training (ROC curves, confusion matrix)' },
  { name: 'seaborn',              version: '0.13.2',  cat: 'Visualisation',  desc: 'Statistical plots for EDA and training diagnostics' },
]

const FRONTEND_DEPS = [
  { name: 'react',                version: '18.3.1',  cat: 'Core',          desc: 'UI component library with hooks and concurrent mode' },
  { name: 'react-dom',            version: '18.3.1',  cat: 'Core',          desc: 'DOM renderer for React components' },
  { name: 'react-router-dom',     version: '6.23.1',  cat: 'Routing',       desc: 'Client-side routing — protected routes and navigation' },
  { name: 'axios',                version: '1.7.2',   cat: 'HTTP',          desc: 'HTTP client with interceptors for JWT auth headers' },
  { name: 'recharts',             version: '2.12.7',  cat: 'Charts',        desc: 'React chart library — Area, Bar, Pie, Radar charts' },
  { name: 'react-hot-toast',      version: '2.4.1',   cat: 'UI',            desc: 'Toast notification system for errors and successes' },
  { name: 'lucide-react',         version: '0.395.0', cat: 'UI',            desc: 'SVG icon library — consistent iconography across pages' },
  { name: 'vite',                 version: '5.3.1',   cat: 'Build Tool',    desc: 'Dev server with HMR + production bundler (Rollup)' },
  { name: '@vitejs/plugin-react', version: '4.3.1',   cat: 'Build Tool',    desc: 'Vite plugin — Babel transforms and React Fast Refresh' },
]

/* ─── Small components ────────────────────────────────────────────── */

function SectionHeader({ icon: Icon, title, color = '#00ff88' }) {
  return (
    <div className={styles.sectionHeader} style={{ borderColor: color }}>
      <Icon size={17} style={{ color, flexShrink: 0 }} />
      <h2>{title}</h2>
    </div>
  )
}

function Param({ k, v }) {
  return (
    <div className={styles.param}>
      <span className={styles.paramKey}>{k}</span>
      <span className={styles.paramEq}>=</span>
      <span className={styles.paramVal}>{v}</span>
    </div>
  )
}

const CAT_COLORS = {
  'API Framework':   '#4fc3f7',
  'Auth & Security': '#ff7043',
  'Database':        '#ffcc00',
  'Validation':      '#a78bfa',
  'ML Core':         '#00ff88',
  'Ensemble Models': '#ff3d5a',
  'Resampling':      '#ff7043',
  'Explainability':  '#00ff88',
  'Visualisation':   '#6b7fa3',
  'Core':            '#4fc3f7',
  'Routing':         '#a78bfa',
  'HTTP':            '#ffcc00',
  'Charts':          '#ff7043',
  'UI':              '#00ff88',
  'Build Tool':      '#6b7fa3',
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function Algorithm() {
  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <Terminal size={32} style={{ color: '#00ff88', filter: 'drop-shadow(0 0 10px #00ff8866)' }} />
        <div>
          <h1 className={styles.heroTitle}>Algorithm & System Specification</h1>
          <p className={styles.heroSub}>
            Full technical documentation of the FraudNet ML pipeline,
            hyperparameters, hardware environment, and dependency stack.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — Training Pipeline
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <SectionHeader icon={GitBranch} title="Training Pipeline" color="#00ff88" />
        <p className={styles.intro}>
          Each run of <code>python ml/train.py --data creditcard.csv</code> executes
          these eight stages in order, producing a serialised ensemble model and a
          metrics JSON file consumed by the API at runtime.
        </p>
        <div className={styles.pipeline}>
          {PIPELINE_STEPS.map((s, i) => (
            <div key={s.num} className={styles.pipeRow}>
              <div className={styles.pipeNum} style={{ background: `${s.color}22`, border: `1px solid ${s.color}55`, color: s.color }}>
                {s.num}
              </div>
              <div className={styles.pipeBody}>
                <div className={styles.pipeTitle}>{s.title}</div>
                <div className={styles.pipeDetail}>{s.detail}</div>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <ChevronRight size={14} className={styles.pipeArrow} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — Feature Engineering
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <SectionHeader icon={Database} title="Feature Engineering" color="#4fc3f7" />
        <div className={styles.featureEngGrid}>

          <div className={styles.feBox}>
            <div className={styles.feBoxTitle}>Raw / Derived Features (3)</div>
            {FEATURES.raw.map(f => (
              <div key={f} className={styles.feChip} style={{ borderColor:'#4fc3f740', color:'#4fc3f7', background:'#4fc3f710' }}>{f}</div>
            ))}
          </div>

          <div className={styles.feBox}>
            <div className={styles.feBoxTitle}>Selected PCA Features (15)</div>
            <div className={styles.feChipRow}>
              {FEATURES.pca.map(f => (
                <div key={f} className={styles.feChip} style={{ borderColor:'#00ff8840', color:'#00ff88', background:'#00ff8810' }}>{f}</div>
              ))}
            </div>
          </div>

          <div className={styles.feBox} style={{ gridColumn: '1 / -1' }}>
            <div className={styles.feBoxTitle}>Scaler</div>
            <code className={styles.codeInline}>{FEATURES.scaler}</code>
            <p className={styles.feNote}>{FEATURES.reason}</p>
          </div>

        </div>

        {/* Feature selection + split charts */}
        <div className={styles.chartPair} style={{ marginTop: 12 }}>
          <div className={styles.chartCard}>
            <div className={styles.chartLabel}>Feature Selection — 18 of 31 Used</div>
            <div className={styles.featSelLayout}>
              <ResponsiveContainer width="45%" height={150}>
                <PieChart>
                  <Pie data={FEAT_SEL_DATA} cx="50%" cy="50%"
                    innerRadius={40} outerRadius={58}
                    paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}
                  >
                    {FEAT_SEL_DATA.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.9} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.featSelList}>
                <div className={styles.featSelItem}>
                  <span className={styles.pieDot} style={{ background: '#00ff88' }} />
                  <span style={{ color: '#00ff88' }}>18 Selected</span>
                </div>
                <div className={styles.featSelNote}>Amount, Hour, Day,<br />V1–V4, V7, V9–V12,<br />V14, V16–V20</div>
                <div className={styles.featSelItem} style={{ marginTop: 8 }}>
                  <span className={styles.pieDot} style={{ background: '#1e2a3a', border: '1px solid #3a4558' }} />
                  <span style={{ color: 'var(--text-muted)' }}>13 Excluded</span>
                </div>
                <div className={styles.featSelNote}>V5, V6, V8, V13, V15,<br />V21–V28</div>
              </div>
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartLabel}>Train / Test Split — Stratified 80 / 20</div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={SPLIT_DATA} layout="vertical" margin={{ left: 8, right: 40, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1e2a3a" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number"
                  tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                />
                <YAxis type="category" dataKey="set" width={76}
                  tick={{ fontSize: 10, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={v => v.toLocaleString()} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono', paddingTop: 8 }} />
                <Bar dataKey="legit" name="Legitimate" stackId="a" fill="#00ff88" fillOpacity={0.7} />
                <Bar dataKey="fraud" name="Fraud" stackId="a" fill="#ff3d5a" fillOpacity={0.85} radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — SMOTEENN
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <SectionHeader icon={Layers} title="Class Imbalance — SMOTEENN" color="#ff7043" />
        <div className={styles.smoteGrid}>
          <div className={styles.smoteRatio}>
            <div className={styles.smoteLabel}>Before resampling</div>
            <div className={styles.smoteValue} style={{ color: '#ff3d5a' }}>{SMOTEENN.class_ratio_before}</div>
          </div>
          <div className={styles.smoteArrow}>→</div>
          <div className={styles.smoteRatio}>
            <div className={styles.smoteLabel}>After SMOTEENN</div>
            <div className={styles.smoteValue} style={{ color: '#00ff88' }}>{SMOTEENN.class_ratio_after}</div>
          </div>
        </div>
        <div className={styles.smoteCards}>
          <div className={styles.smoteCard}>
            <div className={styles.smoteCardTitle}>SMOTE — Oversampling</div>
            <p>{SMOTEENN.smote}</p>
          </div>
          <div className={styles.smoteCard}>
            <div className={styles.smoteCardTitle}>ENN — Cleaning</div>
            <p>{SMOTEENN.enn}</p>
          </div>
        </div>

        {/* Class distribution pies */}
        <div className={styles.chartCard} style={{ marginTop: 14 }}>
          <div className={styles.chartLabel}>Class Distribution — Training Set</div>
          <div className={styles.piePair}>
            <div className={styles.pieBlock}>
              <div className={styles.pieTitle}>Before SMOTEENN</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={CLASS_BEFORE} cx="50%" cy="50%"
                    innerRadius={52} outerRadius={74}
                    paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}
                  >
                    <Cell fill="#00ff88" fillOpacity={0.85} />
                    <Cell fill="#ff3d5a" fillOpacity={0.85} />
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE}
                    formatter={(v, name, props) => [`${props.payload.pct}%  (${v.toLocaleString()})`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.pieLegendRow}>
                <span className={styles.pieDot} style={{ background: '#00ff88' }} />
                <span style={{ color: '#00ff88' }}>Legitimate 99.83%</span>
              </div>
              <div className={styles.pieLegendRow}>
                <span className={styles.pieDot} style={{ background: '#ff3d5a' }} />
                <span style={{ color: '#ff3d5a' }}>Fraud 0.17%</span>
              </div>
            </div>

            <div className={styles.pieDivider}>
              <div className={styles.pieDividerLine} />
              <span className={styles.pieDividerLabel}>SMOTEENN</span>
              <div className={styles.pieDividerLine} />
            </div>

            <div className={styles.pieBlock}>
              <div className={styles.pieTitle}>After SMOTEENN</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={CLASS_AFTER} cx="50%" cy="50%"
                    innerRadius={52} outerRadius={74}
                    paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}
                  >
                    <Cell fill="#00ff88" fillOpacity={0.85} />
                    <Cell fill="#ff3d5a" fillOpacity={0.85} />
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE}
                    formatter={(v, name, props) => [`${props.payload.pct}%  (${v.toLocaleString()})`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.pieLegendRow}>
                <span className={styles.pieDot} style={{ background: '#00ff88' }} />
                <span style={{ color: '#00ff88' }}>Legitimate 50.5%</span>
              </div>
              <div className={styles.pieLegendRow}>
                <span className={styles.pieDot} style={{ background: '#ff3d5a' }} />
                <span style={{ color: '#ff3d5a' }}>Fraud 49.5%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — Base Models & Hyperparameters
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <SectionHeader icon={Code2} title="Base Models & Hyperparameters" color="#a78bfa" />
        <div className={styles.modelGrid}>
          {BASE_MODELS.map(m => (
            <div key={m.name} className={styles.modelCard} style={{ borderTopColor: m.color }}>
              <div className={styles.modelHead}>
                <span className={styles.modelName} style={{ color: m.color }}>{m.name}</span>
                <span className={styles.modelVer}>v{m.version}</span>
              </div>
              <div className={styles.paramBlock}>
                {m.params.map(p => <Param key={p.k} k={p.k} v={p.v} />)}
              </div>
              <p className={styles.modelNote}>{m.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Model performance chart */}
      <section className={styles.section} style={{ marginTop: -20 }}>
        <div className={styles.chartCard}>
          <div className={styles.perfChartHeader}>
            <div className={styles.chartLabel} style={{ margin: 0 }}>
              Model Performance Comparison — test set (%)
            </div>
            <div className={styles.deployedBadge}>
              <Zap size={10} /> StackingEnsemble — Deployed
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={MODEL_PERF_DATA} margin={{ left: -12, right: 8, top: 28, bottom: 0 }}>
              <CartesianGrid stroke="#1e2a3a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="metric"
                tick={{ fontSize: 10, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#1e2a3a' }} tickLine={false}
              />
              <YAxis domain={[55, 100]} unit="%"
                tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => [
                  `${v.toFixed(2)}%`,
                  name === 'StackingEnsemble' ? `★ ${name} (Active)` : name,
                ]}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="XGBoost"          fill="#ff7043" fillOpacity={0.28} radius={[3,3,0,0]} />
              <Bar dataKey="LightGBM"         fill="#ffcc00" fillOpacity={0.28} radius={[3,3,0,0]} />
              <Bar dataKey="CatBoost"         fill="#a78bfa" fillOpacity={0.28} radius={[3,3,0,0]} />
              <Bar dataKey="StackingEnsemble" fill="#00ff88" fillOpacity={1.0}  radius={[4,4,0,0]}>
                <LabelList
                  dataKey="StackingEnsemble"
                  position="top"
                  formatter={v => `${v}%`}
                  style={{ fill: '#00ff88', fontFamily: 'JetBrains Mono', fontSize: 9, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className={styles.modelLegend}>
            {[
              { key: 'XGBoost',         color: '#ff7043', active: false },
              { key: 'LightGBM',        color: '#ffcc00', active: false },
              { key: 'CatBoost',        color: '#a78bfa', active: false },
              { key: 'StackingEnsemble',color: '#00ff88', active: true  },
            ].map(m => (
              <span key={m.key} className={`${styles.legendItem} ${m.active ? styles.legendActive : ''}`}>
                <span className={styles.legendDot}
                  style={{ background: m.color, opacity: m.active ? 1 : 0.35 }}
                />
                <span style={{ opacity: m.active ? 1 : 0.45 }}>{m.key}</span>
                {m.active && <span className={styles.legendBadge}>ACTIVE</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 5 — Stacking Ensemble
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <SectionHeader icon={Zap} title="Stacking Ensemble Architecture" color="#ffcc00" />
        <div className={styles.stackDiagram}>
          <div className={styles.stackLayer}>
            <div className={styles.stackLayerLabel}>Layer 1 — Base Learners</div>
            <div className={styles.stackNodes}>
              {['XGBoost', 'LightGBM', 'CatBoost'].map(n => (
                <div key={n} className={styles.stackNode}>{n}</div>
              ))}
            </div>
          </div>
          <div className={styles.stackArrow}>↓ predict_proba (5-fold CV out-of-fold)</div>
          <div className={styles.stackLayer}>
            <div className={styles.stackLayerLabel}>Layer 2 — Meta-Learner</div>
            <div className={styles.stackNodes}>
              <div className={styles.stackNode} style={{ borderColor:'#ffcc0055', color:'#ffcc00', background:'#ffcc0012' }}>
                LogisticRegression (C=1.0, max_iter=1000)
              </div>
            </div>
          </div>
          <div className={styles.stackArrow}>↓</div>
          <div className={styles.stackLayer}>
            <div className={styles.stackLayerLabel}>Output</div>
            <div className={styles.stackNodes}>
              <div className={styles.stackNode} style={{ borderColor:'#00ff8855', color:'#00ff88', background:'#00ff8812' }}>
                Fraud probability (0–1) → Risk Score (0–100%)
              </div>
            </div>
          </div>
        </div>
        <p className={styles.intro} style={{ marginTop: 12 }}>{ENSEMBLE.note}</p>
        <div className={styles.paramBlock} style={{ marginTop: 10 }}>
          <Param k="cv"           v={String(ENSEMBLE.cv)} />
          <Param k="stack_method" v={`"${ENSEMBLE.stack_method}"`} />
          <Param k="n_jobs"       v="-1" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 6 — Evaluation Metrics
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <SectionHeader icon={BarChart2} title="Evaluation Metrics" color="#00ff88" />
        <div className={styles.metricsGrid}>
          {METRICS_INFO.map(m => (
            <div key={m.name} className={styles.metricCard}>
              <div className={styles.metricName}>{m.name}</div>
              <div className={styles.metricDesc}>{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Detection results + cost charts */}
      <section className={styles.section} style={{ marginTop: -20 }}>
        <div className={styles.chartPair}>
          <div className={styles.chartCard}>
            <div className={styles.chartLabel}>Detection Breakdown — test set (fraud cases found)</div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={DETECTION_DATA} margin={{ left: -16, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1e2a3a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="model"
                  tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#1e2a3a' }} tickLine={false}
                />
                <YAxis tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                  axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono', paddingTop: 10 }} />
                <Bar dataKey="tp" name="True Positives"  fill="#00ff88" fillOpacity={0.85} radius={[3,3,0,0]} />
                <Bar dataKey="fn" name="False Negatives" fill="#ff3d5a" fillOpacity={0.85} radius={[3,3,0,0]} />
                <Bar dataKey="fp" name="False Positives" fill="#ffcc00" fillOpacity={0.85} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartLabel}>Cost-Sensitive Loss — lower is better ($)</div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={COST_DATA} margin={{ left: -4, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1e2a3a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="model"
                  tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#1e2a3a' }} tickLine={false}
                />
                <YAxis domain={[5000, 7200]} unit="$"
                  tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                  axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `$${v.toLocaleString()}`}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="cost" name="Cost ($)" radius={[4,4,0,0]}>
                  {COST_DATA.map((d, i) => (
                    <Cell key={i}
                      fill={d.model === 'Ensemble' ? '#00ff88' : '#4fc3f7'}
                      fillOpacity={d.model === 'Ensemble' ? 0.9 : 0.65}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 7 — Hardware Specs
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <SectionHeader icon={Cpu} title="Hardware Specifications" color="#4fc3f7" />
        <div className={styles.specGrid}>
          {HW.map(h => (
            <div key={h.label} className={styles.specCard}>
              <h.icon size={16} style={{ color:'#4fc3f7', flexShrink: 0 }} />
              <div>
                <div className={styles.specLabel}>{h.label}</div>
                <div className={styles.specValue}>{h.value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 8 — Software Specs
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <SectionHeader icon={Monitor} title="Software Environment" color="#a78bfa" />
        <div className={styles.specGrid}>
          {SW.map(s => (
            <div key={s.label} className={styles.specCard}>
              <Terminal size={16} style={{ color:'#a78bfa', flexShrink: 0 }} />
              <div>
                <div className={styles.specLabel}>{s.label} <span className={styles.specTag}>{s.tag}</span></div>
                <div className={styles.specValue}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 9 — Backend Dependencies
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <SectionHeader icon={Package} title="Backend Dependencies (Python)" color="#ff7043" />
        <p className={styles.intro}>
          Installed via <code>pip install -r requirements.txt</code> — pinned exact versions for reproducibility.
        </p>
        <DepsTable deps={BACKEND_DEPS} />
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 10 — Frontend Dependencies
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <SectionHeader icon={Code2} title="Frontend Dependencies (Node.js)" color="#ffcc00" />
        <p className={styles.intro}>
          Installed via <code>npm install</code> — managed through <code>package.json</code>.
        </p>
        <DepsTable deps={FRONTEND_DEPS} />
      </section>

      {/* Footer */}
      <div className={styles.footer}>
        <CheckCircle2 size={13} />
        <span>FraudNet v1.0 — All specifications reflect the exact versions used during development and training.</span>
      </div>

    </div>
  )
}

/* ─── Deps table ──────────────────────────────────────────────────── */
function DepsTable({ deps }) {
  // Group by category
  const grouped = {}
  deps.forEach(d => {
    if (!grouped[d.cat]) grouped[d.cat] = []
    grouped[d.cat].push(d)
  })

  return (
    <div className={styles.depsWrap}>
      <div className={styles.depsHead}>
        <span>Package</span>
        <span>Version</span>
        <span>Category</span>
        <span>Purpose</span>
      </div>
      {deps.map(d => (
        <div key={d.name} className={styles.depsRow}>
          <span className={styles.depName}>{d.name}</span>
          <span className={styles.depVer}>{d.version}</span>
          <span className={styles.depCat} style={{
            color: CAT_COLORS[d.cat] || '#6b7fa3',
            background: `${CAT_COLORS[d.cat] || '#6b7fa3'}12`,
            border: `1px solid ${CAT_COLORS[d.cat] || '#6b7fa3'}30`,
          }}>
            {d.cat}
          </span>
          <span className={styles.depDesc}>{d.desc}</span>
        </div>
      ))}
    </div>
  )
}
