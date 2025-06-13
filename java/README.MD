# maplibre-tile-spec

This project contains a Java converter and decoder for the MapLibre Tile (MLT) vector tile format.

## Preparing the Environment

Install a current version (>= 21) of Java.

To build the project run the following command:
````bash
./gradlew assemble
````

Since the OvertureMaps dataset is to large to 

To run the encoding and compression benchmarks run:
````bash
./gradlew test --tests com.mlt.experiments.Compression
````

Benchmark Variants:
- Advanced Morton Encodings, ID Reassigned, No Pre-Tessellation: Uses advanced encodings such FastPfor, FSST and 
  Morton Vertex-Dictionary encoding and uses some optimization of the existing MVT dataset to additionally reduce the 
  size like id regeneration (without information loss) in some cases and sorting of the features
- Advanced Morton Encodings, No Optimization, No Pre-Tessellation: Uses advanced encodings but does not additionally 
  process the dataset
- Simple Encodings, No Optimization, No Pre-Tessellation: Uses only simple encodings, so these encodings which are 
  currently supported by the TypeScript decoder since the advanced encodings are currently only supported by the 
  Java decoder

