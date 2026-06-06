/*
 * signalk-depth-offsets
 *
 * The Wind Chaser's sounder emits NMEA0183 DBT only, which SignalK maps to
 * environment.depth.belowTransducer. There is no offset field on DBT, so the
 * keel/surface-referenced depths the agents actually reason about
 * (under-keel clearance) are never produced.
 *
 * This plugin derives them from the transducer offsets, using the canonical
 * SignalK convention:
 *   belowKeel    = belowTransducer + transducerToKeel   (transducerToKeel < 0)
 *   belowSurface = belowTransducer + surfaceToTransducer (surfaceToTransducer > 0)
 *
 * The offsets themselves (environment.depth.transducerToKeel /
 * surfaceToTransducer) come from baseDeltas.json, which the vessel_config
 * generator renders from the profile (vessels/profiles/*.yaml, offsets.*).
 * The profile is the single source of truth; this plugin carries no offset
 * values of its own — it just reads them back off the data model.
 */
module.exports = function (app) {
  const plugin = {
    id: 'signalk-depth-offsets',
    name: 'Depth offsets (belowKeel / belowSurface)',
    description:
      'Derive belowKeel and belowSurface from belowTransducer for DBT-only sounders.',
  };

  let unsubscribes = [];

  // No configuration: offsets are sourced from environment.depth.transducerToKeel
  // and surfaceToTransducer (set by baseDeltas from the vessel profile).
  plugin.schema = { type: 'object', properties: {} };

  // app.getSelfPath returns the full leaf node ({ value, timestamp, ... }) in
  // most server versions, but the bare value in some; handle both.
  function selfNumber(path) {
    const node = app.getSelfPath(path);
    if (node == null) return undefined;
    const v = typeof node === 'object' && 'value' in node ? node.value : node;
    return typeof v === 'number' ? v : undefined;
  }

  plugin.start = function () {
    app.subscriptionmanager.subscribe(
      {
        context: 'vessels.self',
        subscribe: [
          {
            path: 'environment.depth.belowTransducer',
            period: 1000,
          },
        ],
      },
      unsubscribes,
      (err) => app.error(err),
      (delta) => {
        const transducerToKeel = selfNumber('environment.depth.transducerToKeel');
        const surfaceToTransducer = selfNumber(
          'environment.depth.surfaceToTransducer'
        );
        if (transducerToKeel === undefined && surfaceToTransducer === undefined) {
          // Offsets not in the model yet (baseDeltas not applied) — nothing to derive.
          return;
        }
        (delta.updates || []).forEach((update) => {
          (update.values || []).forEach((v) => {
            if (
              v.path === 'environment.depth.belowTransducer' &&
              typeof v.value === 'number'
            ) {
              const values = [];
              if (transducerToKeel !== undefined) {
                values.push({
                  path: 'environment.depth.belowKeel',
                  value: v.value + transducerToKeel,
                });
              }
              if (surfaceToTransducer !== undefined) {
                values.push({
                  path: 'environment.depth.belowSurface',
                  value: v.value + surfaceToTransducer,
                });
              }
              if (values.length) {
                app.handleMessage(plugin.id, { updates: [{ values }] });
              }
            }
          });
        });
      }
    );
  };

  plugin.stop = function () {
    unsubscribes.forEach((f) => f());
    unsubscribes = [];
  };

  return plugin;
};
