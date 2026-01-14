import { chromium } from 'playwright';

const url = process.argv[2] || 'https://www.flashscore.com/match/bJYPzTn0/';

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  locale: 'en-US',
});

await page.route('**/*', (route) => {
  const t = route.request().resourceType();
  if (t === 'image' || t === 'media' || t === 'font') return route.abort();
  return route.continue();
});

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(750);

const data = await page.evaluate(() => {
  const doc = globalThis.document;
  const firstText = (sels) => {
    for (const s of sels) {
      const el = doc.querySelector(s);
      const t = el?.textContent?.trim();
      if (t) return t;
    }
    return null;
  };
  const scoreWrapper = firstText(['.detailScore__wrapper', '.detailScore', '.detailScore__wrapper span']);
  const nums = scoreWrapper ? scoreWrapper.match(/\d+/g) : null;
  return {
    home: firstText(['.duelParticipant__home .participant__participantName', '.duelParticipant__home']),
    away: firstText(['.duelParticipant__away .participant__participantName', '.duelParticipant__away']),
    status: firstText(['.detailScore__status', '.eventTime', '.detailScore__time']),
    tournament: firstText(['.tournamentHeader__country', '.tournamentHeader__country a']),
    homeScore: firstText(['.detailScore__home']) || (nums && nums[0]) || null,
    awayScore: firstText(['.detailScore__away']) || (nums && nums[1]) || null,
  };
});

console.log(JSON.stringify({ url, ...data }, null, 2));

await browser.close();

