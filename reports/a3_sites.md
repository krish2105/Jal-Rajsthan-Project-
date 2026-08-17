# A3 — satellite-guided water-site discovery (why, how, what it found)

## Why not OpenStreetMap
The plan called for OSM water-body coordinates via Overpass. From this
environment the main endpoint returned **504** and every mirror
(kumi.systems, private.coffee) timed out, so the gazetteer route was
unavailable. Rather than fake it, the pipeline was inverted: **let the imagery
find its own targets.**

## Method
For each of the top-12 plan blocks: pull a low-cloud post-monsoon Sentinel-2
scene, read green + SWIR16 over a **6.4 km** window at the block centroid,
compute **MNDWI** = (green − swir)/(green + swir) — the standard index for
turbid inland water — then slide a **1.6 km** box (stride 800 m) and keep the
position with the highest water fraction. That position becomes the block's
tracked site.

A real bug was found and fixed here: the 20 m SWIR band was being upsampled by
`int(10/20) = 0`, silently producing empty arrays and a flat 0.0% everywhere.
Corrected to a factor of `round(1/scale)`, the same scenes immediately produced
plausible water fractions — a reminder that "all zeros" is a bug hypothesis
before it is a finding.

## What it found (2023 post-monsoon)
| site | district | water in box |
|---|---|---|
| Balotra | Barmer | **4.25%** |
| Jaisalmer_Rural | Jaisalmer | 1.19% |
| Rajgarh | Churu | 0.85% |
| Lalsot | Dausa | 0.36% |
| Dhorimanna | Barmer | 0.35% |
| Sheo | Barmer | 0.34% |
| Sankra | Jaisalmer | 0.16% |
| (5 further sites) | — | <0.1% |

7 of 12 blocks contain a detectable water body within 6.4 km of their centroid.
DeepWaterMap then tracks these coordinates across six seasonal windows
(2023–2025), which is what makes the verified-water-spread KPI meaningful —
the earlier centroid sampling was measuring bare sand.
