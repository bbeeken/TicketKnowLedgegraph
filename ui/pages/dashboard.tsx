import { AppLayout } from '@/components/layout/AppLayout';
import { BeautifulDashboard } from '@/components/dashboard/BeautifulDashboard';
import { AIChatBot } from '@/components/ai/AIChatBot';

export default function DashboardPage() {
  return (
    <AppLayout>
      <BeautifulDashboard />
      <AIChatBot />
    </AppLayout>
  );
}