import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import POS from './pages/POS'
import Inventory from './pages/Inventory'
import Members from './pages/Members'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Invoice from './pages/Invoice'
import History from './pages/History'
import Expenses from './pages/Expenses'

import { supabase } from './lib/supabase'

function App() {
  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center border border-red-100 dark:border-red-900/30">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Setup Required</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Supabase configuration is missing. Please create a <code>.env</code> file in the project root with your Supabase credentials.
          </p>
          <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg text-left text-sm font-mono overflow-x-auto mb-6 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 mb-2">.env</p>
            <p className="text-slate-800 dark:text-slate-300">VITE_SUPABASE_URL=your_project_url</p>
            <p className="text-slate-800 dark:text-slate-300">VITE_SUPABASE_ANON_KEY=your_anon_key</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-primary/30"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/invoice" element={<Invoice />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="pos" element={<POS />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="members" element={<Members />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="history" element={<History />} /> {/* Added */}
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
