import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { STORAGE_KEY, orderCategories, categoriesForMode, getPicks, hasChoice, getEmbed, readSaved, canStartBallot } from './ballot';
import { generateStories, downloadBlob, downloadAllStories } from './story';
import './styles.css';

function Icon({ name, size = 20, ...props }) {
  const paths = {
    arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
    back: <><path d="M20 12H4m6-6-6 6 6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    moon: <path d="M20.8 13.1A9 9 0 0 1 10.9 3.2a9 9 0 1 0 9.9 9.9Z" />,
    star: <path d="m12 3 2.6 5.7 6.2.7-4.6 4.2 1.3 6.1-5.5-3.1-5.5 3.1 1.3-6.1-4.6-4.2 6.2-.7Z" />,
    headphones: <><path d="M4 14v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="12" width="4" height="8" rx="2" /><rect x="17" y="12" width="4" height="8" rx="2" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    share: <><path d="M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8" /></>,
    spark: <><path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z" /></>,
    external: <><path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

function Switch({ checked, onChange, label, id }) {
  return <button id={id} className="switch-control" type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span className={`switch-track ${checked ? 'on' : ''}`} aria-hidden="true"><span /></span><span>{label}</span></button>;
}

function App() {
  const [loaded, setLoaded] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(['grammy-2027-nominations.json', 'ballot-config.json'].map(path => fetch(`${import.meta.env.BASE_URL}${path}`, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('Could not load the ballot.'); return response.json(); })))
      .then(([data, config]) => { if (!Array.isArray(data.categories) || !data.categories.length) throw new Error('The ballot is not available yet.'); setLoaded({ data: { ...data, categories: orderCategories(data.categories) }, config }); })
      .catch(error => { if (error.name !== 'AbortError') setError(error.message); });
    return () => controller.abort();
  }, []);
  if (error) return <div className="load-state"><Icon name="star" size={32} /><h1>Let’s try that again.</h1><p>{error}</p><button className="button primary" onClick={() => location.reload()}>Reload ballot</button></div>;
  if (!loaded) return <div className="load-state" role="status"><div className="loading-mark"><Icon name="spark" size={38} /></div><p>Setting the stage…</p></div>;
  return <BallotApp {...loaded} />;
}

