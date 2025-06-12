# MapLibre Tile (MLT) Format

The MapLibre Tile specification is mainly inspired by the [Mapbox Vector Tile (MVT)](https://github.com/mapbox/vector-tile-spec) specification,
but has been redesigned from the ground up to address the challenges of rapidly growing geospatial data volumes
and complex next-generation geospatial source formats as well as to leverage the capabilities of modern hardware and APIs.
MLT is specifically designed for modern and next generation graphics APIs to enable high-performance processing and rendering of
large (planet-scale) 2D and 2.5 basemaps. In particular, MLT offers the following features:
- **Improved compression ratio**: up to 6x on large tiles, based on a column oriented layout with recursively applied (custom)
    lightweight encodings. This leads to reduced latency, storage, and egress costs and, in particular, improved cache utilization
- **Better decoding performance**: fast lightweight encodings which can be used in combination with SIMD/vectorization instructions
- **Support for linear referencing and m-values** to efficiently support the upcoming next generation source formats such as Overture Maps (GeoParquet)
- **Support 3D coordinates**, i.e. elevation
- **Support complex types**, including nested properties, lists and maps
- **Improved processing performance**, based on storage and in-memory formats that are specifically designed for modern GL APIs,
allowing for efficient processing on both CPU and GPU. The formats are designed to be loaded into
GPU buffers with little or no additional processing

##  Experiments

### Running Encoding & Compression Benchmarks

Navigate into the `java` folder.

### Running Decoding & Filtering Benchmarks

Navigate into the `ts` folder.