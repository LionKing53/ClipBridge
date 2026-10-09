import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptLegacy, replaceOnce } from '../scripts/legacy-language-adapter.js';
test('language compatibility patch refuses unknown sources and ambiguous replacements', () => {
  assert.throws(()=>adaptLegacy({}, {}, {}), /Unreviewed legacy program source/);
  assert.throws(()=>replaceOnce('xx','x','y'), /shape mismatch/);
  assert.throws(()=>replaceOnce('data','absent','y'), /shape mismatch/);
  assert.equal(replaceOnce('user-content: retained; UI: old','UI: old','UI: translated'),'user-content: retained; UI: translated');
});