function BallotApp({ data, config }) {
  const [saved] = useState(() => readSaved(data.categories));
  const [screen, setScreen] = useState('home'), [mode, setMode] = useState(saved.mode), [choices, setChoices] = useState(saved.choices), [autoAdvance, setAutoAdvance] = useState(saved.autoAdvance);
  const [customCategoryIds, setCustomCategoryIds] = useState(saved.customCategoryIds), [categoryQuery, setCategoryQuery] = useState('');
  const [index, setIndex] = useState(0), [editing, setEditing] = useState(false), [theme, setTheme] = useState(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  const [storageWarning, setStorageWarning] = useState(false), [storyOpen, setStoryOpen] = useState(false), [restartOpen, setRestartOpen] = useState(false);
  const heading = useRef(null), pendingAdvance = useRef(null);
  const categories = useMemo(() => categoriesForMode(data.categories, mode, config, customCategoryIds), [data.categories, mode, config, customCategoryIds]);
  const mainCategories = useMemo(() => categoriesForMode(data.categories, 'main', config), [data.categories, config]);
  const picks = getPicks(categories, choices), category = categories[index], selected = category && hasChoice(choices, category), completed = categories.length > 0 && picks.length === categories.length;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#080808' : '#ffffff');
    try { localStorage.setItem('grammy27-theme', theme); } catch {}
  }, [theme]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ choices, mode, customCategoryIds, autoAdvance, cursor: category?.id || saved.cursor })); setStorageWarning(false); } catch { setStorageWarning(true); }
  }, [choices, mode, customCategoryIds, autoAdvance, category?.id, saved.cursor]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
    return () => clearTimeout(pendingAdvance.current);
  }, [screen, index]);
  useEffect(() => () => clearTimeout(pendingAdvance.current), []);

  function start() {
    if (!canStartBallot(categories, mode)) return;
    const firstUnanswered = categories.findIndex(category => !hasChoice(choices, category));
    setEditing(false);
    if (firstUnanswered === -1) setScreen('summary');
    else { setIndex(firstUnanswered); setScreen('ballot'); }
  }
  function next() {
    clearTimeout(pendingAdvance.current);
    if (!selected) return;
    if (editing) { setEditing(false); setScreen('summary'); }
    else if (index === categories.length - 1) { if (completed) setScreen('summary'); else setIndex(categories.findIndex(category => !hasChoice(choices, category))); }
    else setIndex(index + 1);
  }
  function choose(nomineeIndex) {
    clearTimeout(pendingAdvance.current);
    const updated = { ...choices, [category.id]: nomineeIndex };
    setChoices(updated);
    if (autoAdvance && !editing) pendingAdvance.current = setTimeout(() => {
      if (index === categories.length - 1) {
        const missing = categories.findIndex(category => !hasChoice(updated, category));
        if (missing < 0) setScreen('summary'); else setIndex(missing);
      } else setIndex(index + 1);
    }, 350);
  }
  function back() {
    clearTimeout(pendingAdvance.current);
    if (editing) { setEditing(false); setScreen('summary'); }
    else if (index === 0) setScreen(mode === 'custom' ? 'customize' : 'home');
    else setIndex(index - 1);
  }
  function changeMode(value) { clearTimeout(pendingAdvance.current); setMode(value); }
  function toggleCategory(id) {
    setCustomCategoryIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }
  const visibleCategories = data.categories.filter(category => category.name.toLowerCase().includes(categoryQuery.trim().toLowerCase()));
  const fullPicks = getPicks(data.categories, choices).length;
  const stageLabel = screen === 'summary' ? 'Your ballot' : screen === 'ballot' ? 'Make your picks' : screen === 'customize' ? 'Build your ballot' : 'The fan ballot';

  return <div className={`app ${screen === 'ballot' || screen === 'customize' ? 'with-dock' : ''}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-inner">
      <button className="brand" onClick={() => { clearTimeout(pendingAdvance.current); setScreen('home'); }} aria-label="Grammy 2027 home"><span className="brand-symbol"><Icon name="spark" size={23} /></span><span>GRAMMY<span className="brand-year">27</span></span></button>
      <span className="header-caption">{stageLabel}</span>
      <button className="theme-toggle" type="button" role="switch" aria-checked={theme === 'dark'} aria-label="Dark mode" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'moon' : 'sun'} size={18} /><span>{theme === 'dark' ? 'Dark' : 'Light'}</span></button>
    </div></header>

    <main id="main" className={`main-content ${screen}`}>
      {storageWarning && <div className="notice" role="status">Your browser cannot save progress. Keep this tab open to finish your ballot.</div>}
      {screen === 'home' && <>
        <section className="hero"><div className="hero-copy"><p className="eyebrow"><span className="gold-dot" /> THE 69TH GRAMMY AWARDS · 2027</p><h1 ref={heading} tabIndex="-1">Your picks.<br /><em>Your spotlight.</em></h1><p className="hero-description">A year of incredible music. A ballot that’s all yours.<br className="desktop-break" /> Listen to the nominees, pick your favorites, and share your own winners.</p><div className="hero-details"><span><Icon name="headphones" size={16} /> Listen as you go</span><span><Icon name="check" size={16} /> Saved on your device</span></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="vinyl"><div className="vinyl-grooves" /><div className="vinyl-label"><Icon name="spark" size={38} /><span>YOUR<br />WINNERS</span><i /></div></div><span className="art-caption">GOOD MUSIC. GREAT INSTINCTS.</span><span className="floating-star"><Icon name="spark" size={32} /></span></div></section>
        <section className="mode-section" aria-labelledby="mode-heading"><div className="section-intro"><div><p className="eyebrow">FIRST, SET THE STAGE</p><h2 id="mode-heading">How do you want to play?</h2></div><span className="small-muted">Pick your ballot</span></div>
          <div className="mode-options" role="radiogroup" aria-label="Ballot version">
            <label className={`mode-card ${mode === 'full' ? 'is-selected' : ''}`}><input type="radio" name="mode" value="full" checked={mode === 'full'} onChange={() => changeMode('full')} /><span className="mode-top"><span className="mode-icon"><Icon name="grid" size={24} /></span><span className="radio-visual" aria-hidden="true">{mode === 'full' && <span />}</span></span><span className="mode-name">The full experience</span><span className="mode-description">Every genre. Every category. Give all your favorites their moment.</span><span className="mode-bottom"><span className="pill">{data.categories.length} categories</span><span>For the music obsessed</span></span></label>
            <label className={`mode-card ${mode === 'main' ? 'is-selected' : ''}`}><input type="radio" name="mode" value="main" checked={mode === 'main'} onChange={() => changeMode('main')} /><span className="mode-top"><span className="mode-icon"><Icon name="star" size={25} /></span><span className="radio-visual" aria-hidden="true">{mode === 'main' && <span />}</span></span><span className="mode-name">Main categories</span><span className="mode-description">The headline moments. A shorter ballot for your biggest predictions.</span><span className="mode-bottom"><span className="pill">{mainCategories.length ? `${mainCategories.length} categories` : 'Coming soon'}</span><span>A little less, just as golden</span></span></label>
            <label className={`mode-card custom-mode-card ${mode === 'custom' ? 'is-selected' : ''}`}><input type="radio" name="mode" value="custom" checked={mode === 'custom'} onChange={() => changeMode('custom')} /><span className="mode-top"><span className="mode-icon"><Icon name="check" size={25} /></span><span className="radio-visual" aria-hidden="true">{mode === 'custom' && <span />}</span></span><span className="mode-name">Custom categories</span><span className="mode-description">Your genres. Your favorites. Build a ballot with the categories you care about.</span><span className="mode-bottom"><span className="pill">Choose 2 or more</span><span>Make it your own</span></span></label>
          </div>
          {mode === 'main' && !mainCategories.length && <p className="mode-note" role="status">The main-category lineup is still being curated. The full experience is ready whenever you are.</p>}
          <div className="start-row"><button className="button primary start-button" disabled={mode !== 'custom' && !categories.length} onClick={() => mode === 'custom' ? setScreen('customize') : start()}>{mode === 'custom' ? 'Choose my categories' : !categories.length ? 'Lineup coming soon' : completed ? 'View my ballot' : picks.length ? 'Continue my ballot' : 'Let’s make some picks'}<Icon name="arrow" size={19} /></button><span className="start-caption">{mode === 'custom' ? `${customCategoryIds.length} ${customCategoryIds.length === 1 ? 'category' : 'categories'} selected · Pick at least 2` : picks.length ? `${picks.length} of ${categories.length} picks saved` : 'No sign-up. Just your taste.'}</span></div>
          {fullPicks > 0 && mode === 'main' && !categories.length && <p className="small-muted">Your {fullPicks} saved picks are waiting in the full experience.</p>}
        </section>
        <div className="how-it-works"><span><b>01</b> Choose your ballot</span><Icon name="arrow" size={15} /><span><b>02</b> Listen & pick</span><Icon name="arrow" size={15} /><span><b>03</b> Share your spotlight</span></div>
      </>}

      {screen === 'customize' && <>
        <div className="ballot-topline"><button className="text-button" onClick={() => setScreen('home')}><Icon name="back" size={16} /> Ballot versions</button><span>CUSTOM CATEGORIES</span></div>
        <section className="category-heading custom-heading"><p className="eyebrow">A BALLOT THAT SOUNDS LIKE YOU</p><h1 ref={heading} tabIndex="-1">Set your own stage.</h1><p>Pick the categories you want to vote in. Select at least two to get started.</p></section>
        <div className="category-picker-tools"><label className="category-search"><span>Find a category</span><input type="search" value={categoryQuery} onChange={event => setCategoryQuery(event.target.value)} placeholder="Search categories…" /></label><div className="category-bulk-actions"><button className="text-button" onClick={() => setCustomCategoryIds(data.categories.map(category => category.id))}>Select all {data.categories.length}</button><button className="text-button" disabled={!customCategoryIds.length} onClick={() => setCustomCategoryIds([])}>Clear selection</button></div></div>
        <fieldset className="category-picker"><legend className="sr-only">Choose at least two categories for your custom ballot</legend>{visibleCategories.map(item => { const checked = customCategoryIds.includes(item.id); return <label key={item.id} className={`category-pick-card ${checked ? 'is-selected' : ''}`}><input type="checkbox" checked={checked} onChange={() => toggleCategory(item.id)} aria-label={item.name.replace(/\s*\(new for 2027\)/i, '')} /><span className="category-pick-check" aria-hidden="true">{checked && <Icon name="check" size={15} />}</span><span className="category-pick-copy"><span className="category-pick-name">{item.name.replace(/\s*\(new for 2027\)/i, '')}</span><span className="category-pick-count">{item.nominees.length} nominees</span></span></label>; })}</fieldset>
        {!visibleCategories.length && <p className="category-empty" role="status">No categories match “{categoryQuery}”. Try another search.</p>}
        <div className="ballot-dock category-picker-dock"><div className="dock-inner"><p className="category-selection-status" role="status"><strong>{customCategoryIds.length} selected</strong><span>{customCategoryIds.length < 2 ? `Choose ${2 - customCategoryIds.length} more to continue` : 'Your custom ballot is ready'}</span></p><div className="dock-navigation"><button className="button secondary" onClick={() => setScreen('home')}><Icon name="back" size={18} /> Back</button><button className="button primary" disabled={!canStartBallot(categories, mode)} onClick={start}>Continue with {customCategoryIds.length} {customCategoryIds.length === 1 ? 'category' : 'categories'}<Icon name="arrow" size={18} /></button></div></div></div>
      </>}

      {screen === 'ballot' && category && <>
        <div className="ballot-topline"><button className="text-button" onClick={() => { clearTimeout(pendingAdvance.current); setScreen(mode === 'custom' ? 'customize' : 'home'); }}><Icon name="back" size={16} /> {mode === 'custom' ? 'Your categories' : 'Your ballot'}</button><span>{mode === 'full' ? 'FULL EXPERIENCE' : mode === 'custom' ? 'CUSTOM CATEGORIES' : 'MAIN CATEGORIES'}</span></div>
        <div className="stepper" aria-label="Ballot progress"><div className="stepper-copy"><span>Category <strong>{String(index + 1).padStart(2, '0')}</strong><span className="stepper-total"> / {categories.length}</span></span><span>{picks.length} of {categories.length} picked</span></div><div className="progress-track" role="progressbar" aria-label="Categories picked" aria-valuemin="0" aria-valuemax={categories.length} aria-valuenow={picks.length}><span style={{ width: `${picks.length / categories.length * 100}%` }} /></div><div className="step-dots" aria-hidden="true">{Array.from({ length: Math.min(categories.length, 12) }, (_, i) => <span key={i} className={i < Math.ceil(picks.length / categories.length * Math.min(categories.length, 12)) ? 'filled' : ''} />)}</div></div>
        <section className="category-heading"><p className="eyebrow">THE NOMINEES ARE IN. THE PICK IS YOURS.</p><h1 ref={heading} tabIndex="-1">{category.name.replace(/\s*\(new for 2027\)/i, '')}</h1><p>Press play. Find your favorite. Give them your vote.</p><div className="category-meta"><span><Icon name="headphones" size={15} /> Listen with Spotify</span><span>{category.nominees.length} nominees · Choose one</span></div></section>
        <fieldset className="nominee-list" key={`${category.id}-${theme}`}><legend className="sr-only">Choose your pick for {category.name}</legend>{category.nominees.map((nominee, nomineeIndex) => <NomineeCard key={`${category.id}-${nomineeIndex}`} nominee={nominee} index={nomineeIndex} checked={choices[category.id] === nomineeIndex} onChoose={() => choose(nomineeIndex)} theme={theme} categoryId={category.id} />)}</fieldset>
        <div className="category-footnote"><Icon name="headphones" size={16} /><p>Spotify controls playback and preview availability. Album and artist nominees may use a representative track. You can still pick any nominee.</p></div>
        <div className="ballot-dock"><div className="dock-inner">{!editing && <div className="auto-row"><Switch id="auto-advance" checked={autoAdvance} onChange={value => { clearTimeout(pendingAdvance.current); setAutoAdvance(value); }} label="Advance on selection" /><span className="saved-note"><Icon name="check" size={13} /> {storageWarning ? 'This session only' : 'Progress saved'}</span></div>}<div className="dock-navigation"><button className="button secondary" onClick={back}><Icon name="back" size={18} />{editing ? 'Summary' : 'Back'}</button><span className="selection-hint" aria-live="polite">{selected ? 'Your pick is in.' : 'Choose a nominee to continue'}</span><button className="button primary" onClick={next} disabled={!selected}>{editing ? 'Save pick' : index === categories.length - 1 ? 'See my picks' : 'Next category'}<Icon name={index === categories.length - 1 || editing ? 'check' : 'arrow'} size={18} /></button></div></div></div>
      </>}

      {screen === 'summary' && <>
        <section className="summary-hero"><div className="completion-mark"><Icon name="check" size={32} /></div><p className="eyebrow">THAT’S A WRAP</p><h1 ref={heading} tabIndex="-1">Your ballot.<br /><em>Your kind of golden.</em></h1><p>{picks.length} categories. {picks.length} favorites. One very good taste in music.</p><button className="button primary" onClick={() => setStoryOpen(true)}><Icon name="share" size={19} /> Create my Instagram story</button><span className="summary-export-note">1080 × 1920 · Ready for Stories · {Math.ceil(picks.length / 6)} {Math.ceil(picks.length / 6) === 1 ? 'image' : 'images'} with all your picks</span></section>
        <div className="section-intro summary-intro"><div><p className="eyebrow">YOUR WINNERS’ CIRCLE</p><h2>Every pick, in one place.</h2></div><span className="count-badge">{picks.length} picks</span></div>
        <div className="summary-list">{picks.map(({ category, nominee }) => <article className="summary-card" key={category.id}><div className="summary-check"><Icon name="check" size={17} /></div><div className="summary-card-copy"><p className="summary-category">{category.name.replace(/\s*\(new for 2027\)/i, '')}</p><h3>{nominee.title || nominee.artist}</h3>{nominee.title && <p className="summary-artist">{nominee.artist}</p>}</div><button className="edit-button" onClick={() => { setIndex(categories.findIndex(item => item.id === category.id)); setEditing(true); setScreen('ballot'); }} aria-label={`Edit your pick for ${category.name}`}>Edit</button></article>)}</div>
        <div className="summary-actions"><button className="button primary" onClick={() => setStoryOpen(true)}><Icon name="share" size={18} /> Create my story</button><button className="text-button" onClick={() => setRestartOpen(true)}>Start a fresh ballot</button></div>
      </>}
      {screen !== 'ballot' && screen !== 'customize' && <footer className="site-footer"><span className="footer-brand"><Icon name="spark" size={17} /> MADE FOR THE LOVE OF MUSIC.</span><p>An independent fan ballot. Your picks stay on this device.</p><div><a href="https://www.grammy.com/live-blog/" target="_blank" rel="noreferrer">Official nominees <Icon name="external" size={12} /></a><span>·</span><a href={`${import.meta.env.BASE_URL}grammy-2027-nominations.json`} target="_blank" rel="noreferrer">Nomination data</a></div><p className="snapshot-note">Nominee snapshot · November 16, 2026</p></footer>}
    </main>
    {storyOpen && <StoryModal picks={picks} theme={theme} onClose={() => setStoryOpen(false)} />}
    {restartOpen && <Dialog title="A fresh set of picks?" onClose={() => setRestartOpen(false)}><p className="dialog-description">This will clear all your saved selections, including picks in the other ballot version.</p><div className="dialog-actions"><button className="button secondary" onClick={() => setRestartOpen(false)}>Keep my picks</button><button className="button primary" onClick={() => { setChoices({}); setIndex(0); setEditing(false); setRestartOpen(false); setScreen('home'); }}>Start fresh</button></div></Dialog>}
  </div>;
}

function NomineeCard({ nominee, index, checked, onChoose, theme, categoryId }) {
  const embed = getEmbed(nominee), search = `https://open.spotify.com/search/${encodeURIComponent([nominee.title, nominee.artist].filter(Boolean).join(' '))}`;
  const [playerState, setPlayerState] = useState('loading');
  useEffect(() => { if (!embed) return; const timeout = setTimeout(() => setPlayerState(state => state === 'loading' ? 'slow' : state), 12000); return () => clearTimeout(timeout); }, [embed?.id]);
  return <article className={`nominee-card ${checked ? 'is-picked' : ''}`}>
    <label className="nominee-label"><input type="radio" name={`nominee-${categoryId}`} value={index} checked={checked} onChange={onChoose} /><span className="nominee-number">{String(index + 1).padStart(2, '0')}</span><span className="nominee-copy"><span className="nominee-title">{nominee.title || nominee.artist}</span>{nominee.title && <span className="nominee-artist">{nominee.artist || 'Various artists'}</span>}</span><span className="nominee-radio" aria-hidden="true">{checked && <Icon name="check" size={14} />}</span></label>
    {embed ? <div className="nominee-preview">
      {embed.representative && <p className="preview-caption">{nominee.preview_track_title ? `Preview: ${nominee.preview_track_title}` : 'A track from this nominee’s work'}</p>}
      <div className={`spotify-frame ${playerState === 'loading' ? 'is-loading' : ''}`} style={{ minHeight: embed.type === 'track' ? 80 : 152 }}><iframe src={`https://open.spotify.com/embed/${embed.type}/${embed.id}?utm_source=generator&theme=${theme === 'dark' ? '0' : '1'}`} title={`Spotify preview: ${nominee.title || nominee.artist}${nominee.title ? ` — ${nominee.artist || ''}` : ''}`} width="100%" height={embed.type === 'track' ? '80' : '152'} loading="lazy" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen onLoad={() => setPlayerState('ready')} onError={() => setPlayerState('slow')} /></div>
      <div className="spotify-link-row">{playerState === 'slow' && <span>Player taking a moment?</span>}<a href={`https://open.spotify.com/${embed.type}/${embed.id}`} target="_blank" rel="noreferrer">Open in Spotify <Icon name="external" size={10} /></a></div>
    </div> : <div className="unavailable-preview"><Icon name="headphones" size={17} /><div><span>Spotify preview not available</span><a href={search} target="_blank" rel="noreferrer">Find on Spotify <Icon name="external" size={11} /></a></div></div>}
    {checked && <span className="picked-label"><Icon name="check" size={12} /> YOUR PICK</span>}
  </article>;
}

