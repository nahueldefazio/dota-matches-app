import React, { useState } from 'react'
import DotaMatches from './components/DotaMatches'
import SteamAuthTest from './components/SteamAuthTest'

function App() {
  const [showTest, setShowTest] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Botón para alternar entre vista principal y test */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowTest(!showTest)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showTest 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {showTest ? '📊 Ver App Principal' : '🧪 Test Steam Auth'}
        </button>
      </div>

      {showTest ? <SteamAuthTest /> : <DotaMatches />}
    </div>
  )
}

export default App
