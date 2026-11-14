/**
 * The copy and the facts of /pilot (docs/adr/0037-pilot-page.md). A plain module with no imports: the page and the unit test (tests/delivery/pilot.test.mjs, run by
 * `npm run delivery:verify`) read the same data.
 *
 * SOURCE OF THE WORDS. The page states the offer the cold e-mails make, and nothing more: the step-1 text `pilot-no-brainer` of the outbound engine (syncflow-outbound,
 * lib/template.ts, locked by the owner 05.11.2026, "Model B") is the source, sentence by sentence, in the same voice ("I", direct, concrete). Every sentence below is
 * either one of its sentences, a plain restatement of one, or the "does not count" sentence of the qualified-conversation definition in that project's
 * sales/CLOSING_DOCS.md (the one part of that definition without a bracket). Terms the owner has not decided yet (the cancellation notice, the dispute window, when the
 * clock starts) are bracketed over there and are NOT on this page: the one-page terms the page promises are where they belong.
 *
 * WHAT IS DELIBERATELY ABSENT: a case study, a client name, a logo, a quote, a result, a number of pilots run, "trusted by", a guarantee, "risk-free". There is no
 * client yet (owner, 14.11.2026) and the page says so (`stands`). If that changes, the evidence is added with the client's written consent, never before.
 *
 * Languages: English and Turkish, written by hand for this route (the text is not in messages/*.json, like /outbound: terms with a price are not machine-translated
 * into languages nobody has read). The page answers 404 for every other language.
 */
export const PILOT_PATH = '/pilot';

export const PILOT_LOCALES = ['en', 'tr'] as const;
export type PilotLocale = (typeof PILOT_LOCALES)[number];
export const isPilotLocale = (value: string): value is PilotLocale => (PILOT_LOCALES as readonly string[]).includes(value);

/**
 * The figures of the offer, as the e-mails state them (lib/template.ts pilot-no-brainer: "3 qualified conversations", "a one-time setup fee of USD 2,500", "USD 500 a month").
 * They are written here once and formatted into every sentence; change them only together with the mail.
 */
export const PILOT_FACTS = { days: 30, conversations: 3, setupUsd: 2500, monthlyUsd: 500 } as const;

/** An amount in the page's own number format, with the dollar sign the e-mail spells "USD" (the mail avoids the symbol only because its spam check refuses one). */
export const usd = (locale: PilotLocale, amount: number): string => new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

export type PilotCopy = {
  htmlLang: string;
  meta: { title: string; description: string };
  nav: { brand: string; studio: string; language: string; langLabel: string; cta: string };
  hero: { eyebrow: string; title: readonly [string, string]; lead: string; leadStrong: readonly string[]; cta: string; ctaSecondary: string; facts: readonly { value: string; label: string }[] };
  terms: { eyebrow: string; title: string; sub: string; cards: readonly { n: string; title: string; body: string }[] };
  qualified: { eyebrow: string; title: string; body: string; notCounted: string; paid: string };
  promise: { title: string; body: string };
  stands: { title: string; body: string };
  start: { eyebrow: string; title: string; steps: readonly { title: string; body: string }[] };
  closing: { eyebrow: string; title: string; sub: string; cta: string; addressLead: string };
  foot: { privacy: string; imprint: string };
};

const N = PILOT_FACTS;

