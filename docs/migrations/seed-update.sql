DO $$
DECLARE
  v_owner_id    UUID := '0e75e3fa-9554-4550-bb59-1989431be3f8';
  v_category_id UUID := '48f8a8cb-500c-40ed-8ffd-cbce7234902c';
BEGIN

  INSERT INTO businesses (
    owner_id, name, slug, description, category_id, address, city, district,
    latitude, longitude, phone, email, website, is_active, is_verified
  ) VALUES
  -- BigChefs
  (v_owner_id,'BigChefs - Tünel','bigchefs-tunel-beyoglu','BigChefs İstanbul şubesi.',v_category_id,'Evliya Çelebi, Meşrutiyet Cd. No:96/A, 34430 Beyoğlu/İstanbul','Istanbul','Beyoğlu',NULL,NULL,'+90 212 251 7180',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Tarabya','bigchefs-tarabya-sariyer','BigChefs İstanbul şubesi.',v_category_id,'Tarabya, Yeniköy Tarabya Cd. No:3, 34457 Sarıyer/İstanbul','Istanbul','Sarıyer',NULL,NULL,'+90 212 223 2325',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Galataport','bigchefs-galataport-beyoglu','BigChefs İstanbul şubesi.',v_category_id,'Galataport AVM, Kılıçali Paşa Meclis-i Mebusan Cd. K2 No:8, 34433 Beyoğlu/İstanbul','Istanbul','Beyoğlu',NULL,NULL,'+90 212 877 0077',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Anadolu Hisarı','bigchefs-anadolu-hisari-beykoz','BigChefs İstanbul şubesi.',v_category_id,'Anadolu Hisarı, Küçüksu Cd. No:4, 34810 Beykoz/İstanbul','Istanbul','Beykoz',NULL,NULL,'+90 850 215 5024',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Mall of İstanbul','bigchefs-mall-of-istanbul-basaksehir','BigChefs İstanbul şubesi.',v_category_id,'Süleyman Demirel Blv. No:7/402 Kat:2, 34490 Başakşehir/İstanbul','Istanbul','Başakşehir',NULL,NULL,'+90 212 801 0052',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Sabiha Gökçen','bigchefs-sabiha-gokcen-pendik','BigChefs İstanbul şubesi.',v_category_id,'Sanayi, Sabiha Gökçen Havaalanı No:1, 34906 Pendik/İstanbul','Istanbul','Pendik',NULL,NULL,'+90 216 588 8924',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - West İstanbul Marina','bigchefs-west-istanbul-marina-beylikduzu','BigChefs İstanbul şubesi.',v_category_id,'Marmara, Ulusum Cd. No:34 D:1E, 34524 Beylikdüzü/İstanbul','Istanbul','Beylikdüzü',NULL,NULL,'+90 537 744 4848',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Aqua Florya','bigchefs-aqua-florya-bakirkoy','BigChefs İstanbul şubesi.',v_category_id,'Şenlikköy, Yeşilköy Halkalı Cd. No:93, 34153 Bakırköy/İstanbul','Istanbul','Bakırköy',NULL,NULL,'+90 212 574 5001',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Trump AVM','bigchefs-trump-avm-sisli','BigChefs İstanbul şubesi.',v_category_id,'Mecidiyeköy Mah, Şht. Ahmet Sok. 4-1, 34381 Şişli/İstanbul','Istanbul','Şişli',NULL,NULL,'+90 212 347 9900',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Vialand','bigchefs-vialand-eyupsultan','BigChefs İstanbul şubesi.',v_category_id,'Yeşilpınar, Şht. Metin Kaya Sk. No:11, 34065 Eyüpsultan/İstanbul','Istanbul','Eyüpsultan',NULL,NULL,'+90 212 890 5957',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Marmara Forum','bigchefs-marmara-forum-bakirkoy','BigChefs İstanbul şubesi.',v_category_id,'Osmaniye, Çobançeşme Koşuyolu Blv No:3, 34146 Bakırköy/İstanbul','Istanbul','Bakırköy',NULL,NULL,'+90 212 466 6434',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Moda Teras','bigchefs-moda-teras-kadikoy','BigChefs İstanbul şubesi.',v_category_id,'Caferağa, Moda Mektebi Sk. No:1, 34790 Kadıköy/İstanbul','Istanbul','Kadıköy',NULL,NULL,'+90 850 215 5022',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - City''s Nişantaşı','bigchefs-citys-nisantasi-sisli','BigChefs İstanbul şubesi.',v_category_id,'Teşvikiye Cd. No:162, 34365 Şişli/İstanbul','Istanbul','Şişli',NULL,NULL,'+90 212 373 2000',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Cevahir AVM','bigchefs-cevahir-avm-sisli','BigChefs İstanbul şubesi.',v_category_id,'Cevahir AVM, 19 Mayıs Blv. No:22 Kat:6/602, 34363 Şişli/İstanbul','Istanbul','Şişli',NULL,NULL,'+90 212 380 0949',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Lotus Walk','bigchefs-lotus-walk-sisli','BigChefs İstanbul şubesi.',v_category_id,'Lotus Walk AVM, Halaskargazi Cd. No:38-66, 34371 Şişli/İstanbul','Istanbul','Şişli',NULL,NULL,'+90 212 890 0107',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Zorlu Center','bigchefs-zorlu-center-besiktas','BigChefs İstanbul şubesi.',v_category_id,'Levazım, Koru Sk. No:2, 34340 Beşiktaş/İstanbul','Istanbul','Beşiktaş',NULL,NULL,'+90 212 353 6384',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Capitol AVM','bigchefs-capitol-avm-uskudar','BigChefs İstanbul şubesi.',v_category_id,'Altunizade, Mahir İz Cd. No:4/2, 34662 Üsküdar/İstanbul','Istanbul','Üsküdar',NULL,NULL,'+90 216 411 4004',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Sarıyer Merkez','bigchefs-sariyer-merkez-sariyer','BigChefs İstanbul şubesi.',v_category_id,'Fatih Sultan Mehmet Mh., Atatürk Cd. No:9, 34470 Sarıyer/İstanbul','Istanbul','Sarıyer',NULL,NULL,'+90 850 214 7305',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Ayazağa','bigchefs-ayazaga-sariyer','BigChefs İstanbul şubesi.',v_category_id,'Ayazağa, Cendere Cd. No:109/G, 34485 Sarıyer/İstanbul','Istanbul','Sarıyer',NULL,NULL,'+90 212 803 6934',NULL,NULL,true,false),
  (v_owner_id,'BigChefs - Emaar Square Mall','bigchefs-emaar-square-mall-uskudar','BigChefs İstanbul şubesi.',v_category_id,'Ünalan, Libadiye Cd. No:88, 34700 Üsküdar/İstanbul','Istanbul','Üsküdar',NULL,NULL,'+90 216 504 9511',NULL,NULL,true,false),

  -- Happy Moon's
  (v_owner_id,'Happy Moon''s - Vadi İstanbul','happy-moons-vadi-istanbul-sariyer','Happy Moon''s İstanbul şubesi.',v_category_id,'Vadi İstanbul, Azerbaycan Cd. No:3C, 34475 Sarıyer/İstanbul','Istanbul','Sarıyer',NULL,NULL,'+90 538 554 6277',NULL,NULL,true,false),
  (v_owner_id,'Happy Moon''s - Ataköy Marina','happy-moons-atakoy-marina-bakirkoy','Happy Moon''s İstanbul şubesi.',v_category_id,'Ataköy 1. Kısım Mah., Rauf Orbay Cd. No:16, 34140 Bakırköy/İstanbul','Istanbul','Bakırköy',NULL,NULL,'+90 538 089 9702',NULL,NULL,true,false),
  (v_owner_id,'Happy Moon''s - Kadıköy','happy-moons-kadikoy-kadikoy','Happy Moon''s İstanbul şubesi.',v_category_id,'Bahariye Cad. Nazmi Bey Sk. No:5/C, 34710 Kadıköy/İstanbul','Istanbul','Kadıköy',NULL,NULL,'+90 216 349 8422',NULL,NULL,true,false),
  (v_owner_id,'Happy Moon''s - Mall of İstanbul','happy-moons-mall-of-istanbul-basaksehir','Happy Moon''s İstanbul şubesi.',v_category_id,'Ziya Gökalp Blv. No:7, 34490 Başakşehir/İstanbul','Istanbul','Başakşehir',NULL,NULL,'+90 545 599 4379',NULL,NULL,true,false),
  (v_owner_id,'Happy Moon''s - City''s Nişantaşı','happy-moons-citys-nisantasi-sisli','Happy Moon''s İstanbul şubesi.',v_category_id,'City''s Nişantaşı, Teşvikiye Cd. No:12, 34365 Şişli/İstanbul','Istanbul','Şişli',NULL,NULL,'+90 532 205 1197',NULL,NULL,true,false),
  (v_owner_id,'Happy Moon''s - Fenerbahçe','happy-moons-fenerbahce-kadikoy','Happy Moon''s İstanbul şubesi.',v_category_id,'Fener Kalamış Cd. No:89, 34726 Kadıköy/İstanbul','Istanbul','Kadıköy',NULL,NULL,'+90 554 772 0065',NULL,NULL,true,false),
  (v_owner_id,'Happy Moon''s - Beşiktaş','happy-moons-besiktas-besiktas','Happy Moon''s İstanbul şubesi.',v_category_id,'Levazım, Koru Sk. No:2, 34340 Beşiktaş/İstanbul','Istanbul','Beşiktaş',NULL,NULL,'+90 531 774 8087',NULL,NULL,true,false),
  (v_owner_id,'Happy Moon''s - Bayrampaşa','happy-moons-bayrampasa-bayrampasa','Happy Moon''s İstanbul şubesi.',v_category_id,'Kocatepe, Paşa Cd. Blok 74–77, 34045 Bayrampaşa/İstanbul','Istanbul','Bayrampaşa',NULL,NULL,'+90 212 640 4021',NULL,NULL,true,false);

  RAISE NOTICE 'Tüm işletmeler eklendi (lat/long NULL).';
END $$;