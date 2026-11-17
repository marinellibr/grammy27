// Official telecast: February 7, 2027, 4 PM Pacific / 7 PM Eastern.
// https://www.grammy.com/news/how-to-watch-2027-grammys-2/
export const GRAMMY_START = Date.parse('2027-02-08T00:00:00Z');
export function countdown(now = Date.now()) {
  const total = Math.max(0, Math.ceil((GRAMMY_START - now) / 1000));
  return { days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24, minutes: Math.floor(total / 60) % 60, seconds: total % 60, ended: total === 0 };
}
