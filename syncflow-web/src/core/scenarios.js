// WhatsApp simülatörü senaryoları. SAF VERİ: DOM / tarayıcı bağımlılığı yok.
// Site (Motion ile oynatır) ve Remotion (kare kare çizer) aynı zaman çizelgesini kullanır.
//
// Adım türleri ve alanları (süreler saniye):
//   in      → ziyaretçinin mesajı      { at, text, meta }
//   typing  → "yazıyor…" göstergesi    { at, duration }   (hemen ardından gelen "out" adımıyla aynı yuvada)
//   out     → işletmenin yanıtı        { at, text, meta }
//   tag     → "ilk yanıt" rozeti       { at, text }
// Tüm metinler "Örnek senaryo"dur; gerçek bir kurumu ya da yanıt süresini taahhüt etmez.

const TAG = 'İlk yanıt 7 sn · Örnek senaryo';

const flow = (inText, outText, sector) => [
  { type: 'in', at: 0.4, text: inText, meta: `Web sitesi${sector ? ` · ${sector}` : ''} · 14:02` },
  { type: 'typing', at: 1.5, duration: 1.0 },
  { type: 'out', at: 2.6, text: outText, meta: 'Otomatik karşılama · 14:02' },
  { type: 'tag', at: 3.5, text: TAG },
];

const brand = (name) => ({ name, initial: 'Ö', status: 'WhatsApp Business' });

export const scenarios = [
  {
    id: 'genel',
    sector: 'Genel',
    brand: brand('Örnek Marka'),
    setup: 'Sektörünüzü seçin; mesaj akışını ve kurguyu birlikte netleştirelim.',
    steps: flow(
      'Merhaba, hizmetiniz hakkında ön görüşme talep etmek istiyorum.',
      'Merhaba! Talebiniz ulaştı. Size uygun gün ve saati birlikte planlayalım.',
      '',
    ),
  },
  {
    id: 'saglik',
    sector: 'Özel Sağlık',
    brand: brand('Örnek Klinik'),
    setup: 'Yönetmeliğe uygun, rızaya dayalı randevu talebi: fiyat ve kampanya dili olmadan.',
    steps: flow(
      'Merhaba, implant hakkında bilgi almak ve randevu planlamak istiyorum.',
      'Merhaba! Talebiniz ulaştı. Size uygun gün ve saati birlikte planlayalım.',
      'Özel Sağlık',
    ),
  },
  {
    id: 'gayrimenkul',
    sector: 'Gayrimenkul',
    brand: brand('Örnek Emlak'),
    setup: 'İlan numarasını mesaja taşıyan tek dokunuş; bölge ve bütçeyle nitelikli talep.',
    steps: flow(
      'Merhaba, Boğaz hattındaki 4+1 daire için bilgi almak istiyorum.',
      'Merhaba! İlan bilgisi bize ulaştı. Size uygun saati yazarsanız danışmanımız dönsün.',
      'Gayrimenkul',
    ),
  },
  {
    id: 'hukuk',
    sector: 'Hukuk',
    brand: brand('Örnek Hukuk Bürosu'),
    setup: 'Reklam yasağına duyarlı, bilgilendirme odaklı içerik; iletişimi her zaman ziyaretçi başlatır.',
    steps: flow(
      'Merhaba, bir konuda ön görüşme talep etmek istiyorum.',
      'Merhaba, mesajınız ulaştı. Uygun gün ve saati birlikte planlayalım.',
      'Hukuk',
    ),
  },
  {
    id: 'danismanlik',
    sector: 'Danışmanlık',
    brand: brand('Örnek Danışmanlık'),
    setup: 'Kapsam, bütçe ve zamanlamayı baştan soran nitelikli ön eleme akışı.',
    steps: flow(
      'Merhaba, şirketimiz için danışmanlık kapsamını görüşmek istiyoruz.',
      'Merhaba! Talebiniz ulaştı. Kapsamı netleştirmek için kısa bir ön görüşme planlayalım.',
      'Danışmanlık',
    ),
  },
  {
    id: 'mimarlik',
    sector: 'Mimarlık',
    brand: brand('Örnek Mimarlık'),
    setup: 'Proje portföyünü hafif tutan, ön görüşme talebini tek dokunuşa indiren akış.',
    steps: flow(
      'Merhaba, bir konut projesi için ön görüşme ve portföy incelemesi talep ediyorum.',
      'Merhaba! Talebiniz ulaştı. Projenin kapsamını konuşmak için uygun bir gün önerir misiniz?',
      'Mimarlık',
    ),
  },
  {
    id: 'diger',
    sector: 'Diğer B2B',
    brand: brand('Örnek Firma'),
    setup: 'Hedef müşteriniz ve teklif akışınız keşif görüşmesinde birlikte kurgulanır.',
    steps: flow(
      'Merhaba, hizmetiniz için teklif ve ön görüşme talep ediyoruz.',
      'Merhaba! Talebiniz ulaştı. İhtiyacınızı birlikte netleştirelim.',
      'Diğer B2B',
    ),
  },
];

// Remotion için: bir senaryonun toplam süresi (saniye), son adım girişinden sonra 1,6 sn bekleme dahil.
export const durationOf = (sc) => Math.max(...sc.steps.map((s) => s.at + (s.duration || 0.6))) + 1.6;
