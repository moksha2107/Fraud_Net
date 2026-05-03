import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Landing     from './pages/Landing.jsx'
import Login       from './pages/Login.jsx'
import Register    from './pages/Register.jsx'
import Dashboard   from './pages/Dashboard.jsx'
import Predict     from './pages/Predict.jsx'
import Analyze     from './pages/Analyze.jsx'
import Models      from './pages/Models.jsx'
import History     from './pages/History.jsx'
import About       from './pages/About.jsx'
import Algorithm   from './pages/Algorithm.jsx'
import Batch       from './pages/Batch.jsx'
import Compare     from './pages/Compare.jsx'
import Monitor     from './pages/Monitor.jsx'
import TxnHistory  from './pages/TxnHistory.jsx'
import Diagrams    from './pages/Diagrams.jsx'
import Layout      from './components/Layout.jsx'

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1117',
            color: '#e6edf3',
            border: '1px solid #21262d',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13px',
          },
        }}
      />
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/"         element={<Landing />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── Protected app routes ── */}
        <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index            element={<Dashboard />} />
          <Route path="predict"   element={<Predict />} />
          <Route path="analyze"   element={<Analyze />} />
          <Route path="models"    element={<Models />} />
          <Route path="history"    element={<History />} />
          <Route path="about"      element={<About />} />
          <Route path="algorithm"  element={<Algorithm />} />
          <Route path="batch"      element={<Batch />} />
          <Route path="compare"    element={<Compare />} />
          <Route path="monitor"    element={<Monitor />} />
          <Route path="txnhistory" element={<TxnHistory />} />
          <Route path="diagrams"   element={<Diagrams />} />
        </Route>

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
