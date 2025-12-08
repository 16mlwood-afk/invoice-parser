import { Suspense } from 'react';
import { DashboardContent } from './dashboard-content';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Processing Dashboard</h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Loading dashboard...
            </p>
          </header>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
