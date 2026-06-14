import test from 'node:test';
import assert from 'node:assert/strict';
import createPlugin from './index.js';

const T2K = 'environment.depth.transducerToKeel';
const S2T = 'environment.depth.surfaceToTransducer';

// Run the plugin with the given offsets present in the data model, feed one
// belowTransducer value, and return the {path: value} pairs it published.
function derive(offsets, belowTransducer) {
  let onDelta;
  const sent = [];
  const app = {
    getSelfPath: (p) => (p in offsets ? { value: offsets[p] } : undefined),
    subscriptionmanager: { subscribe: (_sub, _unsub, _onErr, cb) => { onDelta = cb; } },
    handleMessage: (_id, delta) => sent.push(delta),
    error: () => {},
    debug: () => {},
  };
  const plugin = createPlugin(app);
  plugin.start();
  onDelta({
    updates: [{ values: [{ path: 'environment.depth.belowTransducer', value: belowTransducer }] }],
  });
  const values = sent.flatMap((d) => d.updates.flatMap((u) => u.values));
  return Object.fromEntries(values.map((v) => [v.path, v.value]));
}

test('derives belowKeel and belowSurface from belowTransducer + offsets', () => {
  // transducerToKeel < 0 (keel below the transducer); surfaceToTransducer > 0.
  const out = derive({ [T2K]: -0.5, [S2T]: 2 }, 38);
  assert.equal(out['environment.depth.belowKeel'], 37.5); // 38 + (-0.5)
  assert.equal(out['environment.depth.belowSurface'], 40); // 38 + 2
});

test('derives only belowKeel when surfaceToTransducer is absent', () => {
  const out = derive({ [T2K]: -0.5 }, 10);
  assert.equal(out['environment.depth.belowKeel'], 9.5);
  assert.ok(!('environment.depth.belowSurface' in out));
});

test('publishes nothing when both offsets are absent', () => {
  assert.deepEqual(derive({}, 10), {});
});

test('ignores non-number belowTransducer values', () => {
  assert.deepEqual(derive({ [T2K]: -0.5 }, null), {});
});
