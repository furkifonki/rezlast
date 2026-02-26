-- RLS: conversations ve messages. create-conversations-messages.sql sonrası çalıştırın.

-- ========== conversations ==========
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Müşteri: sadece kendi sohbetleri
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (user_id = auth.uid());

-- Restoran: sadece kendi işletmesine ait sohbetler (owner veya restaurant_staff)
DROP POLICY IF EXISTS "Restaurant can view own conversations" ON conversations;
CREATE POLICY "Restaurant can view own conversations"
  ON conversations FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
      UNION
      SELECT restaurant_id FROM restaurant_staff WHERE user_id = auth.uid()
    )
  );

-- Müşteri: sadece kendi user_id ile insert (rezervasyon sahibi olmalı; RLS ile rezervasyon kontrolü ayrı fonksiyonda)
DROP POLICY IF EXISTS "Users can insert own conversation" ON conversations;
CREATE POLICY "Users can insert own conversation"
  ON conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Restoran insert yapmaz; conversation müşteri veya sistem açar.

-- Update: last_message_at güncellemesi (trigger ile yapılabilir; gerekirse policy)
DROP POLICY IF EXISTS "Users can update own conversation" ON conversations;
CREATE POLICY "Users can update own conversation"
  ON conversations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Restaurant can update own conversation" ON conversations;
CREATE POLICY "Restaurant can update own conversation"
  ON conversations FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
      UNION
      SELECT restaurant_id FROM restaurant_staff WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (true);

-- ========== messages ==========
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Select: ilgili conversation'a erişimi olanlar
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Restaurant can view messages in own conversations" ON messages;
CREATE POLICY "Restaurant can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.restaurant_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()
          UNION
          SELECT restaurant_id FROM restaurant_staff WHERE user_id = auth.uid()
        )
    )
  );

-- Insert: conversation'a erişimi olan ve sender_type/sender_id tutarlı
DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON messages;
CREATE POLICY "Users can insert messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_type = 'user'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Restaurant can insert messages in own conversations" ON messages;
CREATE POLICY "Restaurant can insert messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_type = 'restaurant'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.restaurant_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()
          UNION
          SELECT restaurant_id FROM restaurant_staff WHERE user_id = auth.uid()
        )
    )
  );

-- Update: read_at_* işaretleme (karşı taraf kendi read_at sütununu günceller)
DROP POLICY IF EXISTS "Users can update read_at_user" ON messages;
CREATE POLICY "Users can update read_at_user"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "Restaurant can update read_at_restaurant" ON messages;
CREATE POLICY "Restaurant can update read_at_restaurant"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.restaurant_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()
          UNION
          SELECT restaurant_id FROM restaurant_staff WHERE user_id = auth.uid()
        )
    )
  )
  WITH CHECK (true);

-- ========== restaurant_staff ==========
ALTER TABLE restaurant_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant owner can manage staff" ON restaurant_staff;
CREATE POLICY "Restaurant owner can manage staff"
  ON restaurant_staff FOR ALL
  USING (
    restaurant_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    restaurant_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- Realtime için messages tablosunda REPLICA IDENTITY FULL (opsiyonel; yeni mesajlar anlık gelsin)
-- ALTER TABLE messages REPLICA IDENTITY FULL;
