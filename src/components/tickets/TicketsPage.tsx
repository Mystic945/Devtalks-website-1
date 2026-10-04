import { useScrollAnimations } from '@/hooks/useScrollAnimations';
import { Tickets } from '@/components/Tickets';

export default function TicketsPage() {
  useScrollAnimations(true);

  return (
    <div className="page-body tickets-page">
      <Tickets />
    </div>
  );
}