function Dialog({ title, onClose, children, className = '' }) {
  const dialog = useRef(null), closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement, previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = dialog.current;
    node.querySelector('button')?.focus();
    function keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const focusable = [...node.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); before?.focus(); };
  }, []);
  return <div className="dialog-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><section className={`dialog ${className}`} ref={dialog} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-top"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button></div>{children}</section></div>;
}

function StoryModal({ picks, theme, onClose }) {
  const [stories, setStories] = useState([]), [page, setPage] = useState(0), [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true, generated = [];
    generateStories(picks, theme).then(results => { generated = results; if (active) setStories(results); else results.forEach(story => URL.revokeObjectURL(story.url)); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; generated.forEach(story => URL.revokeObjectURL(story.url)); };
  }, [picks, theme]);
  const current = stories[page];
  async function downloadAll() { setBusy(true); setError(''); try { await downloadAllStories(stories); setNotice('Your story images are ready in the downloaded ZIP.'); } catch { setError('Could not download the images. Try saving them one at a time.'); } finally { setBusy(false); } }
  async function share() {
    if (!current) return;
    setError(''); setNotice('');
    const file = new File([current.blob], current.name, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'My Grammy 2027 picks' });
      else { downloadBlob(current.blob, current.name); setNotice('Image saved. Open Instagram and add it to your Story.'); }
    } catch (error) { if (error.name !== 'AbortError') setError('Sharing is not available here. Use “Save image” instead.'); }
  }
  return <Dialog title="Your picks, story-ready." onClose={onClose} className="story-dialog"><p className="dialog-description">{stories.length > 1 ? `Your complete ballot is split into ${stories.length} images, with every pick included.` : 'A little gold for your Instagram Story.'} Save an image, then add it to your Story.</p>
    {error && <p className="notice" role="alert">{error}</p>}
    {!stories.length && !error && <div className="story-loading" role="status"><div className="loading-mark"><Icon name="spark" size={32} /></div>Giving your picks the golden treatment…</div>}
    {current && <><div className="story-preview-wrap"><img className="story-preview" src={current.url} alt={`Instagram Story ${page + 1} of ${stories.length}, showing your picks for ${picks.slice(page * 6, (page + 1) * 6).map(pick => pick.category.name).join(', ')}`} width="1080" height="1920" /></div><div className="story-pagination"><button className="icon-button" aria-label="Previous story" disabled={page === 0} onClick={() => setPage(page - 1)}><Icon name="back" /></button><span aria-live="polite">Story {page + 1} of {stories.length}</span><button className="icon-button" aria-label="Next story" disabled={page === stories.length - 1} onClick={() => setPage(page + 1)}><Icon name="arrow" /></button></div><div className="story-buttons"><button className="button primary" onClick={() => { downloadBlob(current.blob, current.name); setNotice('Image saved. Open Instagram and add it to your Story.'); }}><Icon name="download" size={17} /> Save image</button><button className="button secondary" onClick={share}><Icon name="share" size={17} /> Share image</button></div>{stories.length > 1 && <button className="text-button download-all" onClick={downloadAll} disabled={busy}>{busy ? 'Preparing download…' : `Download all ${stories.length} stories (ZIP)`}<Icon name="download" size={14} /></button>}<p className="story-hint">1080 × 1920 PNG · {theme === 'dark' ? 'Black' : 'White'} & gold</p>{notice && <p className="share-notice" role="status">{notice}</p>}</>}
  </Dialog>;
}

createRoot(document.getElementById('root')).render(<App />);
