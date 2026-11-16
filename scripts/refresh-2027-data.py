"""Merge a downloaded official full-list HTML into an existing enriched dataset.
Usage: PYTHONPATH=/tmp/grammy-deps python scripts/refresh-2027-data.py FULL_HTML ALBUM_MATCHES EMBED_DIRECTORY
Preserves existing nominee order and media IDs; refuses unreviewed changed nominees.
"""
import sys,json,re,datetime,copy,unicodedata,csv,collections
from pathlib import Path
from urllib.parse import urljoin
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1];PUBLIC=ROOT/'public'
FULL_URL='https://www.grammy.com/news/2027-grammys-full-nominations-full-winners-nominees-list/'
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
s=BeautifulSoup(Path(sys.argv[1]).read_text(),'html.parser')
d=json.loads((PUBLIC/'grammy-2027-nominations.json').read_text());old=copy.deepcopy(d);by={c['id']:c for c in d['categories']};matches=json.loads(Path(sys.argv[2]).read_text());embed_dir=Path(sys.argv[3]);categories=[];field=None
videos={'Lost Boys':('4KXnboPN1p4','Phoebe Bridgers'),'STORM':('x6_mbnsh6VU','GENER8ION'),'hate that i made you love me':('82-jTNka3uc','Ariana Grande'),'Click Clack Symphony.':('HtVcltkn3HI','RAYE'),'Berghain':('htQBS2Ikz6c','ROSALÍA')}
def norm(x):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',x or '').encode('ascii','ignore').decode().lower())
for node in s.select_one('.article-body').children:
 if getattr(node,'name',None) in ['h1','h2']:field=node.get_text(' ',strip=True)
 if getattr(node,'name',None)!='h3':continue
 link=node.find('a',href=True);cid=link['href'].rstrip('/').split('/')[-1];name=node.get_text(' ',strip=True);ps=[]
 for p in node.next_siblings:
  if getattr(p,'name',None) in ['h1','h2','h3']:break
  if getattr(p,'name',None)=='p' and p.find('strong'):ps.append(p)
 if cid in by:
  category=by[cid];assert len(ps)==len(category['nominees']),cid
  for p,n in zip(ps,category['nominees']):
   title=p.strong.get_text(' ',strip=True)
   if norm(title)!=norm(n['title'] or n['artist']):
    assert cid=='producer-of-the-year-classical' and title=='Elaine L. Martone' and n['artist']=='Elaine Martone',(cid,title,n['title'],n['artist'])
    n['artist']=title;n['source_entry']=title
   a=p.strong.find('a',href=True)
   if a:n['nomination_source_url']=urljoin('https://www.grammy.com',a['href'])
 else:
  category={'id':cid,'name':name,'announced_at':None,'source_url':urljoin('https://www.grammy.com',link['href']),'nominees':[]}
  for p in ps:
   title=p.strong.get_text(' ',strip=True);pcopy=BeautifulSoup(str(p),'html.parser').p;pcopy.strong.decompose();artist=re.sub(r'\s+,',',',pcopy.get_text(' ',strip=True));m=matches[title];e=json.loads((embed_dir/('embed-album-'+m['id']+'.json')).read_text())['entity']
   assert norm(e.get('title') or e.get('name'))==norm(title),(title,e.get('title'))
   assert norm(artist.split(',')[0]) in norm(e.get('subtitle','')),(artist,e.get('subtitle'))
   t=next((t for t in e.get('trackList',[]) if (t.get('audioPreview') or {}).get('url')),None)
   n={'title':title,'artist':artist,'nominee_type':'album','credits':None,'submitted_works':[],'source_entry':title+' '+artist,'spotify_id':m['id'],'spotify_type':'album','spotify_url':'https://open.spotify.com/album/'+m['id'],'spotify_status':'verified','spotify_verified_source':'https://open.spotify.com/embed/album/'+m['id'],'spotify_verification':'spotify_embed_entity','spotify_title':e.get('title') or e.get('name'),'spotify_artist':e.get('subtitle'),'preview_track_id':t['uri'].split(':')[-1] if t else None,'preview_url':t['audioPreview']['url'] if t else None}
   if t:n.update(preview_track_title=t['title'],preview_selection='first_available_track_on_album')
   a=p.strong.find('a',href=True)
   if a:n['nomination_source_url']=urljoin('https://www.grammy.com',a['href'])
   category['nominees'].append(n)
 category.update(name=name,official_number=len(categories)+1,field=field,full_list_source_url=FULL_URL)
 if cid=='best-music-video':
  for n in category['nominees']:
   id,channel=videos[n['title']];assert re.fullmatch(r'[A-Za-z0-9_-]{11}',id)
   n.update(youtube_video_id=id,youtube_url='https://www.youtube.com/watch?v='+id,youtube_embed_url='https://www.youtube-nocookie.com/embed/'+id,youtube_channel=channel,youtube_verified_source='https://www.youtube.com/watch?v='+id,youtube_verified_at=now)
 categories.append(category)
