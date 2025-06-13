# maplibre-tile-spec

This project contains a Java converter and decoder for the MapLibre Tile (MLT) vector tile format.

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

