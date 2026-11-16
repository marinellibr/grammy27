import { storyPages } from './ballot';

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

function drawArtwork(ctx, image, x, y, size, palette) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, size, size, 12);
  else ctx.rect(x, y, size, size);
  ctx.clip();
  if (image) {
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, x, y, size, size);
  } else {
    ctx.fillStyle = palette.background; ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = palette.line; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    ctx.strokeStyle = palette.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2 - 8, 43, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2 - 8, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = palette.muted; ctx.font = '15px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ARTWORK UNAVAILABLE', x + size / 2, y + size - 24); ctx.textAlign = 'left';
  }
  ctx.restore();
}

export async function generateStories(picks, theme = 'light') {
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
    ctx.strokeStyle = palette.line; ctx.lineWidth = 2; ctx.strokeRect(42, 42, 996, 1836);
    ctx.textBaseline = 'top';
    ctx.fillStyle = palette.gold; ctx.font = 'bold 23px Arial, sans-serif'; ctx.fillText('THE 2027 GRAMMYS', 86, 112);
    ctx.fillStyle = palette.text; ctx.font = '76px Georgia, serif'; ctx.fillText('My picks.', 82, 163);
    ctx.font = 'italic 76px Georgia, serif'; ctx.fillStyle = palette.gold; ctx.fillText('My spotlight.', 82, 248);
    ctx.fillStyle = palette.muted; ctx.font = '24px Arial, sans-serif'; ctx.fillText(`${picks.length} picks · ${pages.length > 1 ? `Story ${page + 1} of ${pages.length}` : 'One unforgettable year'}`, 86, 350);
    const rowHeight = 218, startY = 430;
    pages[page].forEach(({ category, nominee }, index) => {
      const rowY = startY + index * rowHeight;
      drawArtwork(ctx, images.get(nominee.artwork_url), 86, rowY + 10, 168, palette);
      let y = rowY + 3;
      ctx.fillStyle = palette.gold; ctx.font = 'bold 18px Arial, sans-serif';
      y += textBlock(ctx, category.name.replace(/\s*\(new for 2027\)/i, '').toUpperCase(), 282, y, 712, 24, 2) + 9;
      ctx.fillStyle = palette.text; ctx.font = '32px Georgia, serif';
      y += textBlock(ctx, nominee.title || nominee.artist, 282, y, 712, 38, 2) + 8;
      if (nominee.title && nominee.artist) {
        ctx.fillStyle = palette.muted; ctx.font = '21px Arial, sans-serif'; textBlock(ctx, nominee.artist, 282, y, 712, 26, 2);
      }
      if (index < pages[page].length - 1) { ctx.strokeStyle = palette.line; ctx.beginPath(); ctx.moveTo(86, startY + (index + 1) * rowHeight - 15); ctx.lineTo(994, startY + (index + 1) * rowHeight - 15); ctx.stroke(); }
    });
    ctx.strokeStyle = palette.gold; ctx.beginPath(); ctx.moveTo(86, 1786); ctx.lineTo(994, 1786); ctx.stroke();
    ctx.fillStyle = palette.gold; ctx.font = 'bold 22px Arial, sans-serif'; ctx.fillText('YOUR PICKS. YOUR SPOTLIGHT.', 86, 1810);
    ctx.fillStyle = palette.muted; ctx.font = '19px Arial, sans-serif'; ctx.fillText('marinellibr.github.io/grammy27', 86, 1847);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed. Please try again.')), 'image/png'));
    results.push({ missingArtworkCount, blob, url: URL.createObjectURL(blob), name: `my-grammy-2027-picks-${String(page + 1).padStart(2, '0')}.png` });
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
