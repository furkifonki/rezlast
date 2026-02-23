-- Rezervasyon politikası: Bir müşteri aynı günde veya aynı saatte birden fazla işletmede rezervasyon yapabilir.
-- reservations tablosunda (user_id, reservation_date, reservation_time) veya (user_id, business_id, ...) üzerinde
-- UNIQUE kısıtı YOKTUR; bu davranış bilinçli olarak serbesttir.
-- Mobil uygulama da aynı kullanıcının farklı işletmelerde aynı gün/saatte rezervasyon oluşturmasına izin verir.
-- Bu dosya sadece dokümantasyon amaçlıdır; çalıştırılacak DDL yok.

COMMENT ON TABLE reservations IS 'Rezervasyonlar. Bir kullanıcı aynı gün/aynı saatte farklı işletmelerde birden fazla rezervasyon yapabilir (UNIQUE kısıtı yok).';
