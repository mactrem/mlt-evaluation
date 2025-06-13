# maplibre-tile-spec

This project contains a Java encoder and decoder for the MapLibre Tile (MLT) vector tile format.

## Preparing the Environment

Install a current version (>= 21) of Java.

To build the project run the following command:
````bash
./gradlew assemble
````

## Running the benchmarks

To run the encoding and compression benchmarks run:
````bash
./gradlew test --tests com.mlt.experiments.Compression
````

Benchmark Variants:
- Advanced Morton Encodings, ID Reassigned, No Pre-Tessellation: Uses advanced encodings such FastPfor, FSST and 
  Morton Vertex-Dictionary encoding in combination with optimizations on the existing MVT dataset to additionally 
  reduce the size such as in some case id regeneration (without information loss) and sorting of the features
- Advanced Morton Encodings, No Optimization, No Pre-Tessellation: Uses advanced encodings but does not additionally 
  process the dataset
- Simple Encodings, No Optimization, No Pre-Tessellation: Uses only simple encodings. These encodings are 
  currently supported by the TypeScript decoder since the advanced encodings are currently only supported by the 
  Java decoder


## Methodology
### Use Case
Simulating user interactions with map applications, by zooming from zoom level 0 to 18 (14) into a POI in a major 
european city  
  
### Datasets
- [OpenMapTiles unoptimized (OT1)](https://github.com/onthegomap/planetiler): with an earlier version of planetiler (0.6.0) generated OMT tileset which is less optimized
- [OptemMapTiles optimized (OT2)](https://github.com/onthegomap/planetiler): with a newer version of planetiler (0.8.3) generated OMT tileset which has vector tiles schema
  specific optimizations
- [SwissTopo Basemap (ST)](https://www.swisstopo.admin.ch/en/web-maps-base-map): geospatial base dataset provided by a national surveying
- [OvertureMaps (OV)](https://explore.overturemaps.org): novel emerging geospatial source format with integrated AI-captured data
