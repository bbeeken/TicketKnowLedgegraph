import { AppLayout } from '@/components/layout/AppLayout';
import { EnhancedTicketList } from '@/components/tickets/EnhancedTicketList';

export default function TicketsPage() {
  return (
    <AppLayout>
      <EnhancedTicketList showCreateButton={true} />
    </AppLayout>
  );
}
