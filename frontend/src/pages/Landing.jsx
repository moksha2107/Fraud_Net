import { Link } from 'react-router-dom'
import styles from './Landing.module.css'
import LogoIcon from '../components/LogoIcon.jsx'

const FEATURES = [
  {
    icon: '🧠',
    color: 'green',
    title: 'Stacking Ensemble',
    desc: 'XGBoost, LightGBM, and CatBoost run in parallel as base learners. A Logistic Regression meta-learner fuses their outputs into a single high-confidence fraud probability.',
  },
  {
    icon: '⚡',
    color: 'blue',
    title: 'Real-Time Inference',
    desc: 'End-to-end prediction latency under 200 ms on CPU. Submit 11 PCA-transformed transaction features and receive an instant verdict with confidence score.',
  },
  {
    icon: '⚖️',
    color: 'purple',
    title: 'SMOTEENN Resampling',
    desc: 'Handles the extreme 0.172% fraud rate. SMOTE generates synthetic minority samples; ENN removes borderline majority samples to produce a balanced, cleaner decision boundary.',
  },
  {
    icon: '🔍',
    color: 'yellow',
    title: 'SHAP Explainability',
    desc: 'Every prediction ships with ranked SHAP feature attributions. Analysts see exactly which V-components drove the fraud decision — not just a black-box score.',
  },
  {
    icon: '🔐',
    color: 'red',
    title: 'Secure by Design',
    desc: 'Two-step registration with email OTP verification. Passwords stored as bcrypt hashes. JWT sessions expire in 60 minutes. Built for multi-analyst deployments.',
  },
  {
    icon: '📊',
    color: 'orange',
    title: 'Performance Analytics',
    desc: 'Compare Accuracy, Precision, Recall, F1, Sensitivity, Specificity and ROC-AUC across 8 model architectures evaluated on 284,807 European cardholder transactions.',
  },
]

const FRAUD_FACTS = [
  {
    icon: '💸',
    title: '$32 Billion Lost Annually',
    desc: 'Global credit card fraud losses exceeded $32 billion in 2023 and are projected to surpass $43 billion by 2026, according to the Nilson Report.',
  },
  {
    icon: '📉',
    title: 'Only 0.172% of Transactions Are Fraud',
    desc: 'The extreme class imbalance — 492 fraud cases out of 284,807 transactions — makes standard classifiers near-useless without proper resampling techniques like SMOTEENN.',
  },
  {
    icon: '🎭',
    title: 'Card-Not-Present Fraud Dominates',
    desc: 'Over 80% of modern card fraud occurs in online (card-not-present) transactions, where physical card possession is not required and verification is harder.',
  },
  {
    icon: '⏱️',
    title: 'Speed Is Critical',
    desc: 'Fraudsters complete unauthorized transactions in minutes. Real-time detection systems must classify transactions in under 300 ms to flag and block fraud before settlement.',
  },
  {
    icon: '🏦',
    title: 'Banks Bear the Cost',
    desc: 'Under zero-liability policies, financial institutions absorb fraudulent charges. Each undetected fraud (false negative) costs an average of $500 in chargebacks and fees.',
  },
  {
    icon: '🤖',
    title: 'ML Outperforms Rules',
    desc: 'Traditional rule-based systems trigger 10–15× more false positives than ML models, locking out legitimate customers. Gradient boosting ensembles reduce false positives by ~60%.',
  },
]

const MODELS = [
  { name: 'XGBoost',          badge: 'green',  precision: '0.8197', recall: '0.8571', f1: '0.8380', auc: '0.9701', prauc: '0.8221', best: false },
  { name: 'LightGBM',         badge: 'blue',   precision: '0.8088', recall: '0.8673', f1: '0.8370', auc: '0.9712', prauc: '0.8334', best: false },
  { name: 'CatBoost',         badge: 'purple', precision: '0.8354', recall: '0.8571', f1: '0.8461', auc: '0.9698', prauc: '0.8267', best: false },
  { name: 'Stacking ★',      badge: 'green',  precision: '0.8534', recall: '0.8878', f1: '0.8703', auc: '0.9760', prauc: '0.8499', best: true  },
]

const STACK = [
  ['Python 3.11', 'blue'], ['FastAPI', 'green'], ['XGBoost 2.0', 'purple'],
  ['LightGBM 4.3', 'purple'], ['CatBoost 1.2', 'purple'], ['scikit-learn', 'blue'],
  ['SHAP 0.45', 'yellow'], ['SMOTEENN', 'yellow'], ['SQLite', 'green'],
  ['bcrypt', 'red'], ['JWT Auth', 'red'], ['React 18', 'blue'],
]

