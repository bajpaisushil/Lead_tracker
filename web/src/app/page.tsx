import { AppHeader } from '@/components/app-header';
import { LeadsDashboard } from '@/features/leads/components/leads-dashboard';

export default function DashboardPage() {
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <LeadsDashboard />
      </main>
    </div>
  );
}
