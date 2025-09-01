import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white">
              QLD Safety Monitor
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Comprehensive safety monitoring for Queensland. Track traffic incidents, 
              emergency situations, suspicious activity, crime alerts, and community safety reports.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-blue-600 dark:text-blue-400 text-3xl mb-4">🚗</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Traffic & Road Safety</h3>
              <p className="text-gray-600 dark:text-gray-300">Track accidents, road closures, hazards, and traffic restrictions across Queensland in real-time.</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-red-600 dark:text-red-400 text-3xl mb-4">🚨</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Emergency & Crime Alerts</h3>
              <p className="text-gray-600 dark:text-gray-300">Monitor emergency incidents, crime reports, and suspicious activity from official sources and community reports.</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-purple-600 dark:text-purple-400 text-3xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Community Reports</h3>
              <p className="text-gray-600 dark:text-gray-300">Report and view community-submitted safety concerns, suspicious behavior, and local hazards.</p>
            </div>
          </div>
          
          <div className="mt-12">
            <Button 
              size="lg" 
              className="px-8 py-3 text-lg"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Sign In to Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}