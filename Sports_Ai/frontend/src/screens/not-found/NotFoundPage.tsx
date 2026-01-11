import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';

export function NotFoundPage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="text-8xl font-bold text-gray-700 mb-4">404</div>
          <div className="text-6xl mb-4">🔍</div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-white mb-4">Page Not Found</h1>
        <p className="text-gray-400 text-lg mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link
            to="/home"
            className="px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
          >
            Go to Home
          </Link>
          <Link
            to="/sports"
            className="px-6 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
          >
            Browse Sports
          </Link>
        </div>

        {/* Additional Help */}
        <div className="mt-12 text-gray-500 text-sm">
          <p>Looking for something specific?</p>
          <div className="flex gap-4 mt-2 justify-center">
            <Link to="/arbitrage" className="text-green-500 hover:text-green-400 transition-colors">
              Arbitrage
            </Link>
            <span>•</span>
            <Link to="/favorites" className="text-green-500 hover:text-green-400 transition-colors">
              Favorites
            </Link>
            <span>•</span>
            <Link to="/settings" className="text-green-500 hover:text-green-400 transition-colors">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
