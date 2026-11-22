import { storyPages } from './ballot';
import { translate, categoryLabel, fieldName } from './i18n';

function lines(ctx, value, maxWidth, maxLines) {
  const words = String(value || '').split(/\s+/), output = [];
  let line = '';
  for (let index = 0; index < words.length; index++) {
    const next = line ? `${line} ${words[index]}` : words[index];
    if (ctx.measureText(next).width <= maxWidth) { line = next; continue; }
    if (output.length === maxLines - 1) {
      let rest = next + (index < words.length - 1 ? '…' : '');
      while (ctx.measureText(rest).width > maxWidth && rest.length > 1) rest = rest.replace(/…$/, '').slice(0, -1) + '…';
      output.push(rest); return output;
    }
    if (line) output.push(line);
    line = words[index];
  }
  if (line && output.length < maxLines) {
    while (ctx.measureText(line).width > maxWidth && line.length > 1) line = line.replace(/…$/, '').slice(0, -1) + '…';
    output.push(line);
  }
  return output;
}
function textBlock(ctx, text, x, y, width, lineHeight, maxLines) {
  const wrapped = lines(ctx, text, width, maxLines);
  wrapped.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return wrapped.length * lineHeight;
}

const artworkCache = new Map();

function loadArtwork(url) {
  if (!url || !/^https:\/\//.test(url)) return Promise.resolve(null);
  if (artworkCache.has(url)) return artworkCache.get(url);
  const pending = new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    const finish = value => { clearTimeout(timeout); image.onload = null; image.onerror = null; resolve(value); };
    const timeout = setTimeout(() => { image.src = ''; finish(null); }, 6000);
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = url;
  });
  artworkCache.set(url, pending);
  pending.then(image => { if (!image) artworkCache.delete(url); });
  return pending;
}

function drawArtwork(ctx, image, x, y, size, palette, locale) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, size, size, 12);
  else ctx.rect(x, y, size, size);
  ctx.clip();
  if (image) {
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, x, y, size, size);
  } else {
    ctx.translate(x, y); ctx.scale(size / 168, size / 168); x = 0; y = 0; size = 168;
    ctx.fillStyle = palette.background; ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = palette.line; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    ctx.strokeStyle = palette.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2 - 8, 43, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2 - 8, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = palette.muted; ctx.font = '15px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(translate(locale, 'ARTWORK UNAVAILABLE'), x + size / 2, y + size - 24); ctx.textAlign = 'left';
  }
  ctx.restore();
}

