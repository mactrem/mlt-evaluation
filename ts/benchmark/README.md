This folder contains micro-benchmarks related to the MapLibre tile format.

User Case: Realistic user session for zooming from zoom level 0 to 18 (14) into a POI in a major european city 

Data:  
- OpenMapTiles unoptimized: with an older version of planetiler generated OMT tileset which is less optimized
- OptemMapTiles optimized: with a newer version of planetiler generated OMT tileset which has vector tiles scheme 
  specific optimizations
- SwissTopo Basemap
- OvertureMaps

Structure
- data-access: benchmarks with different data access patterns including sequential scan and random data access 
  (point lookups) based on a real world filtering example with an OMT basic style
- transcoding: benchmarks of the performance of transcoding MLT and MVT in their in-memory representations