function english(): PilotCopy {
  const setup = usd('en', N.setupUsd);
  const monthly = usd('en', N.monthlyUsd);
  return {
    htmlLang: 'en',
    meta: {
      title: `${N.days}-day outbound pilot, paid only if it delivers conversations | SyncFlow Labs`,
      description: `A ${N.days}-day outbound pilot for B2B founders with nothing to pay upfront. If it does not produce ${N.conversations} qualified conversations, you pay nothing at all. The terms and the price on one page.`,
    },
    nav: { brand: 'SyncFlow Labs', studio: 'Studio site', language: 'Türkçe', langLabel: 'Bu sayfa Türkçe', cta: 'Email “pilot”' },
    hero: {
      eyebrow: `${N.days}-day outbound pilot · B2B founders`,
      title: ['Nothing to pay upfront.', 'Paid only if it delivers conversations.'],
      lead: `I build and run outbound for B2B founders. I would like to run it for your company for ${N.days} days with nothing to pay upfront. If the pilot does not produce ${N.conversations} qualified conversations, you pay nothing at all: no invoice, no fee, no minimum.`,
      leadStrong: ['nothing to pay upfront', 'you pay nothing at all'],
      cta: 'Email “pilot” for the one-page terms',
      ctaSecondary: 'Read the terms',
      facts: [
        { value: `${usd('en', 0)} upfront`, label: `Nothing before or during the ${N.days} days` },
        { value: `${usd('en', 0)} if fewer than ${N.conversations}`, label: 'No invoice, no fee, no minimum' },
        { value: `${setup} + ${monthly}/mo`, label: `Only if ${N.conversations} or more arrive, month to month` },
      ],
    },
    terms: {
      eyebrow: 'The terms',
      title: 'What you pay, and when',
      sub: 'These are the terms of my first e-mail, in full.',
      cards: [
        { n: '01 · BEFORE AND DURING', title: 'Nothing upfront', body: `Nothing to pay upfront: no card, no invoice, and nothing during the ${N.days} days.` },
        { n: `02 · FEWER THAN ${N.conversations}`, title: 'If it does not deliver, you pay nothing', body: `If the pilot does not produce ${N.conversations} qualified conversations, you pay nothing at all: no invoice, no fee, no minimum.` },
        { n: `03 · ${N.conversations} OR MORE`, title: 'If it does, this is the price', body: `Only if it does, a one-time setup fee of ${setup} is invoiced and ${monthly} a month begins, month to month.` },
      ],
    },
    qualified: {
      eyebrow: 'What counts',
      title: 'What a qualified conversation is',
      body: 'A qualified conversation is written down before we start: a named person at a company that fits the profile we agree on, who replies asking to talk or asking for details about your offer.',
      notCounted: 'Auto-replies, unsubscribes, “not interested” and people outside the profile do not count.',
      paid: 'I am paid on those, not on closed deals, because closing is your craft.',
    },
    promise: {
      title: 'What this is, and what it is not',
      body: 'This is a promise about when you pay, not about what will happen: I cannot promise anyone will answer. Everything is written and asynchronous, no discovery calls.',
    },
    stands: {
      title: 'Where this stands',
      body: 'This offer is new and I have no client results to show yet, so this page has no case studies, client names, logos or quotes. What I can show is the terms above: you carry no cost unless the pilot delivers.',
    },
    start: {
      eyebrow: 'How it starts',
      title: 'Two steps, written',
      steps: [
        { title: 'Email “pilot”', body: 'Write the word “pilot” to the address below, or reply to my e-mail with it.' },
        { title: 'I send the one-page terms', body: 'The profile of companies we agree on, and what counts as a qualified conversation, are written down before we start.' },
      ],
    },
    closing: {
      eyebrow: 'Start',
      title: 'Want the one-page terms?',
      sub: 'Write “pilot” and I will send them. Write “stop” and I will not write again.',
      cta: 'Email “pilot”',
      addressLead: 'Or write to',
    },
    foot: { privacy: 'Privacy', imprint: 'Legal notice' },
  };
}

