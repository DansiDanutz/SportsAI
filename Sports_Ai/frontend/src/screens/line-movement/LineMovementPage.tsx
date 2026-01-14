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
            <h2 className="text-xl font-semibold text-white mb-2">Line Movements</h2>
            <p className="text-gray-400">
              Line movement charts are not available yet.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              We intentionally do not display simulated charts or placeholder stats.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
