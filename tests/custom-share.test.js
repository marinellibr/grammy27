import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customBallotLink, readSharedBallot } from '../src/ballot.js';
const categories = [{ id: 'album-of-the-year' }, { id: 'best-pop-album' }, { id: 'best-new-artist' }];
test('shared category links round-trip at the Pages path without votes or unrelated URL data', () => {
 const link = new URL(customBallotLink('https://example.com/grammy27/?choices=private#old', ['best-new-artist', 'album-of-the-year', 'album-of-the-year'], categories));
 assert.equal(link.pathname, '/grammy27/'); assert.equal(link.search, '');
 assert.deepEqual(readSharedBallot(link.hash, categories), { status: 'valid', ids: ['album-of-the-year', 'best-new-artist'] });
 assert.equal(link.href.includes('private'), false);
});
test('invalid, obsolete and undersized lists never replace saved custom selections', () => {
 for (const hash of ['#custom=album-of-the-year&v=1', '#custom=album-of-the-year,unknown&v=1', '#custom=album-of-the-year,best-pop-album&v=2', '#custom=&v=1']) assert.equal(readSharedBallot(hash, categories).status, 'invalid');
 assert.equal(readSharedBallot('#main', categories).status, 'none');
 assert.throws(() => customBallotLink('https://example.com/', ['album-of-the-year', 'album-of-the-year'], categories));
});
