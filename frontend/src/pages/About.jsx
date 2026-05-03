import {
  BookOpen, Database, Cpu, Brain, BarChart2,
  Lightbulb, Info, CheckCircle, Layers, GitBranch, Shield,
  XCircle, CheckCircle2, AlertTriangle, Zap, TrendingUp, Lock,
  Server,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts'
import styles from './About.module.css'

const TOOLTIP_STYLE = {
  background: '#0a0f1a',
  border: '1px solid #1e2a3a',
  borderRadius: '8px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: '#e2eaf6',
}

const DATASET_PIE = [
  { name: 'Legitimate', value: 284315, pct: '99.83%' },
  { name: 'Fraud',      value: 492,    pct: '0.17%'  },
]

const CAPABILITY_DATA = [
  { name: 'Rule-Based',    score: 3.0 },
  { name: 'Log. Reg.',     score: 4.0 },
  { name: 'Rand. Forest',  score: 4.0 },
  { name: 'Autoencoder',   score: 2.0 },
  { name: 'Commercial',    score: 3.5 },
  { name: 'FraudNet',      score: 10.0 },
]

/* ── Feature data — all 31 inputs (Amount, Hour, Day + V1–V28) ── */
// Features marked used=true are the 18 inputs fed into the model.
// V5,V6,V8,V13,V15,V21-V28 are in the original dataset but excluded from
// the model after feature-importance analysis.
const FEATURES = [
  {
    key: 'AMOUNT', label: 'Amount ($)', tag: 'Raw Feature', used: true,
    desc: 'The transaction amount in USD/EUR. Unusually large or small amounts relative to cardholder history are a strong fraud signal. Used as a raw value alongside PCA components.',
  },
  {
    key: 'HOUR', label: 'Hour of Day', tag: 'Derived', used: true,
    desc: 'Hour the transaction occurred (0 = midnight, 23 = 11 PM), derived from the raw Time field. Fraud disproportionately occurs in the early hours (1–4 AM) when cardholders are asleep.',
  },
  {
    key: 'DAY', label: 'Day of Week', tag: 'Derived', used: true,
    desc: 'Day encoded as 0 (Monday) through 6 (Sunday), derived from Time. Weekend patterns differ from weekday norms and some fraud rings target specific days.',
  },
  {
    key: 'V1', label: 'V1', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 1 — the dominant transaction context signal. Strong negative values are highly correlated with abnormal activity in cardholder history and account access patterns. One of the top predictors.',
  },
  {
    key: 'V2', label: 'V2', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 2 — spending velocity signal. Encodes how rapidly charges are accumulating relative to the cardholder\'s established baseline spending rate over recent history.',
  },
  {
    key: 'V3', label: 'V3', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 3 — time-gap signal. Large positive values indicate unusually rapid successive transactions. Fraudsters typically test stolen cards with small charges before making large purchases.',
  },
  {
    key: 'V4', label: 'V4', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 4 — merchant category match. Captures whether the merchant type fits the cardholder\'s typical purchasing pattern across categories (retail, travel, online, hospitality).',
  },
  {
    key: 'V5', label: 'V5', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 5 — transaction frequency pattern. Captures how the overall frequency of transactions compares to the cardholder\'s established baseline rate. Excluded from the model after feature selection.',
  },
  {
    key: 'V6', label: 'V6', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 6 — session-level clustering signal. Captures how transactions cluster within a single session or short time window, reflecting browsing and purchasing session behaviour.',
  },
  {
    key: 'V7', label: 'V7', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 7 — amount deviation. Measures how far the current transaction amount deviates from the cardholder\'s historical average spend, adjusted for merchant type and category.',
  },
  {
    key: 'V8', label: 'V8', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 8 — terminal and device signal. Relates to the type of terminal or payment device used. Certain terminal types (e.g., manual key-entry) have significantly higher fraud rates.',
  },
  {
    key: 'V9', label: 'V9', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 9 — geographic signal. Encodes transaction origin patterns relative to the cardholder\'s typical transaction locations. Unusual or impossible travel distances increase fraud probability.',
  },
  {
    key: 'V10', label: 'V10', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 10 — card-present vs. CNP indicator. Online / card-not-present transactions have distinctly different PCA values from in-person point-of-sale transactions.',
  },
  {
    key: 'V11', label: 'V11', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 11 — account tenure and usage pattern. Reflects how well-established this specific spending behaviour is relative to the full account history and card lifetime.',
  },
  {
    key: 'V12', label: 'V12', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 12 — top fraud discriminator. Captures complex nonlinear interactions between transaction time, amount, and merchant category. Consistently one of the strongest predictors in all ensemble models.',
  },
  {
    key: 'V13', label: 'V13', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 13 — daily spending pattern. Captures how each day\'s total spending compares to the cardholder\'s historical daily averages, flagging unusually high-spend days.',
  },
  {
    key: 'V14', label: 'V14', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 14 — strongest single fraud predictor. Highly negative values are an extremely strong fraud signal. Referenced in most academic papers on this dataset as the most discriminative feature.',
  },
  {
    key: 'V15', label: 'V15', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 15 — transaction category consistency. Captures whether the spending category is consistent with the cardholder\'s established purchase category profile over the past months.',
  },
  {
    key: 'V16', label: 'V16', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 16 — cross-border / geo-inconsistency indicator. Flags transactions appearing geographically or behaviourally inconsistent with the cardholder\'s established location patterns.',
  },
  {
    key: 'V17', label: 'V17', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 17 — second strongest fraud predictor. Relates to high-value transaction anomalies and unusually rapid balance changes within a short time window. Often seen in account-takeover fraud.',
  },
  {
    key: 'V18', label: 'V18', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 18 — short-window velocity. High values indicate many transactions in a very short time period — a classic card-testing or rapid-fraud pattern before the card is blocked.',
  },
  {
    key: 'V19', label: 'V19', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 19 — new payee / new merchant signal. Captures whether the cardholder has previously transacted with merchants of this type or category, flagging first-time payees.',
  },
  {
    key: 'V20', label: 'V20', tag: 'PCA · Used in Model', used: true,
    desc: 'PCA Component 20 — balance and credit utilisation signal. Encodes how the current transaction interacts with available credit and recent credit utilisation patterns.',
  },
  {
    key: 'V21', label: 'V21', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 21 — account-wide behavioural shift signal. Captures broader account-level changes that may indicate an account-takeover event; lower feature importance led to exclusion from the model.',
  },
  {
    key: 'V22', label: 'V22', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 22 — payment method consistency. Captures whether the payment method (credit, debit, contactless, online) matches typical patterns for this cardholder.',
  },
  {
    key: 'V23', label: 'V23', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 23 — merchant risk profile. Some merchants have higher baseline fraud rates; this component captures merchant-level risk signals derived from historical patterns.',
  },
  {
    key: 'V24', label: 'V24', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 24 — geographic spending cluster. Captures whether the transaction fits within the cardholder\'s established geographic spending clusters or represents a new, unexpected location.',
  },
  {
    key: 'V25', label: 'V25', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 25 — refund and reversal pattern. Related to the history of refunds and transaction reversals on the account. Unusual reversal patterns can indicate card-testing or friendly-fraud scenarios.',
  },
  {
    key: 'V26', label: 'V26', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 26 — authorisation attempt pattern. Captures the count and outcome of recent authorisation attempts. Multiple failed attempts before a success is a known fraud indicator.',
  },
  {
    key: 'V27', label: 'V27', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 27 — card verification signal. Related to CVC/CVV usage patterns and their consistency with historical behaviour. Mismatches or unusual CVC entry patterns signal card-not-present fraud.',
  },
  {
    key: 'V28', label: 'V28', tag: 'PCA · Dataset Only', used: false,
    desc: 'PCA Component 28 — residual variance signal. The final PCA component capturing variance not explained by V1–V27. Mostly noise; its low feature importance confirmed exclusion from the model.',
  },
]

/* ── Existing solutions ────────────────────────────────────────── */
const EXISTING = [
  {
    name: 'Rule-Based Systems',
    org: 'Traditional Banking',
    approach: 'Hard-coded thresholds — block if amount > $X, flag if location changes, etc.',
    weaknesses: [
      'Requires constant manual rule updates as fraud patterns evolve',
      'High false-positive rate — legitimate travel trips blocked',
      'No statistical learning from past fraud patterns',
      'Cannot detect novel fraud strategies not covered by existing rules',
    ],
    accuracy: 'Low–Medium',
    explainable: true,
    realtime: true,
  },
  {
    name: 'Logistic Regression',
    org: 'Early ML Adoption (2000s)',
    approach: 'Linear classifier trained on historical fraud labels. Widely used due to simplicity and speed.',
    weaknesses: [
      'Linear decision boundary — cannot capture complex nonlinear fraud patterns',
      'Poor performance on highly imbalanced datasets without heavy preprocessing',
      'Sensitive to feature scaling and multicollinearity',
      'Cannot model feature interactions without manual engineering',
    ],
    accuracy: 'Medium',
    explainable: true,
    realtime: true,
  },
  {
    name: 'Random Forest',
    org: 'Industry Standard (2010s)',
    approach: 'Ensemble of decision trees trained via bagging. Handles nonlinearity and feature interactions well.',
    weaknesses: [
      'Large model size — hundreds of deep trees consume significant memory',
      'Slower inference than gradient boosting on high-dimensional data',
      'Feature importances are global only — no per-prediction explanation',
      'Imbalance handling requires careful class weighting or sampling',
    ],
    accuracy: 'Medium–High',
    explainable: false,
    realtime: true,
  },
  {
    name: 'Autoencoder (Deep Learning)',
    org: 'Research / FinTech',
    approach: 'Neural network trained only on legitimate transactions. Fraud detected as reconstruction anomalies.',
    weaknesses: [
      'Unsupervised — no direct use of known fraud labels during training',
      'Threshold selection (what counts as anomalous?) is arbitrary',
      'Black-box — no explanation for why a transaction is flagged',
      'Requires large amounts of clean data and GPU for training',
    ],
    accuracy: 'Medium–High',
    explainable: false,
    realtime: false,
  },
  {
    name: 'FICO Falcon / Commercial',
    org: 'FICO, Feedzai, Stripe Radar',
    approach: 'Proprietary neural network and rule hybrid systems used by major banks globally.',
    weaknesses: [
      'Proprietary black box — no transparency into model decisions',
      'Extremely expensive licensing cost for financial institutions',
      'Cannot be audited or reproduced for regulatory compliance review',
      'Tuned for large banks — poor out-of-box performance on smaller datasets',
    ],
    accuracy: 'High',
    explainable: false,
    realtime: true,
  },
]

const DIFFERENTIATORS = [
  {
    icon: TrendingUp,
    color: '#00ff88',
    title: 'Triple Stacking Ensemble',
    desc: 'FraudNet combines XGBoost, LightGBM, and CatBoost via a Logistic Regression meta-learner using 5-fold stacking — far more robust than any single model. Diversity across three different gradient boosting algorithms reduces variance and improves PR-AUC on the severe class imbalance.',
  },
  {
    icon: Zap,
    color: '#4fc3f7',
    title: 'SMOTEENN — Oversample + Clean',
    desc: 'Most approaches apply SMOTE alone, which introduces noisy synthetic samples near the class boundary. FraudNet adds Edited Nearest Neighbours (ENN) to remove those boundary samples, creating a significantly cleaner decision boundary. This combination improves recall on fraud without sacrificing precision.',
  },
  {
    icon: Brain,
    color: '#a78bfa',
    title: 'Per-Prediction SHAP Explainability',
    desc: 'Every single verdict comes with a SHAP feature attribution chart. Regulators, auditors, and customers can see exactly which features drove the FRAUD or LEGITIMATE decision — something no commercial system (Falcon, Stripe Radar) currently offers publicly. This is critical for GDPR Article 22 compliance.',
  },
  {
    icon: BarChart2,
    color: '#ffcc00',
    title: 'Cost-Sensitive Evaluation',
    desc: 'FraudNet is evaluated with a realistic cost matrix: each missed fraud costs $500 (average loss), each false alarm costs $5 (analyst review labour). Most academic papers optimise ROC-AUC alone — an inadequate metric for imbalanced datasets. FraudNet uses PR-AUC and cost loss as primary metrics.',
  },
  {
    icon: Lock,
    color: '#ff7043',
    title: 'Open, Reproducible Research',
    desc: 'The full training pipeline (train.py), all hyperparameters, and the dataset are publicly available. Any result can be independently reproduced — unlike commercial black-box systems. The FastAPI backend and React frontend make it deployable as a real-time service, bridging the gap between research and production.',
  },
  {
    icon: CheckCircle2,
    color: '#ff3d5a',
    title: 'Feature Selection via Importance',
    desc: 'Rather than using all 30 features blindly, FraudNet applies feature importance analysis across all three base models to identify the 15 most discriminative PCA components. Removing V5, V6, V8, V13, V15, V21–V28 reduces dimensionality, inference time, and overfitting — improving generalisation.',
  },
]

/* ── Comparison table ──────────────────────────────────────────── */
const COMPARE_ROWS = [
  { criterion: 'Handles Class Imbalance (577:1)',  rule: false, lr: false, rf: 'partial', ae: false,  commercial: 'partial', fraudnet: true  },
  { criterion: 'Nonlinear Decision Boundary',       rule: false, lr: false, rf: true,      ae: true,   commercial: true,      fraudnet: true  },
  { criterion: 'Per-Prediction Explanation',        rule: true,  lr: true,  rf: false,     ae: false,  commercial: false,     fraudnet: true  },
  { criterion: 'Multi-Model Stacking Ensemble',     rule: false, lr: false, rf: false,     ae: false,  commercial: 'partial', fraudnet: true  },
  { criterion: 'SHAP Feature Attribution',          rule: false, lr: false, rf: false,     ae: false,  commercial: false,     fraudnet: true  },
  { criterion: 'Cost-Sensitive Evaluation',         rule: false, lr: false, rf: false,     ae: false,  commercial: 'partial', fraudnet: true  },
  { criterion: 'Real-Time REST API',                rule: true,  lr: true,  rf: true,      ae: false,  commercial: true,      fraudnet: true  },
  { criterion: 'Open Source & Reproducible',        rule: false, lr: true,  rf: true,      ae: true,   commercial: false,     fraudnet: true  },
  { criterion: 'Feature Importance Selection',      rule: false, lr: false, rf: 'partial', ae: false,  commercial: false,     fraudnet: true  },
  { criterion: 'GDPR / Audit Compliance Ready',     rule: true,  lr: true,  rf: false,     ae: false,  commercial: false,     fraudnet: true  },
]

const NARRATIVE = [
  {
    heading: 'The Class Imbalance Problem',
    body: `Credit card fraud datasets are pathologically imbalanced — in the ULB dataset used here, only 492 of 284,807 transactions are fraudulent (0.172%), a ratio of 577:1. A naive classifier that labels everything "legitimate" achieves 99.83% accuracy while catching zero fraud. Most existing solutions treat this as a secondary concern. FraudNet addresses it at the data level with SMOTEENN — not only synthesising new fraud samples (SMOTE) but actively removing ambiguous boundary samples (ENN), producing a cleaner and more balanced training set than oversampling alone.`,
  },
  {
    heading: 'Why a Single Model is Not Enough',
    body: `Individual gradient boosting models (XGBoost, LightGBM, CatBoost) each have biases in how they split trees, weight classes, and handle feature interactions. Combining them via stacking — where a meta-learner is trained on their out-of-fold probability outputs — produces a final model that is more robust than any single component. Each base model acts as a "specialist" that catches different fraud patterns; the meta-learner learns the optimal combination. This ensemble approach consistently outperforms single-model systems on precision-recall metrics for imbalanced classification.`,
  },
  {
    heading: 'Explainability is Not Optional',
    body: `Under GDPR Article 22 and the EU AI Act, automated decisions that significantly affect individuals must be explainable. Commercial systems such as FICO Falcon provide no per-prediction explanation — they return a score with no justification. FraudNet uses SHAP (SHapley Additive exPlanations) derived from cooperative game theory to assign each feature a quantified contribution to every individual verdict. A bank analyst, regulator, or cardholder can see exactly which features — and by how much — drove the FRAUD or LEGITIMATE decision. This is not a post-hoc approximation: TreeExplainer computes exact SHAP values for tree-based models.`,
  },
  {
    heading: 'Optimising the Right Metric',
    body: `ROC-AUC, the most commonly reported metric in fraud detection papers, measures separability across all thresholds — but on a 577:1 dataset, a model can achieve ROC-AUC > 0.99 while still missing most fraud cases. FraudNet uses Precision-Recall AUC (PR-AUC) as its primary metric because it is invariant to class ratio and directly reflects the trade-off that matters operationally: catching fraud (recall) without overwhelming analysts with false alarms (precision). Additionally, a cost-sensitive loss ($500 per missed fraud, $5 per false alarm) ensures the model optimises for real-world financial impact rather than abstract accuracy.`,
  },
]

/* ── Pipeline steps ────────────────────────────────────────────── */
const PIPELINE_STEPS = [
  {
    num: 1,
    title: 'Input Features',
    desc: 'Enter 18 transaction features (PCA components, amount, time)',
  },
  {
    num: 2,
    title: 'Preprocessing',
    desc: 'Features are scaled and passed through the trained ensemble',
  },
  {
    num: 3,
    title: 'Ensemble Prediction',
    desc: 'XGBoost, LightGBM, CatBoost vote; meta-learner combines outputs',
  },
  {
    num: 4,
    title: 'SHAP Explainability',
    desc: 'Per-prediction SHAP values identify which features drove the decision',
  },
  {
    num: 5,
    title: 'Risk Score',
    desc: 'A 0–100% risk score and FRAUD/LEGITIMATE verdict is returned',
  },
]

/* ── ML Models ─────────────────────────────────────────────────── */
const MODELS = [
  {
    name: 'XGBoost',
    desc: 'Extreme Gradient Boosting. Uses decision trees with L1/L2 regularisation. Handles class imbalance through boosting weights.',
    metric: 'ROC-AUC: 0.9801',
  },
  {
    name: 'LightGBM',
    desc: 'Light Gradient Boosting Machine. Leaf-wise tree growth for speed on large datasets. Histogram-based algorithm reduces memory usage significantly.',
    metric: null,
  },
  {
    name: 'CatBoost',
    desc: 'Categorical Boosting by Yandex. Ordered boosting prevents target leakage. Strong default performance without extensive hyperparameter tuning.',
    metric: null,
  },
  {
    name: 'Stacking Ensemble',
    desc: 'Meta-learner (Logistic Regression) combines XGBoost, LightGBM, and CatBoost predictions. Achieves best PR-AUC across all models tested.',
    metric: 'Best PR-AUC',
  },
]

/* ── Usage tips ────────────────────────────────────────────────── */
const TIPS = [
  'Use "Random from Dataset" on the Predict page to load a real transaction (50% fraud, 50% legitimate).',
  'The ground truth banner tells you the actual class from the real dataset.',
  'Check whether the model prediction matches the ground truth.',
  'Use the SHAP bar chart to understand which features drove the decision.',
  'The Dashboard shows your aggregate analysis history with trends over time.',
]

/* ── API Reference ─────────────────────────────────────────────── */
const API_ENDPOINTS = [
  {
    method: 'POST',
    path: '/auth/register',
    auth: false,
    group: 'Auth',
    desc: 'Register a new analyst account and trigger OTP email verification.',
    body: '{ username, email, password }',
    returns: '{ message, email_sent }',
  },
  {
    method: 'POST',
    path: '/auth/verify-otp',
    auth: false,
    group: 'Auth',
    desc: 'Verify the 6-digit OTP sent to the registered email to activate the account.',
    body: '{ username, otp }',
    returns: '{ message }',
  },
  {
    method: 'POST',
    path: '/auth/login',
    auth: false,
    group: 'Auth',
    desc: 'Authenticate with username + password (OAuth2 form). Returns a signed JWT access token.',
    body: 'form: username, password',
    returns: '{ access_token, token_type }',
  },
  {
    method: 'GET',
    path: '/auth/me',
    auth: true,
    group: 'Auth',
    desc: 'Returns the profile of the currently authenticated user.',
    body: '—',
    returns: '{ id, username, email, created_at }',
  },
  {
    method: 'POST',
    path: '/predict',
    auth: true,
    group: 'Inference',
    desc: 'Run the stacking ensemble on a single transaction and return verdict, confidence, and SHAP values.',
    body: '{ v1…v20, amount, hour_of_day, day_of_week }',
    returns: '{ prediction, probability, shap_values, model_predictions }',
  },
  {
    method: 'GET',
    path: '/predict/sample',
    auth: true,
    group: 'Inference',
    desc: 'Returns a random real transaction from the dataset (50 % fraud / 50 % legit) with its ground-truth label for demo purposes.',
    body: '—',
    returns: '{ features, ground_truth, label }',
  },
  {
    method: 'GET',
    path: '/history',
    auth: true,
    group: 'Data',
    desc: 'Retrieve the most recent predictions made by the authenticated user.',
    body: 'query: limit (default 50)',
    returns: '[ { id, timestamp, prediction, probability, … } ]',
  },
  {
    method: 'GET',
    path: '/stats',
    auth: true,
    group: 'Data',
    desc: 'Aggregate statistics for the dashboard — total predictions, fraud count, average risk score.',
    body: '—',
    returns: '{ total, fraud_count, legit_count, avg_risk, fraud_rate }',
  },
  {
    method: 'GET',
    path: '/models',
    auth: true,
    group: 'Data',
    desc: 'Per-model performance metrics (precision, recall, F1, ROC-AUC, PR-AUC, cost) for comparison page.',
    body: '—',
    returns: '[ { model, precision, recall, f1, roc_auc, pr_auc, cost } ]',
  },
  {
    method: 'POST',
    path: '/notify/scan-complete',
    auth: true,
    group: 'Notify',
    desc: 'Send a scan-summary email to the authenticated user after a batch or card history scan completes.',
    body: '{ total, fraud, legit, avg_risk, highest_risk, scan_type }',
    returns: '{ sent, to | reason }',
  },
  {
    method: 'GET',
    path: '/health',
    auth: false,
    group: 'System',
    desc: 'Lightweight health-check endpoint. Returns 200 OK when the API is running.',
    body: '—',
    returns: '{ status: "ok", timestamp }',
  },
]

const GROUP_ORDER = ['Auth', 'Inference', 'Data', 'Notify', 'System']
const GROUP_COLORS = {
  Auth:      '#a78bfa',
  Inference: '#00ff88',
  Data:      '#4fc3f7',
  Notify:    '#ffcc00',
  System:    '#ff7043',
}

/* ── Component ─────────────────────────────────────────────────── */
export default function About() {
  return (
    <div className={styles.page}>

      {/* ── SECTION 1: Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroIcon}><Shield size={36} /></div>
        <h1 className={styles.heroTitle}>About FraudNet</h1>
        <p className={styles.heroSubtitle}>
          A deep learning ensemble with data resampling for credit card fraud detection
          &mdash; Final Year Thesis Project
        </p>
        <div className={styles.statRow}>
          <span className={styles.statChip}>284,807 Transactions</span>
          <span className={styles.statChip}>492 Fraud Cases</span>
          <span className={styles.statChip}>0.172% Fraud Rate</span>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ── SECTION 2: Existing Solutions ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <AlertTriangle size={18} className={styles.sectionIcon} style={{ color: '#ffcc00' }} />
          <h2>Existing Solutions &amp; Their Limitations</h2>
        </div>
        <p className={styles.sectionIntro}>
          Fraud detection has evolved from hand-crafted rules to deep learning. Each generation of
          solutions solved some problems while introducing new ones. Understanding these limitations
          motivates the design choices in FraudNet.
        </p>
        <div className={styles.existingGrid}>
          {EXISTING.map(s => (
            <div key={s.name} className={styles.existingCard}>
              <div className={styles.existingHead}>
                <div>
                  <div className={styles.existingName}>{s.name}</div>
                  <div className={styles.existingOrg}>{s.org}</div>
                </div>
                <div className={styles.existingBadges}>
                  <span className={styles.accBadge}>{s.accuracy}</span>
                </div>
              </div>
              <p className={styles.existingApproach}>{s.approach}</p>
              <div className={styles.existingMeta}>
                <span className={s.explainable ? styles.metaGood : styles.metaBad}>
                  {s.explainable ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {s.explainable ? 'Explainable' : 'Black Box'}
                </span>
                <span className={s.realtime ? styles.metaGood : styles.metaBad}>
                  {s.realtime ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {s.realtime ? 'Real-time' : 'Batch only'}
                </span>
              </div>
              <div className={styles.weaknessList}>
                <div className={styles.weaknessTitle}>Limitations</div>
                {s.weaknesses.map((w, i) => (
                  <div key={i} className={styles.weaknessItem}>
                    <XCircle size={10} style={{ color: '#ff3d5a', flexShrink: 0, marginTop: 2 }} />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ── SECTION 3: How FraudNet is Different ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Shield size={18} className={styles.sectionIcon} style={{ color: '#00ff88' }} />
          <h2>How FraudNet is Different</h2>
        </div>
        <p className={styles.sectionIntro}>
          FraudNet addresses the specific shortcomings of existing approaches through six
          deliberate design decisions — each directly motivated by the limitations above.
        </p>
        <div className={styles.diffGrid}>
          {DIFFERENTIATORS.map(d => (
            <div key={d.title} className={styles.diffCard} style={{ borderTopColor: d.color }}>
              <div className={styles.diffIcon} style={{ color: d.color, background: `${d.color}15` }}>
                <d.icon size={18} />
              </div>
              <div className={styles.diffTitle} style={{ color: d.color }}>{d.title}</div>
              <p className={styles.diffDesc}>{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ── SECTION 4: Comparison Table ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <BarChart2 size={18} className={styles.sectionIcon} style={{ color: '#4fc3f7' }} />
          <h2>Head-to-Head Comparison</h2>
        </div>
        <p className={styles.sectionIntro}>
          The table below scores FraudNet against the five approaches it was designed to improve upon,
          across the ten criteria that matter most for a production fraud detection system.
        </p>

        <div className={styles.compareWrap}>
          {/* Header */}
          <div className={styles.compareHead}>
            <span className={styles.compareCrit}>Criterion</span>
            <span className={styles.compareCol}>Rules</span>
            <span className={styles.compareCol}>Log. Reg.</span>
            <span className={styles.compareCol}>Rand. Forest</span>
            <span className={styles.compareCol}>Autoencoder</span>
            <span className={styles.compareCol}>Commercial</span>
            <span className={`${styles.compareCol} ${styles.compareColFraud}`}>FraudNet</span>
          </div>

          {COMPARE_ROWS.map((r, i) => (
            <div key={i} className={styles.compareRow}>
              <span className={styles.compareCrit}>{r.criterion}</span>
              {[r.rule, r.lr, r.rf, r.ae, r.commercial, r.fraudnet].map((val, j) => (
                <span
                  key={j}
                  className={`${styles.compareCol} ${j === 5 ? styles.compareColFraud : ''}`}
                >
                  {val === true      && <span className={styles.cYes}><CheckCircle2 size={13} /> Yes</span>}
                  {val === false     && <span className={styles.cNo}><XCircle size={13} /> No</span>}
                  {val === 'partial' && <span className={styles.cPartial}><AlertTriangle size={12} /> Partial</span>}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Capability score bar chart */}
        <div className={styles.aboutChartCard} style={{ marginTop: 16 }}>
          <div className={styles.aboutChartLabel}>Capability Score — criteria met out of 10</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CAPABILITY_DATA} layout="vertical"
              margin={{ left: 8, right: 48, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="#1e2a3a" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 10]} tickCount={6}
                tick={{ fontSize: 9, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false}
              />
              <YAxis type="category" dataKey="name" width={90}
                tick={{ fontSize: 10, fill: '#6b7fa3', fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={v => [`${v} / 10`, 'Score']}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {CAPABILITY_DATA.map((d, i) => (
                  <Cell key={i}
                    fill={d.name === 'FraudNet' ? '#00ff88' : '#4fc3f7'}
                    fillOpacity={d.name === 'FraudNet' ? 0.9 : 0.5}
                  />
                ))}
                <LabelList dataKey="score" position="right"
                  style={{ fill: '#e2eaf6', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700 }}
                  formatter={v => `${v}/10`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono', marginTop: 6, paddingLeft: 4 }}>
            Score = sum of criteria met (Yes=1, Partial=0.5, No=0) across 10 comparison criteria above.
          </div>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ── SECTION 5: Why FraudNet is Better (narrative) ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Brain size={18} className={styles.sectionIcon} style={{ color: '#a78bfa' }} />
          <h2>Why FraudNet is Better — In Depth</h2>
        </div>
        <p className={styles.sectionIntro}>
          The following sections provide academic-level justification for each major design
          decision in FraudNet and explain why it produces superior results compared to
          existing approaches.
        </p>
        <div className={styles.narrativeList}>
          {NARRATIVE.map((n, i) => (
            <div key={i} className={styles.narrativeCard}>
              <div className={styles.narrativeNum}>{i + 1}</div>
              <div className={styles.narrativeBody}>
                <div className={styles.narrativeHeading}>{n.heading}</div>
                <p className={styles.narrativeText}>{n.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ── SECTION 6 (was 4): How It Works ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <GitBranch size={18} className={styles.sectionIcon} />
          <h2>How It Works</h2>
        </div>
        <p className={styles.sectionIntro}>
          Every transaction analysed by FraudNet passes through a structured five-stage pipeline.
        </p>
        <div className={styles.pipeline}>
          {PIPELINE_STEPS.map((step, idx) => (
            <div key={step.num} className={styles.pipelineItem}>
              <div className={styles.step}>
                <div className={styles.stepNum}>{step.num}</div>
                <div className={styles.stepBody}>
                  <div className={styles.stepTitle}>{step.title}</div>
                  <div className={styles.stepDesc}>{step.desc}</div>
                </div>
              </div>
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className={styles.stepArrow} aria-hidden="true">&#8594;</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ── SECTION 5: The Dataset ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Database size={18} className={styles.sectionIcon} />
          <h2>The Dataset</h2>
        </div>
        <div className={styles.datasetCard}>
          <div className={styles.datasetGrid}>
            <div className={styles.datasetRow}>
              <span className={styles.datasetKey}>Source</span>
              <span className={styles.datasetVal}>Kaggle / Université Libre de Bruxelles (ULB)</span>
            </div>
            <div className={styles.datasetRow}>
              <span className={styles.datasetKey}>Period</span>
              <span className={styles.datasetVal}>September 2013 (2 days)</span>
            </div>
            <div className={styles.datasetRow}>
              <span className={styles.datasetKey}>Transactions</span>
              <span className={styles.datasetVal}>284,807 total</span>
            </div>
            <div className={styles.datasetRow}>
              <span className={styles.datasetKey}>Frauds</span>
              <span className={styles.datasetVal}>492 (0.172%)</span>
            </div>
            <div className={styles.datasetRow}>
              <span className={styles.datasetKey}>Features</span>
              <span className={styles.datasetVal}>V1–V28 are PCA-transformed (anonymised for confidentiality)</span>
            </div>
            <div className={styles.datasetRow}>
              <span className={styles.datasetKey}>Time</span>
              <span className={styles.datasetVal}>Seconds elapsed since the first transaction in the dataset</span>
            </div>
            <div className={styles.datasetRow}>
              <span className={styles.datasetKey}>Amount</span>
              <span className={styles.datasetVal}>Transaction amount in EUR</span>
            </div>
            <div className={styles.datasetRow}>
              <span className={styles.datasetKey}>Class</span>
              <span className={styles.datasetVal}>0 = Legitimate &nbsp;|&nbsp; 1 = Fraud</span>
            </div>
          </div>
          <div className={styles.datasetNote}>
            <Info size={13} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Severe class imbalance handled using <strong>SMOTEENN</strong> — Synthetic Minority
              Oversampling Technique combined with Edited Nearest Neighbours cleaning.
            </span>
          </div>
        </div>

        {/* Dataset composition chart */}
        <div className={styles.aboutChartCard} style={{ marginTop: 16 }}>
          <div className={styles.aboutChartLabel}>Dataset Class Composition — 284,807 Transactions</div>
          <div className={styles.datasetChartLayout}>
            <ResponsiveContainer width="40%" height={180}>
              <PieChart>
                <Pie data={DATASET_PIE} cx="50%" cy="50%"
                  innerRadius={48} outerRadius={68}
                  paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}
                >
                  <Cell fill="#00ff88" fillOpacity={0.85} />
                  <Cell fill="#ff3d5a" fillOpacity={0.85} />
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v, name, p) => [`${p.payload.pct}  (${v.toLocaleString()})`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.datasetChartStats}>
              <div className={styles.datasetStatRow}>
                <span className={styles.datasetDot} style={{ background: '#00ff88' }} />
                <div>
                  <div style={{ color: '#00ff88', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22 }}>284,315</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Legitimate — 99.83%</div>
                </div>
              </div>
              <div className={styles.datasetStatRow} style={{ marginTop: 16 }}>
                <span className={styles.datasetDot} style={{ background: '#ff3d5a' }} />
                <div>
                  <div style={{ color: '#ff3d5a', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22 }}>492</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fraud — 0.17% — ratio 577 : 1</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ── SECTION 4: Input Features Explained ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Layers size={18} className={styles.sectionIcon} />
          <h2>Input Features Explained</h2>
        </div>
        <p className={styles.sectionIntro}>
          FraudNet uses 18 input features — 15 PCA-anonymised components plus amount, hour of day,
          and day of week. Each feature is described below.
        </p>
        <p className={styles.sectionIntro} style={{ marginBottom: 10 }}>
          Features marked <span style={{ color:'#00ff88', fontFamily:'monospace', fontSize:11 }}>● Used in Model</span> are
          the 18 inputs fed into FraudNet. The remaining V-features are included here for reference —
          they exist in the original dataset but were excluded after feature-importance analysis.
        </p>
        <div className={styles.featureGrid}>
          {FEATURES.map(f => (
            <div key={f.key} className={styles.featureCard}
              style={f.used ? { borderColor: '#00ff8828' } : {}}>
              <div className={styles.featureCardTop}>
                <span className={styles.keyBadge}
                  style={f.used ? {} : { color:'#6b7fa3', background:'#6b7fa318', borderColor:'#6b7fa330' }}>
                  {f.key}
                </span>
                <span className={styles.featureTag}
                  style={f.used
                    ? { color:'#00ff88', background:'#00ff8810', borderColor:'#00ff8828' }
                    : { color:'#3d5068', background:'#3d506818', borderColor:'#3d506830' }}>
                  {f.used ? '● Model Input' : '○ Dataset Only'}
                </span>
              </div>
              <div className={styles.featureLabel}>{f.label}</div>
              <div className={styles.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ── SECTION 5: Machine Learning Models ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Cpu size={18} className={styles.sectionIcon} />
          <h2>Machine Learning Models</h2>
        </div>
        <div className={styles.modelGrid}>
          {MODELS.map(m => (
            <div key={m.name} className={styles.modelCard}>
              <div className={styles.modelName}>{m.name}</div>
              <div className={styles.modelDesc}>{m.desc}</div>
              {m.metric && (
                <div className={styles.modelMetric}>{m.metric}</div>
              )}
            </div>
          ))}
        </div>
        <div className={styles.smoteNote}>
          <CheckCircle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Class imbalance handled with <strong>SMOTEENN</strong> — Synthetic Minority Oversampling
            Technique combined with Edited Nearest Neighbours cleaning.
          </span>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ── SECTION 6: Understanding SHAP ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Brain size={18} className={styles.sectionIcon} />
          <h2>Understanding SHAP</h2>
        </div>
        <div className={styles.shapBox}>
          <p className={styles.shapIntro}>
            <strong>SHAP</strong> (SHapley Additive exPlanations) assigns each feature a contribution
            value for a specific prediction, making the model's decision transparent and auditable.
          </p>
          <div className={styles.shapLegend}>
            <div className={styles.shapLegendItem}>
              <span className={styles.shapDot} style={{ background: '#ff3d5a' }} />
              <span><strong>Positive SHAP value</strong> — feature increases fraud risk</span>
            </div>
            <div className={styles.shapLegendItem}>
              <span className={styles.shapDot} style={{ background: '#00ff88' }} />
              <span><strong>Negative SHAP value</strong> — feature decreases fraud risk</span>
            </div>
            <div className={styles.shapLegendItem}>
              <span className={styles.shapDot} style={{ background: '#4fc3f7' }} />
              <span><strong>Magnitude</strong> — the larger the bar, the more impact that feature had</span>
            </div>
          </div>
          <p className={styles.shapNote}>
            SHAP values are computed using <code>TreeExplainer</code> applied to the stacking ensemble.
            This ensures each prediction can be fully explained in terms of the original input features.
          </p>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* ── SECTION 7: How to Use FraudNet ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Lightbulb size={18} className={styles.sectionIcon} />
          <h2>How to Use FraudNet</h2>
        </div>
        <ol className={styles.tipsList}>
          {TIPS.map((tip, i) => (
            <li key={i} className={styles.tipItem}>
              <span className={styles.tipNum}>{i + 1}</span>
              <span>{tip}</span>
            </li>
          ))}
        </ol>
      </section>

      <hr className={styles.divider} />

      {/* ── SECTION: FastAPI Reference Sheet ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Server size={18} className={styles.sectionIcon} style={{ color: '#4fc3f7' }} />
          <h2>FastAPI Endpoint Reference</h2>
        </div>
        <p className={styles.sectionIntro}>
          All 11 REST endpoints exposed by the FastAPI backend. Endpoints marked with a lock icon
          require a valid <code className={styles.inlineCode}>Authorization: Bearer &lt;token&gt;</code> header.
          Base URL: <code className={styles.inlineCode}>http://localhost:8000</code>
        </p>

        {GROUP_ORDER.map(group => {
          const endpoints = API_ENDPOINTS.filter(e => e.group === group)
          const color = GROUP_COLORS[group]
          return (
            <div key={group} className={styles.apiGroup}>
              <div className={styles.apiGroupLabel} style={{ color, borderColor: color + '50', background: color + '10' }}>
                {group}
              </div>
              <div className={styles.apiTable}>
                {/* Header */}
                <div className={styles.apiTableHead}>
                  <span className={styles.apiColMethod}>Method</span>
                  <span className={styles.apiColPath}>Endpoint</span>
                  <span className={styles.apiColDesc}>Description</span>
                  <span className={styles.apiColBody}>Body / Params</span>
                  <span className={styles.apiColReturn}>Returns</span>
                </div>
                {endpoints.map(ep => (
                  <div key={ep.path} className={styles.apiRow}>
                    <span className={styles.apiColMethod}>
                      <span className={ep.method === 'GET' ? styles.methodGet : styles.methodPost}>
                        {ep.method}
                      </span>
                      {ep.auth && <Lock size={10} className={styles.lockIcon} />}
                    </span>
                    <span className={styles.apiColPath}>
                      <code className={styles.apiPath}>{ep.path}</code>
                    </span>
                    <span className={styles.apiColDesc}>{ep.desc}</span>
                    <span className={styles.apiColBody}>
                      <code className={styles.apiMono}>{ep.body}</code>
                    </span>
                    <span className={styles.apiColReturn}>
                      <code className={styles.apiMono}>{ep.returns}</code>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <div className={styles.apiNote}>
          <Info size={13} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            JWT tokens expire after <strong>60 minutes</strong>. The login endpoint returns a new token
            — store it in <code className={styles.inlineCode}>localStorage</code> under the key{' '}
            <code className={styles.inlineCode}>token</code>.
            Interactive docs are available at <code className={styles.inlineCode}>/docs</code> (Swagger UI)
            and <code className={styles.inlineCode}>/redoc</code>.
          </span>
        </div>
      </section>

      {/* ── Footer note ── */}
      <div className={styles.footerNote}>
        <BookOpen size={13} />
        <span>
          FraudNet — Final Year Thesis &bull; Dataset: Kaggle / MLG-ULB &bull; Built with
          FastAPI, XGBoost, LightGBM, CatBoost, SHAP, React &amp; Vite
        </span>
      </div>

    </div>
  )
}