assert len(categories)==100 and sum(len(c['nominees']) for c in categories)==526
assert set(by).issubset({c['id'] for c in categories})
for before in old['categories']:
 after=next(c for c in categories if c['id']==before['id'])
 for a,b in zip(before['nominees'],after['nominees']):
  assert a.get('spotify_id')==b.get('spotify_id') and a.get('preview_track_id')==b.get('preview_track_id')
flat=[n for c in categories for n in c['nominees']];counts=collections.Counter(n['spotify_status'] for n in flat)
d.update(categories=categories,categories_count=100,nominations_count=526,collected_at=now,last_verified_at=now,source_url=FULL_URL,source_urls=[FULL_URL,'https://www.grammy.com/live-blog/','https://www.grammy.com/awards/categories/'],scope='All 100 categories and 526 nominations in the official complete 2027 Grammy nominations list.')
d['notes'][0]='As 100 categorias e 526 indicações foram conferidas com a lista oficial completa do Grammy 2027; os 98 conjuntos existentes mantêm a ordem dos indicados e seus IDs de mídia.'
video_note='Best Music Video inclui youtube_video_id, youtube_url e youtube_embed_url dos cinco clipes oficiais. A disponibilidade da reprodução depende do YouTube.'
if video_note not in d['notes']:d['notes'].append(video_note)
d['spotify_summary']={'verified_nominations':counts['verified'],'with_preview_url':sum(bool(n.get('preview_url')) for n in flat),'unresolved_nominations':counts['unresolved'],'not_applicable_nominations':sum(v for k,v in counts.items() if k.startswith('not_applicable')),'statuses':dict(counts)}
d['youtube_summary']={'music_video_nominees':5,'official_video_ids':5}
(PUBLIC/'grammy-2027-nominations.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
pending=[{'category':c['name'],'title':n['title'],'artist':n['artist'],'nominee_type':n['nominee_type'],'source_url':c['source_url']} for c in categories for n in c['nominees'] if n['spotify_status']=='unresolved']
(PUBLIC/'grammy-2027-spotify-pendencias.json').write_text(json.dumps(pending,ensure_ascii=False,indent=2)+'\n')
catalog={'award_year':2027,'updated_at':now,'source_url':FULL_URL,'categories_count':100,'classification_status':'Awaiting user selection for Full Experience and Main Categories. Full Experience currently includes all categories.','categories':[{'number':c['official_number'],'id':c['id'],'name':c['name'],'field':c['field'],'nominees_count':len(c['nominees'])} for c in categories]}
(PUBLIC/'categories.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
with (PUBLIC/'categories.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.writer(f);w.writerow(['Number','Field','Category','ID','Nominees','Full Experience','Main Categories'])
 for c in catalog['categories']:w.writerow([c['number'],c['field'],c['name'],c['id'],c['nominees_count'],'Included (current default)','Pending decision'])
lines=['# Grammy 2027 — all 100 categories','',f'Source: {FULL_URL}','','Full Experience currently contains all categories. Main Categories is awaiting selection.',''];last=None
for c in catalog['categories']:
 if c['field']!=last:lines+=['','## '+c['field'],''];last=c['field']
 lines.append(str(c['number'])+'. '+c['name'])
(PUBLIC/'categories.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'categories':100,'nominations':526,'spotify':d['spotify_summary'],'youtube':d['youtube_summary']},ensure_ascii=False))
