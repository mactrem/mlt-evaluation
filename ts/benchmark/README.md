This folder contains micro-benchmarks related to the MapLibre Tile format.

### Use Case
Simulating user interactions with map applications, by zooming from zoom level 0 to 18 (14) into a POI in a major 
european city

### Datasets
- [OpenMapTiles unoptimized (OT1)](https://github.com/onthegomap/planetiler): with an earlier version of planetiler (0.6.0) generated OMT tileset which is less optimized
- [OptemMapTiles optimized (OT2)](https://github.com/onthegomap/planetiler): with a newer version of planetiler (0.8.3) generated OMT tileset which has vector tiles schema
  specific optimizations
- [SwissTopo Basemap (ST)](https://www.swisstopo.admin.ch/en/web-maps-base-map.): geospatial base dataset provided by a national surveying
- [OvertureMaps (OV)](https://explore.overturemaps.org.): novel emerging geospatial source format with integrated AI-captured data

### Benchmarks
- data-access: benchmarks with different data access patterns including sequential scan and random data access 
  (point lookups) based on a real world filtering example with an OMT basic style
- transcoding: benchmarks of the performance of decoding MLT and MVT in their in-memory representations