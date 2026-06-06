# @sailingnaturali/signalk-depth-offsets

Derive **`environment.depth.belowKeel`** and **`environment.depth.belowSurface`**
from `environment.depth.belowTransducer` using your vessel's measured transducer
offsets — for depth sounders that only emit NMEA0183 `DBT` (depth below
transducer) with no offset field.

Zero runtime dependencies.

## What it does

A `DBT`-only sounder maps to `environment.depth.belowTransducer` in Signal K, but
the keel/surface-referenced depths you actually navigate by (under-keel clearance)
are never produced. This plugin derives them, using the canonical Signal K
convention:

```
belowKeel    = belowTransducer + transducerToKeel    (transducerToKeel < 0)
belowSurface = belowTransducer + surfaceToTransducer  (surfaceToTransducer > 0)
```

The offsets come from the data model itself —
`environment.depth.transducerToKeel` and `environment.depth.surfaceToTransducer`
(typically set from `baseDeltas.json`). This plugin carries no offsets of its own;
it's the single transform, the profile is the single source of truth. A derived
path is only emitted when its offset is present.

## Install

Signal K admin → **Appstore** → search "depth offsets", or
`npm install @sailingnaturali/signalk-depth-offsets` in your Signal K data dir.
Set `environment.depth.transducerToKeel` / `surfaceToTransducer` in your vessel's
`baseDeltas.json` (or any source). No plugin configuration.

## License

MIT
