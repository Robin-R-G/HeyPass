'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">📡</div>
        <h1 className="text-3xl font-bold text-white">You're Offline</h1>
        <p className="text-slate-400">
          No internet connection. Some features may be limited.
        </p>
        <div className="space-y-3">
          <div className="bg-slate-800 rounded-lg p-4 text-left">
            <h3 className="font-medium text-white mb-2">Available Offline:</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• View cached pages</li>
              <li>• Queue scans for sync</li>
              <li>• View recent data</li>
            </ul>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-left">
            <h3 className="font-medium text-white mb-2">Unavailable Offline:</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Real-time updates</li>
              <li>• New registrations</li>
              <li>• Certificate generation</li>
            </ul>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