export default function Landing() {
  return (
    <div className={styles.page}>

      {/* ── Navbar ── */}
      <nav className={styles.nav}>
        <Link to="/" className={styles.navLogo}>
          <div className={styles.navMark}><LogoIcon size={22} color="#00ff88" /></div>
          <span className={styles.navBrand}>FRAUD<span>NET</span></span>
        </Link>
        <ul className={styles.navLinks}>
          <li><a href="#features">Features</a></li>
          <li><a href="#fraud-facts">About Fraud</a></li>
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#models">Models</a></li>
        </ul>
        <div className={styles.navCta}>
          <Link to="/login"    className={styles.btnOutline}>Sign In</Link>
          <Link to="/register" className={styles.btnPrimary}>Get Started →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroScan} />

        <div className={styles.heroBadge}>
          <span className={styles.heroBadgeDot} />
          AI-Powered Credit Card Fraud Intelligence
        </div>

        <h1 className={styles.heroTitle}>
          Detect Fraud with<br /><span>Deep Learning Precision</span>
        </h1>

        <p className={styles.heroSub}>
          A stacking ensemble of XGBoost, LightGBM and CatBoost trained on 284,807
          real transactions with SMOTEENN resampling — achieving <strong style={{ color: 'var(--green)' }}>88.78% recall</strong> and
          per-prediction SHAP explanations in under 200 ms.
        </p>

        <div className={styles.heroCtas}>
          <Link to="/register" className={styles.btnPrimaryLg}>🚀 Start Free Analysis</Link>
          <Link to="/login"    className={styles.btnOutlineLg}>Sign In to Dashboard</Link>
        </div>

        {/* Terminal preview card */}
        <div className={styles.terminalCard}>
          <div className={styles.terminalBar}>
            <div className={styles.terminalDot} />
            <div className={styles.terminalDot} />
            <div className={styles.terminalDot} />
            <span className={styles.terminalTitle}>fraudnet — transaction_analysis</span>
          </div>
          <div className={styles.terminalBody}>
            <div className={`${styles.termLine} ${styles.cmd}`}>$ fraudnet predict --V14=-4.72 --V4=1.21 --Amount=149.62 ...</div>
            <div className={`${styles.termLine} ${styles.info}`}>⟳  Loading stacking ensemble (XGB + LGB + CatBoost)...</div>
            <div className={`${styles.termLine} ${styles.ok}`}>✓  XGBoost    p(fraud) = 0.9821</div>
            <div className={`${styles.termLine} ${styles.ok}`}>✓  LightGBM   p(fraud) = 0.9745</div>
            <div className={`${styles.termLine} ${styles.ok}`}>✓  CatBoost   p(fraud) = 0.9889</div>
            <div className={`${styles.termLine} ${styles.ok}`}>✓  Meta-learner (LR)  p(fraud) = 0.9745</div>
            <div className={`${styles.termLine} ${styles.warn}`}>⚠  VERDICT: FRAUDULENT  [ confidence 97.4% ]</div>
            <div className={`${styles.termLine} ${styles.dim}`}>   Top SHAP signal → V14: −0.82 (strongest fraud indicator)</div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <div className={styles.statsStrip}>
        <div className={styles.statItem}>
          <span className={`${styles.statNum} ${styles.green}`}>284K+</span>
          <div className={styles.statLbl}>Transactions Analysed</div>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statNum} ${styles.blue}`}>88.78%</span>
          <div className={styles.statLbl}>Fraud Recall Rate</div>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statNum} ${styles.red}`}>0.172%</span>
          <div className={styles.statLbl}>Dataset Fraud Rate</div>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statNum} ${styles.yellow}`}>180 ms</span>
          <div className={styles.statLbl}>Avg Inference Time</div>
        </div>
      </div>

      {/* ── Platform Features ── */}
      <section className={styles.section} id="features">
        <div className={styles.sectionEyebrow}>Platform Features</div>
        <h2 className={styles.sectionTitle}>Everything you need for <span>fraud intelligence</span></h2>
        <p className={styles.sectionSub}>
          A production-ready fraud detection platform with state-of-the-art ML,
          per-prediction explainability, and enterprise-grade authentication — all open source.
        </p>
        <div className={styles.featGrid}>
          {FEATURES.map(f => (
            <div className={styles.featCard} key={f.title}>
              <div className={`${styles.featIcon} ${styles[f.color]}`}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Credit Card Fraud Facts ── */}
      <section className={styles.factsBand} id="fraud-facts">
        <div className={styles.section} style={{ padding: 0, maxWidth: 1120 }}>
          <div className={styles.sectionEyebrow}>Credit Card Fraud — The Problem</div>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.9rem' }}>
            Why accurate detection <span>matters</span>
          </h2>
          <p className={styles.sectionSub}>
            Credit card fraud is a global financial epidemic affecting millions of cardholders
            and costing financial institutions tens of billions each year.
          </p>
          <div className={styles.factsList}>
            {FRAUD_FACTS.map(f => (
              <div className={styles.factCard} key={f.title}>
                <div className={styles.factBullet}>{f.icon}</div>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className={styles.section} id="how-it-works">
        <div className={styles.sectionEyebrow}>How It Works</div>
        <h2 className={styles.sectionTitle}>Three steps to <span>instant detection</span></h2>
        <p className={styles.sectionSub}>
          From raw transaction features to an explainable fraud verdict in under 200 ms.
        </p>
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>1</div>
            <h3>Submit Transaction Features</h3>
            <p>Enter the 11 PCA-transformed V-components from a transaction record. The form provides guidance on typical value ranges (−30 to +30) for each feature.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>2</div>
            <h3>Ensemble Inference</h3>
            <p>XGBoost, LightGBM, and CatBoost run in parallel. A Logistic Regression meta-learner fuses their probability outputs into a single, calibrated fraud score.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>3</div>
            <h3>Explainable Verdict</h3>
            <p>Receive a FRAUDULENT / LEGITIMATE verdict with confidence score and a ranked list of SHAP feature attributions showing which inputs drove the decision.</p>
          </div>
        </div>
      </section>

      {/* ── Model Performance ── */}
      <section className={styles.section} id="models" style={{ paddingTop: 0 }}>
        <div className={styles.sectionEyebrow}>Model Performance</div>
        <h2 className={styles.sectionTitle}>Stacking Ensemble <span>leads every metric</span></h2>
        <p className={styles.sectionSub}>
          Evaluated on the Kaggle ULB dataset with a stratified 80/20 split.
          PR-AUC is the primary metric for imbalanced classification.
        </p>
        <table className={styles.modelsTable}>
          <thead>
            <tr>
              <th>Model</th>
              <th>Precision</th>
              <th>Recall</th>
              <th>F1</th>
              <th>ROC-AUC</th>
              <th>PR-AUC</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map(m => (
              <tr key={m.name} className={m.best ? styles.best : ''}>
                <td>
                  <span className={`${styles.chip} ${styles[m.badge]}`}>{m.name}</span>
                </td>
                <td>{m.precision}</td>
                <td>{m.recall}</td>
                <td>{m.f1}</td>
                <td>{m.auc}</td>
                <td><strong>{m.prauc}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: '0.75rem' }}>
          Cost metric: FN × $500 + FP × $5 &nbsp;·&nbsp; Stacking Ensemble achieves lowest total cost of $5,710
        </p>
      </section>

      {/* ── Tech Stack ── */}
      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.sectionEyebrow}>Technology Stack</div>
        <h2 className={styles.sectionTitle}>Built with <span>production-grade</span> tools</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1.5rem' }}>
          {STACK.map(([label, color]) => (
            <span key={label} className={`${styles.chip} ${styles[color]}`}>{label}</span>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaBand}>
        <h2>Start detecting fraud <span>today</span></h2>
        <p>
          Create your free analyst account in seconds. No credit card required.
          Your fraud detection dashboard will be ready immediately.
        </p>
        <div className={styles.ctaBtns}>
          <Link to="/register" className={styles.btnPrimaryLg}>Create Free Account →</Link>
          <Link to="/login"    className={styles.btnOutlineLg}>Sign In</Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <Link to="/" className={styles.footerBrand}>
          <LogoIcon size={16} color="#00ff88" style={{ marginRight: 6 }} /> FRAUD<span>NET</span>
        </Link>
        <ul className={styles.footerLinks}>
          <li><Link to="/register">Register</Link></li>
          <li><Link to="/login">Sign In</Link></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#models">Models</a></li>
        </ul>
        <div className={styles.footerRight}>© 2026 FraudNet</div>
      </footer>

    </div>
  )
}
