import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Review = { id: string; user_id: string; rating: number; comment: string | null; created_at: string };

type Props = {
  businessId: string;
  businessName: string;
  onBack: () => void;
};

export default function BusinessReviewsScreen({ businessId, businessName, onBack }: Props) {
  const { session } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    if (!supabase || !businessId) return;
    let q = supabase.from('reviews').select('id, user_id, rating, comment, created_at').eq('business_id', businessId);
    if (reviewSort === 'newest') q = q.order('created_at', { ascending: false });
    else if (reviewSort === 'highest') q = q.order('rating', { ascending: false });
    else q = q.order('rating', { ascending: true });
    const { data } = await q;
    setReviews((data ?? []) as Review[]);
  };

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    loadReviews().finally(() => setLoading(false));
  }, [businessId, reviewSort]);

  const myReview = useMemo(() => (session?.user?.id ? reviews.find((r) => r.user_id === session.user.id) : null), [reviews, session?.user?.id]);

  const submitReview = async () => {
    if (!supabase || !session?.user?.id || !businessId) return;
    setSubmittingReview(true);
    const { error: err } = await supabase.from('reviews').upsert(
      {
        business_id: businessId,
        user_id: session.user.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      },
      { onConflict: 'business_id,user_id' }
    );
    setSubmittingReview(false);
    if (err) {
      Alert.alert('Hata', err.message, [{ text: 'Tamam' }]);
      return;
    }
    setShowWriteReview(false);
    setReviewComment('');
    setReviewRating(5);
    loadReviews();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Yorumlar · {businessName}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#15803d" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.reviewSortRow}>
            {(['newest', 'highest', 'lowest'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sortChip, reviewSort === s && styles.sortChipActive]}
                onPress={() => setReviewSort(s)}
              >
                <Text style={[styles.sortChipText, reviewSort === s && styles.sortChipTextActive]}>
                  {s === 'newest' ? 'En yeni' : s === 'highest' ? 'En yüksek' : 'En düşük'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>Henüz yorum yok. İlk yorumu siz yazın.</Text>
          ) : (
            <View style={styles.reviewList}>
              {reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewStars}>{'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5 - Math.round(r.rating))}</Text>
                    <Text style={styles.reviewDate}>{new Date(r.created_at).toLocaleDateString('tr-TR')}</Text>
                  </View>
                  {r.comment ? <Text style={styles.reviewCardComment}>{r.comment}</Text> : null}
                  {r.user_id === session?.user?.id && <Text style={styles.reviewYou}>Yorumunuz</Text>}
                </View>
              ))}
            </View>
          )}
          {session ? (
            myReview ? (
              <TouchableOpacity
                style={styles.writeReviewButton}
                onPress={() => {
                  setReviewRating(myReview.rating);
                  setReviewComment(myReview.comment ?? '');
                  setShowWriteReview(true);
                }}
              >
                <Text style={styles.writeReviewButtonText}>Yorumunuzu düzenle</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.writeReviewButton} onPress={() => setShowWriteReview(true)}>
                <Text style={styles.writeReviewButtonText}>Yorum yaz</Text>
              </TouchableOpacity>
            )
          ) : (
            <Text style={styles.loginToReview}>Yorum yazmak için giriş yapın.</Text>
          )}
        </ScrollView>
      )}

      <Modal visible={showWriteReview} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yorum yaz</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setReviewRating(n)} style={styles.starButton}>
                  <Text style={styles.starIcon}>{n <= reviewRating ? '★' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Yorumunuzu yazın (isteğe bağlı)"
              placeholderTextColor="#94a3b8"
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowWriteReview(false);
                  setReviewComment('');
                  setReviewRating(5);
                }}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitReview} disabled={submittingReview}>
                {submittingReview ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSubmitText}>Gönder</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backBtnText: { fontSize: 22, color: '#15803d', fontWeight: '600' },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: '#0f172a' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reviewSortRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  sortChipActive: { backgroundColor: '#15803d' },
  sortChipText: { fontSize: 13, color: '#64748b' },
  sortChipTextActive: { color: '#fff', fontWeight: '600' },
  emptyText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 24 },
  reviewList: { marginTop: 4 },
  reviewCard: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewStars: { fontSize: 14, color: '#f59e0b' },
  reviewDate: { fontSize: 12, color: '#94a3b8' },
  reviewCardComment: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
  reviewYou: { fontSize: 11, color: '#15803d', marginTop: 4, fontWeight: '600' },
  writeReviewButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  writeReviewButtonText: { fontSize: 15, color: '#15803d', fontWeight: '600' },
  loginToReview: { marginTop: 24, fontSize: 14, color: '#64748b' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  starButton: { padding: 4 },
  starIcon: { fontSize: 32, color: '#f59e0b' },
  reviewInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, color: '#0f172a', minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  modalSubmit: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  modalSubmitText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
