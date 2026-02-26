'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Tier = { id: string; min_points: number; display_name: string; description: string | null; sort_order: number };

const FALLBACK_TIERS: Tier[] = [
  { id: 'bronze', min_points: 0, display_name: 'Bronz', description: 'Rezervasyonlarınızı tamamladıkça puan kazanırsınız. Puanlarınızı işletmelerde indirim veya özel avantajlar için kullanabilirsiniz.', sort_order: 1 },
  { id: 'silver', min_points: 100, display_name: 'Gümüş', description: '100+ puan: Gümüş üye avantajları. İşletmelerin belirlediği indirimlerden yararlanın.', sort_order: 2 },
  { id: 'gold', min_points: 500, display_name: 'Altın', description: '500+ puan: Altın üye avantajları. Öncelikli rezervasyon ve ekstra indirimler.', sort_order: 3 },
  { id: 'platinum', min_points: 1500, display_name: 'Platin', description: '1500+ puan: Platin üye. En yüksek avantajlar ve özel kampanyalara erişim.', sort_order: 4 },
];

const TIER_COLOR: Record<string, string> = {
  bronze: '#b45309',
  silver: '#64748b',
  gold: '#d97706',
  platinum: '#7c3aed',
};

export default function PointsInfoPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setTiers(FALLBACK_TIERS);
      setLoading(false);
      return;
    }
    supabase
      .from('loyalty_tiers')
      .select('id, min_points, display_name, description, sort_order')
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) setTiers(data as unknown as Tier[]);
        else setTiers(FALLBACK_TIERS);
        setLoading(false);
      })
      .catch(() => {
        setTiers(FALLBACK_TIERS);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-4 md:p-0 md:max-w-2xl md:mx-auto pb-12">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/app/profile" className="text-[#15803d] font-medium hover:underline">← Profil</Link>
      </div>
      <h1 className="text-xl font-semibold text-[#0f172a] mb-4">Puanlarımı Nasıl Kullanırım?</h1>
      <p className="text-[#475569] text-sm leading-relaxed mb-6">
        Rezvio&apos;da rezervasyonlarınızı tamamladıkça puan kazanırsınız. Topladığınız puanlara göre seviye atlarsınız ve işletmelerin sunduğu indirim veya avantajlardan yararlanabilirsiniz.
      </p>
      {loading ? (
        <div className="w-8 h-8 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className="space-y-4">
          {tiers.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-[#e2e8f0] p-4 border-l-4"
              style={{ borderLeftColor: TIER_COLOR[t.id] ?? '#15803d' }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold" style={{ color: TIER_COLOR[t.id] ?? '#15803d' }}>{t.display_name}</span>
                <span className="text-sm text-[#64748b]">{t.min_points}+ puan</span>
              </div>
              {t.description && <p className="text-sm text-[#64748b]">{t.description}</p>}
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-[#94a3b8] mt-6">
        Puan kullanım koşulları işletmeye göre değişebilir. Detay için işletme ile iletişime geçebilirsiniz.
      </p>
    </div>
  );
}
