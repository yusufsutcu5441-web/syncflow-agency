/**
 * Search-engine and link-preview crawlers (docs/adr/0015-entry-gate-and-hero.md). The entry gate is a full-screen layer over the
 * home page; a crawler must see the page itself, so the home page leaves the gate out of the HTML when the User-Agent is one of
 * these. The content is identical for everyone (the gate is only a layer in front of it), so this is not cloaking.
 *
 * A User-Agent is trivially spoofable, which is fine: the gate is a courtesy, not an access control. Nothing here is a security
 * decision. Lighthouse and PageSpeed Insights are deliberately NOT listed: they must measure what a visitor gets.
 */
const CRAWLERS = new RegExp(
  [
    'googlebot',
    'google-inspectiontool',
    'googleother',
    'adsbot-google',
    'mediapartners-google',
    'storebot-google',
    'bingbot',
    'bingpreview',
    'msnbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandex(?:bot|images|mobilebot)?',
    'applebot',
    'petalbot',
    'sogou',
    'exabot',
    'ia_archiver',
    'facebookexternalhit',
    'facebot',
    'twitterbot',
    'linkedinbot',
    'slackbot',
    'discordbot',
    'telegrambot',
    'whatsapp',
    'pinterest',
    'embedly',
    '\\b(?:bot|crawler|spider)\\b',
  ].join('|'),
  'i',
);

export function isCrawler(userAgent: string | null | undefined): boolean {
  return !!userAgent && CRAWLERS.test(userAgent);
}
