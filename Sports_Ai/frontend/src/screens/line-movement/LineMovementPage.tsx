import { Layout } from '../../components/Layout';

export function LineMovementPage() {
  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Line Movement Charts</h1>
            <p className="text-gray-400 mt-2">Track odds movement across all major sportsbooks</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Today's Line Movements</h2>
              <div className="flex space-x-2">
                <button className="px-3 py-1.5 bg-green-500/20 text-green-400 text-sm rounded-lg">NFL</button>
                <button className="px-3 py-1.5 bg-gray-700 text-gray-400 text-sm rounded-lg">NBA</button>
                <button className="px-3 py-1.5 bg-gray-700 text-gray-400 text-sm rounded-lg">MLB</button>
              </div>
            </div>

            {/* Mock chart area */}
            <div className="h-64 bg-gray-700/50 rounded-lg flex items-center justify-center mb-6">
              <span className="text-gray-400">Line movement chart visualization</span>
            </div>

            {/* Movement summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">+2.5</div>
                <div className="text-sm text-gray-400">Biggest Move (Chiefs)</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">87%</div>
                <div className="text-sm text-gray-400">Sharp Money %</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">156</div>
                <div className="text-sm text-gray-400">Lines Tracked</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
