package com.mlt;

import com.mlt.converter.MltConverter;
import com.mlt.converter.encodings.EncodingUtils;
import com.mlt.converter.mvt.ColumnMapping;
import com.mlt.converter.mvt.MapboxVectorTile;
import com.mlt.converter.mvt.MvtUtils;
import com.mlt.decoder.MltDecoder;
import com.mlt.metadata.tileset.MltTilesetMetadata;
import com.mlt.util.MbtilesRepsitory;
import com.mlt.vector.FeatureTable;
import org.apache.commons.lang3.tuple.Triple;
import org.openjdk.jmh.annotations.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.sql.SQLException;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Benchmarks for the performance of decoding the MVT and MLT on-file representations and their
 * in-memory representations based user session simulation (zoom 0 to 14).
 */
@State(Scope.Benchmark)
@OutputTimeUnit(TimeUnit.MILLISECONDS)
@BenchmarkMode(Mode.AverageTime)
@Threads(value = 1)
//TODO: add again
@Warmup(iterations = 5)
@Measurement(iterations = 5)
/*@Warmup(iterations = 2)
@Measurement(iterations = 2)*/
@Fork(value = 1)
public class UserSessionBenchmarks {
    private static final String OMT_MUNICH_UNOPTIMIZED = "data/ot2.mbtiles";
    private static final List<ColumnMapping> COLUMN_MAPPINGS =
            List.of(
                    new ColumnMapping("name", "_", true),
                    new ColumnMapping("name", ":", true));

    /* java-vector-tile library */
    private static final List<byte[]> encodedMvtTiles = new ArrayList<>();
    /* mapbox-vector-tile-java library */
    private static final List<ByteArrayInputStream>encodedMvtTiles2 = new ArrayList<>();
    private static final List<byte[]> compressedMVTiles = new ArrayList<>();
    private static final List<byte[]> encodedMltTiles = new ArrayList<>();
    private MltTilesetMetadata.TileSetMetadata tileMetadata;

    @Setup
    public void setup() throws IOException, SQLException, ClassNotFoundException {
        List<Triple<Triple<Integer, Integer, Integer>, byte[], MapboxVectorTile>> mvTiles;
        try (var repo = new MbtilesRepsitory("jdbc:sqlite:" + OMT_MUNICH_UNOPTIMIZED, 0, 14,
                COLUMN_MAPPINGS)) {
            mvTiles = repo.getAllTiles();
        }

        tileMetadata =
                MltConverter.createTilesetMetadata(mvTiles.stream().map(Triple::getRight).collect(Collectors.toList()),
                        Optional.of(COLUMN_MAPPINGS), true);

        for(var mvTile : mvTiles){
            encodeTile(mvTile.getRight(), mvTile.getMiddle(), tileMetadata);
        }
    }

    /*@Setup(Level.Invocation)
    public void resetInputStreams() {
        for (var is : encodedMvtTiles2) {
            is.reset();
        }
    }*/

    private void encodeTile(MapboxVectorTile mvt, byte[] encodedMvtTile, MltTilesetMetadata.TileSetMetadata metadata)
            throws IOException {
        BenchmarkUtils.encodeTile(
                mvt,
                encodedMvtTile,
                metadata,
                encodedMvtTiles,
                encodedMvtTiles2,
                compressedMVTiles,
                encodedMltTiles,
                COLUMN_MAPPINGS);
    }

    @Benchmark
    public List<FeatureTable[]> decodeMlt() {
        var tiles = new ArrayList<FeatureTable[]>();
        for(var i = 0; i < encodedMltTiles.size(); i++) {
            var mltTile = encodedMltTiles.get(i);
            var tile = MltDecoder.decodeMlTileVectorized(mltTile, tileMetadata);
            tiles.add(tile);
        }

        return tiles;
    }

    @Benchmark
    public ArrayList<?> decodeMvt() throws IOException {
        var tiles = new ArrayList<>();
        for(var i = 0; i < encodedMvtTiles.size(); i++) {
            var mvTile = encodedMvtTiles.get(i);
            var tile = MvtUtils.decodeMvtMapbox(mvTile);
            tiles.add(tile);
        }

        return tiles;
    }

    @Benchmark
    public ArrayList<?> decodeMvt2() throws IOException {
        var tileFeatures = new ArrayList<>();
        for(var i = 0; i < encodedMvtTiles.size(); i++) {
            var mvTile = encodedMvtTiles.get(i);
            var features = MvtUtils.decodeMvtMapbox2(mvTile);
            tileFeatures.add(features);
        }

        return tileFeatures;
    }

    /*@Benchmark
    public ArrayList<?> decodeCompressedMvtMapbox() throws IOException {
        var tiles = new ArrayList<>();
        for(var i = 0; i < compressedMVTiles.size(); i++) {
            var compressedMvTile = compressedMVTiles.get(i);
            var mvTile = EncodingUtils.unzip(compressedMvTile);
            var tile = MvtUtils.decodeMvtMapbox(mvTile);
            tiles.add(tile);
        }

        return tiles;
    }*/

    /*@Benchmark
    public ArrayList<?> decodeMvt2() throws IOException {
        var tiles = new ArrayList<>();
        for(var i = 0; i < encodedMvtTiles2.size(); i++) {
            var mvTile = encodedMvtTiles2.get(i);
            var tile = MvtUtils.decodeMvt2Fast(mvTile);
            tiles.add(tile);
        }

        return tiles;
    }*/

}
