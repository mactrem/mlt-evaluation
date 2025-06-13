# MapLibre Tile (MLT) Format Evaluation

This repository contains code and data for an experimental evaluation comparing the MLT format to 
the state-of-the-art vector tile format [Mapbox Vector Tile (MVT)](https://github.com/mapbox/vector-tile-spec) across 
three different categories:
- Encoding & Compression Performance: the size of the formats, both encoded and compressed
- Decoding (Transcoding) Performance: the performance of decoding the encoded formats into their respective in-memory representations
- Data Access Performance: data access micro-benchmarks concerning the performance of common data access patterns on in-memory representations im map rendering workflows such as applying filtering operations

##  Experiments

### Running Encoding & Compression Benchmarks

To run the encoding and compression benchmarks navigate to the [Java project](./java).

### Running Decoding & Data Access (Filtering) Benchmarks

To run the decoding and filtering benchmarks navigate to the [TypeScript project](./ts).
