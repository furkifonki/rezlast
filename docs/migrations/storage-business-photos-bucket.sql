-- İşletme fotoğrafları için Supabase Storage bucket ve politikaları.
--
-- ADIM 1 (zorunlu): Bucket'ı oluşturun
--   Supabase Dashboard → Storage → "New bucket"
--   Name: business-photos
--   Public bucket: Açık (✅) — liste ve detayda resimlerin görünmesi için
--   "Create bucket" ile kaydedin.
--
-- ADIM 2: Aşağıdaki SQL'i SQL Editor'da çalıştırın (storage.objects RLS politikaları).

-- Herkese okuma (public bucket; resimler listeleme/detayda görünsün)
CREATE POLICY "Public read business-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-photos');

-- Giriş yapmış kullanıcı sadece kendi işletmesinin klasörüne (path: business_id/...) yükleyebilir
CREATE POLICY "Business owners upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Giriş yapmış kullanıcı kendi işletme klasöründeki dosyayı silebilir
CREATE POLICY "Business owners delete own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_id = auth.uid()
  )
);