export async function generateStories(picks, theme = 'light', locale = 'en') {
  if (!picks.length) throw new Error('Make your picks before creating a story.');
  const pages = storyPages(picks), results = [];
  const urls = [...new Set(picks.map(pick => pick.nominee.artwork_url).filter(Boolean))];
  const images = new Map(await Promise.all(urls.map(async url => [url, await loadArtwork(url)])));
  const missingArtworkCount = picks.filter(pick => !images.get(pick.nominee.artwork_url)).length;
  const palette = theme === 'dark'
    ? { background: '#080808', text: '#faf7ed', muted: '#c0b8a7', gold: '#d6b571', line: '#3f3521' }
    : { background: '#ffffff', text: '#17140e', muted: '#655e50', gold: '#896419', line: '#e6d7b4' };
  for (let page = 0; page < pages.length; page++) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not create an image. Please try another browser.');
    ctx.fillStyle = palette.background; ctx.fillRect(0, 0, 1080, 1920);
    ctx.textBaseline = 'top';
    const field = fieldName(pages[page][0].category.field, locale);
    ctx.fillStyle = palette.gold; ctx.font = 'bold 22px Arial, sans-serif'; ctx.fillText(translate(locale, 'THE 2027 GRAMMYS · MY PICKS'), 48, 42);
    ctx.fillStyle = palette.text; ctx.font = '34px Georgia, serif';
    textBlock(ctx, field, 48, 84, 984, 39, 3);
    // Each award occupies exactly 1/N of the entire content region.
    const startY = 224, bottom = 1848, rowHeight = (bottom - startY) / pages[page].length;
    pages[page].forEach(({ category, nominee }, index) => {
      const rowY = startY + index * rowHeight;
      ctx.fillStyle = index % 2 ? palette.background : palette.line;
      ctx.globalAlpha = index % 2 ? 1 : 0.22; ctx.fillRect(0, rowY, 1080, rowHeight); ctx.globalAlpha = 1;
      const backgroundImage = images.get(nominee.artwork_url);
      if (pages[page].length <= 3 && backgroundImage) {
        // Let the artwork fill each award's entire share, with a theme tint for legibility.
        ctx.save(); ctx.beginPath(); ctx.rect(0, rowY, 1080, rowHeight); ctx.clip();
        const scale = Math.max(1080 / backgroundImage.naturalWidth, rowHeight / backgroundImage.naturalHeight);
        const w = backgroundImage.naturalWidth * scale, h = backgroundImage.naturalHeight * scale;
        ctx.globalAlpha = theme === 'dark' ? 0.3 : 0.16;
        ctx.drawImage(backgroundImage, (1080 - w) / 2, rowY + (rowHeight - h) / 2, w, h);
        ctx.restore();
      }
      const single = pages[page].length === 1;
      const size = single ? 820 : Math.min(360, rowHeight - 32);
      const imageX = single ? 130 : 36, imageY = single ? rowY + 56 : rowY + (rowHeight - size) / 2;
      drawArtwork(ctx, images.get(nominee.artwork_url), imageX, imageY, size, palette, locale);
      const x = single ? 80 : imageX + size + 30, width = 1080 - x - (single ? 80 : 36);
      const compact = rowHeight < 180;
      const categoryFont = single ? 30 : compact ? Math.min(17, rowHeight * 0.12) : 23;
      const titleFont = single ? 64 : compact ? Math.min(26, rowHeight * 0.18) : Math.min(44, rowHeight / 7);
      const artistFont = single ? 34 : compact ? Math.min(18, rowHeight * 0.13) : 25;
      // Measure first so every text block is vertically centered in its award's share.
      ctx.font = `bold ${categoryFont}px Arial, sans-serif`;
      const categoryLines = lines(ctx, categoryLabel(category, locale).toUpperCase(), width, 2);
      ctx.font = `${titleFont}px Georgia, serif`;
      const titleLines = lines(ctx, nominee.title || nominee.artist, width, 2);
      ctx.font = `${artistFont}px Arial, sans-serif`;
      const artistLines = nominee.title && nominee.artist ? lines(ctx, nominee.artist, width, compact ? 1 : 2) : [];
      const gap = compact ? 4 : 14;
      const height = categoryLines.length * categoryFont * 1.2 + titleLines.length * titleFont * 1.15 + artistLines.length * artistFont * 1.2 + gap * 2;
      let y = single ? imageY + size + 65 : rowY + (rowHeight - height) / 2;
      ctx.fillStyle = palette.gold; ctx.font = `bold ${categoryFont}px Arial, sans-serif`;
      categoryLines.forEach(line => { ctx.fillText(line, x, y); y += categoryFont * 1.2; }); y += gap;
      ctx.fillStyle = palette.text; ctx.font = `${titleFont}px Georgia, serif`;
      titleLines.forEach(line => { ctx.fillText(line, x, y); y += titleFont * 1.15; }); y += gap;
      ctx.fillStyle = palette.muted; ctx.font = `${artistFont}px Arial, sans-serif`;
      artistLines.forEach(line => { ctx.fillText(line, x, y); y += artistFont * 1.2; });
      if (index) { ctx.strokeStyle = palette.line; ctx.beginPath(); ctx.moveTo(36, rowY); ctx.lineTo(1044, rowY); ctx.stroke(); }
    });
    ctx.fillStyle = palette.gold; ctx.font = '19px Arial, sans-serif'; ctx.fillText(translate(locale, 'YOUR PICKS. YOUR SPOTLIGHT.'), 48, 1876);
    ctx.fillStyle = palette.muted; ctx.textAlign = 'right'; ctx.fillText('marinellibr.github.io/grammy27', 1032, 1876); ctx.textAlign = 'left';
    const blob = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed. Please try again.')), 'image/png'));
    results.push({ field, awardCount: pages[page].length, missingArtworkCount, blob, url: URL.createObjectURL(blob), name: `my-grammy-2027-picks-${String(page + 1).padStart(2, '0')}.png` });
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return results;
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function downloadAllStories(stories) {
  const { zipSync } = await import('fflate');
  const files = {};
  for (const story of stories) files[story.name] = new Uint8Array(await story.blob.arrayBuffer());
  downloadBlob(new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }), 'my-grammy-2027-stories.zip');
}
