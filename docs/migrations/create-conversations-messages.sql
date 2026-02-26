-- Uygulama içi mesajlaşma: Müşteri ↔ Restoran (rezervasyon bazlı).
-- Mesajlaşma sadece reservation.status IN ('pending','confirmed') iken açık.
-- Supabase SQL Editor'da çalıştırın. RLS: docs/migrations/rls-conversations-messages.sql

-- 1) conversations: rezervasyon başına tek sohbet
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reservation_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_reservation ON conversations(reservation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_restaurant ON conversations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);

COMMENT ON TABLE conversations IS 'Rezervasyon bazlı sohbet; her rezervasyon için en fazla bir conversation.';

-- 2) messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'restaurant')),
  sender_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at_user TIMESTAMPTZ,
  read_at_restaurant TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(conversation_id, created_at DESC);

COMMENT ON TABLE messages IS 'Sohbet mesajları. read_at_user: müşteri okudu; read_at_restaurant: restoran okudu.';

-- Realtime: Supabase Dashboard > Database > Replication > messages tablosunu açın (INSERT için).

-- 3) restaurant_staff: restoran kullanıcı eşlemesi (admin panel; ileride genişletilebilir)
CREATE TABLE IF NOT EXISTS restaurant_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_staff_restaurant ON restaurant_staff(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_user ON restaurant_staff(user_id);

COMMENT ON TABLE restaurant_staff IS 'Restoran personel eşlemesi; RLS ile restoran tarafı erişimi. Owner için businesses.owner_id kullanılabilir.';
