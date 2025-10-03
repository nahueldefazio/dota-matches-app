import React, { useState } from 'react'
import DotaMatches from './components/DotaMatches'
import SteamAuthTest from './components/SteamAuthTest'
import APIDebug from './components/APIDebug'

function App() {
  const [currentView, setCurrentView] = useState('main') // main, test, debug

  const getViewComponent = () => {
    switch (currentView) {
      case 'test': return <SteamAuthTest />;
      case 'debug': return <APIDebug />;
      default: return <DotaMatches />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Botones para alternar entre vistas */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setCurrentView(currentView === 'main' ? 'test' : 'main')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentView === 'test'
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {currentView === 'test' ? '📊 App Principal' : '🧪 Test Steam Auth'}
        </button>
        
        <button
          onClick={() => setCurrentView(currentView === 'debug' ? 'main' : 'debug')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentView === 'debug'
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
        >
          {currentView === 'debug' ? '📊 App Principal' : '🔧 Debug APIs'}
        </button>
      </div>

      {getViewComponent()}
    </div>
  )
}

export default App
