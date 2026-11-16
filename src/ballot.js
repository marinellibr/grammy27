export const STORAGE_KEY = 'grammy27-ballot-v1';
export const CATEGORY_ORDER = ['album-of-the-year', 'record-of-the-year', 'song-of-the-year', 'best-new-artist'];

export function orderCategories(categories) {
  return [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.id), bi = CATEGORY_ORDER.indexOf(b.id);
    return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi);
  });
}

export function categoriesForMode(categories, mode, config, customCategoryIds = []) {
  if (mode !== 'main' && mode !== 'custom') return categories;
  const selectedIds = mode === 'custom' ? customCategoryIds : config.mainCategoryIds;
  const ids = new Set(Array.isArray(selectedIds) ? selectedIds : []);
  return categories.filter(category => ids.has(category.id));
}

export function validCustomCategories(ids, categories) {
  const selected = new Set(Array.isArray(ids) ? ids : []);
  return categories.filter(category => selected.has(category.id)).map(category => category.id);
}

export function canStartBallot(categories, mode) {
  return categories.length >= (mode === 'custom' ? 2 : 1);
}

export function validChoices(choices, categories) {
  const clean = {};
  if (!choices || typeof choices !== 'object') return clean;
  for (const category of categories) {
    const index = choices[category.id];
    if (Number.isInteger(index) && index >= 0 && index < category.nominees.length) clean[category.id] = index;
  }
  return clean;
}

export function hasChoice(choices, category) {
  return category && Number.isInteger(choices[category.id]) && choices[category.id] >= 0 && choices[category.id] < category.nominees.length;
}

export function getPicks(categories, choices) {
  return categories.filter(category => hasChoice(choices, category)).map(category => ({ category, nominee: category.nominees[choices[category.id]] }));
}

export function isAlbumCategory(name) {
  return /\balbum\b/i.test(String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

export function getEmbed(nominee, categoryName = '') {
  if (isAlbumCategory(categoryName)) {
    const id = nominee.spotify_album_id || (nominee.spotify_type === 'album' ? nominee.spotify_id : null);
    return /^[a-zA-Z0-9]{22}$/.test(id || '') ? { type: 'album', id, representative: false } : null;
  }
  if (/^[a-zA-Z0-9]{22}$/.test(nominee.preview_track_id || '')) return { type: 'track', id: nominee.preview_track_id, representative: nominee.preview_selection !== 'nominated_track' };
  if (['track', 'album', 'artist'].includes(nominee.spotify_type) && /^[a-zA-Z0-9]{22}$/.test(nominee.spotify_id || '')) return { type: nominee.spotify_type, id: nominee.spotify_id, representative: nominee.spotify_type !== 'track' };
  const work = nominee.submitted_works?.find(work => ['track', 'album', 'artist'].includes(work.spotify_type) && /^[a-zA-Z0-9]{22}$/.test(work.spotify_id || ''));
  return work ? { type: work.spotify_type, id: work.spotify_id, representative: true } : null;
}

export function getYouTubeVideo(nominee) {
  const id = nominee.youtube_video_id;
  if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return null;
  return { id, url: `https://www.youtube.com/watch?v=${id}`, embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1` };
}

export function readSaved(categories) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { /* A ballot also works without storage. */ }
  return {
    choices: validChoices(saved.choices, categories),
    mode: ['main', 'custom'].includes(saved.mode) ? saved.mode : 'full',
    customCategoryIds: validCustomCategories(saved.customCategoryIds, categories),
    autoAdvance: saved.autoAdvance === true,
    cursor: typeof saved.cursor === 'string' ? saved.cursor : null,
  };
}

export function storyPages(picks, perPage = 6) {
  if (!Number.isInteger(perPage) || perPage < 1) throw new Error('Invalid page size');
  return Array.from({ length: Math.ceil(picks.length / perPage) }, (_, page) => picks.slice(page * perPage, (page + 1) * perPage));
}
