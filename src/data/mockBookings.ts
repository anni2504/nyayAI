export interface BookingConsultation {
  id: string;
  clientId: string;
  clientName: string;
  advocateId: string;
  advocateName: string;
  advocateAvatar: string;
  date: string;
  timeSlot: string;
  matterTitle: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  fee: string;
  videoLink?: string;
}

export const mockBookingsList: BookingConsultation[] = [
  {
    id: 'bk-501',
    clientId: 'client-1',
    clientName: 'Rohan Sharma',
    advocateId: 'lawyer-1',
    advocateName: 'Adv. Rajesh Varma',
    advocateAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
    date: 'Tomorrow, Aug 27',
    timeSlot: '4:30 PM - 5:00 PM',
    matterTitle: 'Neighbour Boundary Dispute & Injunction Order',
    status: 'upcoming',
    fee: '₹3,500',
    videoLink: 'https://nyay.ai/meet/v-8821-roy'
  },
  {
    id: 'bk-502',
    clientId: 'client-1',
    clientName: 'Rohan Sharma',
    advocateId: 'lawyer-2',
    advocateName: 'Adv. Vikramaditya Singhania',
    advocateAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    date: 'Aug 20, 2026',
    timeSlot: '2:00 PM - 2:30 PM',
    matterTitle: 'RERA Form N Consultation',
    status: 'completed',
    fee: '₹4,000'
  }
];