function turkish(): PilotCopy {
  const setup = usd('tr', N.setupUsd);
  const monthly = usd('tr', N.monthlyUsd);
  return {
    htmlLang: 'tr',
    meta: {
      title: `${N.days} günlük outbound pilotu, yalnızca konuşma üretirse ödeme | SyncFlow Labs`,
      description: `B2B kurucular için ${N.days} günlük outbound pilotu: peşin ödeme yok. Pilot ${N.conversations} nitelikli konuşma üretmezse hiçbir şey ödemezsiniz. Şartlar ve fiyat tek sayfada.`,
    },
    nav: { brand: 'SyncFlow Labs', studio: 'Stüdyo sitesi', language: 'English', langLabel: 'This page in English', cta: '“pilot” yazın' },
    hero: {
      eyebrow: `${N.days} günlük outbound pilotu · B2B kurucular`,
      title: ['Peşin ödeme yok.', 'Yalnızca konuşma üretirse ödeme.'],
      lead: `B2B kurucular için outbound kurar ve yürütürüm. Şirketiniz için ${N.days} gün boyunca, peşin hiçbir şey ödemeden çalıştırmak isterim. Pilot ${N.conversations} nitelikli konuşma üretmezse hiçbir şey ödemezsiniz: fatura yok, ücret yok, asgari tutar yok.`,
      leadStrong: ['peşin hiçbir şey ödemeden', 'hiçbir şey ödemezsiniz'],
      cta: 'Tek sayfalık şartlar için “pilot” yazın',
      ctaSecondary: 'Şartları okuyun',
      facts: [
        { value: `Peşin ${usd('tr', 0)}`, label: `${N.days} günden önce de, sırasında da ödeme yok` },
        { value: `${N.conversations}’ten azsa ${usd('tr', 0)}`, label: 'Fatura yok, ücret yok, asgari tutar yok' },
        { value: `${setup} + ${monthly}/ay`, label: `Yalnızca ${N.conversations} ya da daha fazlası gelirse, aylık sözleşme` },
      ],
    },
    terms: {
      eyebrow: 'Şartlar',
      title: 'Ne zaman, ne ödersiniz',
      sub: 'İlk e-postamdaki şartların tamamı bunlar.',
      cards: [
        { n: '01 · ÖNCE VE SIRASINDA', title: 'Peşin ödeme yok', body: `Peşin ödeme yok: kart yok, fatura yok, ${N.days} gün boyunca da ödeme yok.` },
        { n: `02 · ${N.conversations}’TEN AZ`, title: 'Sonuç gelmezse hiçbir şey ödemezsiniz', body: `Pilot ${N.conversations} nitelikli konuşma üretmezse hiçbir şey ödemezsiniz: fatura yok, ücret yok, asgari tutar yok.` },
        { n: `03 · ${N.conversations} YA DA FAZLASI`, title: 'Gelirse fiyat budur', body: `Yalnızca gelirse, bir defaya mahsus ${setup} kurulum bedeli faturalanır ve aylık ${monthly} başlar; sözleşme aydan aya sürer.` },
      ],
    },
    qualified: {
      eyebrow: 'Neyin sayıldığı',
      title: 'Nitelikli konuşma nedir',
      body: 'Nitelikli konuşma, başlamadan önce yazıya geçirilir: birlikte belirleyeceğimiz profile uyan bir şirketten, adı bilinen bir kişinin, görüşmek istediğini ya da teklifiniz hakkında ayrıntı istediğini yazarak yanıt vermesi.',
      notCounted: 'Otomatik yanıtlar, abonelikten çıkmalar, “ilgilenmiyorum” yanıtları ve profil dışındaki kişiler sayılmaz.',
      paid: 'Ödemeyi bunlara göre alırım, kapanan satışlara göre değil; çünkü satışı kapatmak sizin işinizdir.',
    },
    promise: {
      title: 'Bu ne, ne değil',
      body: 'Bu, ne zaman ödeyeceğinize dair bir sözdür; ne olacağına dair değil: kimsenin yanıt vereceğini söyleyemem. Her şey yazılı ve eşzamansızdır, keşif görüşmesi yoktur.',
    },
    stands: {
      title: 'Şu an neredeyiz',
      body: 'Bu teklif yeni ve henüz gösterebileceğim bir müşteri sonucu yok; bu yüzden bu sayfada vaka çalışması, müşteri adı, logo ya da alıntı yok. Gösterebileceğim, yukarıdaki şartlardır: pilot sonuç üretmedikçe sizin maliyetiniz yoktur.',
    },
    start: {
      eyebrow: 'Nasıl başlar',
      title: 'İki adım, yazılı',
      steps: [
        { title: '“pilot” yazın', body: 'Aşağıdaki adrese “pilot” kelimesini yazın ya da e-postama bu kelimeyle yanıt verin.' },
        { title: 'Tek sayfalık şartları gönderirim', body: 'Birlikte belirleyeceğimiz şirket profili ve nitelikli konuşmanın ne sayıldığı, başlamadan önce yazıya geçirilir.' },
      ],
    },
    closing: {
      eyebrow: 'Başlangıç',
      title: 'Tek sayfalık şartları ister misiniz?',
      sub: '“pilot” yazın, göndereyim. “stop” yazın, bir daha yazmam.',
      cta: '“pilot” yazın',
      addressLead: 'Ya da şuraya yazın',
    },
    foot: { privacy: 'Gizlilik', imprint: 'Yasal bildirim' },
  };
}

export const pilotCopy = (locale: PilotLocale): PilotCopy => (locale === 'tr' ? turkish() : english());

/** Every sentence the page prints, in one list, for the claim test. */
export function allCopy(locale: PilotLocale): string[] {
  const c = pilotCopy(locale);
  return [
    c.meta.title,
    c.meta.description,
    c.nav.cta,
    c.hero.eyebrow,
    ...c.hero.title,
    c.hero.lead,
    c.hero.cta,
    c.hero.ctaSecondary,
    ...c.hero.facts.flatMap((f) => [f.value, f.label]),
    c.terms.eyebrow,
    c.terms.title,
    c.terms.sub,
    ...c.terms.cards.flatMap((card) => [card.n, card.title, card.body]),
    c.qualified.eyebrow,
    c.qualified.title,
    c.qualified.body,
    c.qualified.notCounted,
    c.qualified.paid,
    c.promise.title,
    c.promise.body,
    c.stands.title,
    c.stands.body,
    c.start.eyebrow,
    c.start.title,
    ...c.start.steps.flatMap((s) => [s.title, s.body]),
    c.closing.eyebrow,
    c.closing.title,
    c.closing.sub,
    c.closing.cta,
    c.closing.addressLead,
  ];
}
