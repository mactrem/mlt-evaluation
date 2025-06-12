This folder contains benchmarks related to the MapLibre tile format.

Data
- omt/mlt
  - unoptimized: with an older version of planetiler generated OMT tileset which is less optimized
  - optimized: with a newer version of planetiler generated OMT tileset which is more optimized

Structure
- decoding: benchmarks the performance of the MLT vs MVT decoding process
- processing: benchmarks the performance of the MLT vs MVT processing time for example filtering
- general: general benchmarks like decoding of integers