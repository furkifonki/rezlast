export type SenderType = 'user' | 'restaurant';

export type Conversation = {
  id: string;
  reservation_id: string;
  restaurant_id: string;
  user_id: string;
  status: 'open' | 'closed';
  last_message_at: string | null;
  created_at: string;
  reservations?: {
    reservation_date: string;
    reservation_time: string;
    status: string;
    businesses: { name: string } | null;
  } | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id: string;
  text: string;
  created_at: string;
  read_at_user: string | null;
  read_at_restaurant: string | null;
};

export type ConversationWithMeta = Conversation & {
  businessName?: string;
  reservationDate?: string;
  reservationTime?: string;
  unreadCount?: number;
  lastMessageText?: string | null;
};
