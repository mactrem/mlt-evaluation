package com.mlt.experiments;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.mlt.TestSettings;
import com.mlt.converter.metadata.Field;
import com.mlt.decoder.MltDecoder;
import com.mlt.util.TestUtils;
import com.mlt.converter.ConversionConfig;
import com.mlt.converter.FeatureTableOptimizations;
import com.mlt.converter.MltConverter;
import com.mlt.converter.RenderingOptimizedConversionConfig;
import com.mlt.converter.encodings.EncodingUtils;
import com.mlt.converter.mvt.ColumnMapping;
import com.mlt.converter.mvt.MapboxVectorTile;
import com.mlt.metadata.tileset.MltTilesetMetadata;
import com.mlt.util.MbtilesRepsitory;
import org.apache.commons.lang3.tuple.Triple;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.SQLException;
import java.util.*;
import java.util.stream.Collectors;

import static com.mlt.TestSettings.ID_REASSIGNABLE_MVT_LAYERS;

public class Compression {
  private static final String OT1_SOURCE_MBTILES = "data/ot1.mbtiles";
  private static final String OT2_SOURCE_MBTILES = "data/ot2.mbtiles";
  private static final String ST_SOURCE_MBTILES = "data/st.mbtiles";
  private static final String OV_SOURCE_MBTILES = "data/ov.mbtiles";
  private static final String OUT_DIR_MLT = "../ts/test/data/omt/unoptimized_user_session/mlt/plain";
  private static final String OUT_DIR_MVT = "../ts/test/data/omt/unoptimized_user_session/mvt";
  private static final boolean STORE_TILES = false;
  private static final String TILESET_METADATA_FILE_NAME = "tileset.pbf";

  protected static final List<ColumnMapping> COLUMN_MAPPINGS =
          List.of(
                  new ColumnMapping("name", "_", true),
                  new ColumnMapping("name", ":", true));
  private static final List<String> OUTLINE_POLYGON_FEATURE_TABLE_NAMES = List.of("building");

  @ParameterizedTest
  /*@ValueSource(strings= {Compression.OT1_SOURCE_MBTILES, Compression.OT2_SOURCE_MBTILES, Compression.ST_SOURCE_MBTILES,
    Compression.OV_SOURCE_MBTILES})*/
  @ValueSource(strings= {Compression.OT2_SOURCE_MBTILES, Compression.ST_SOURCE_MBTILES,
          Compression.OV_SOURCE_MBTILES})
  public void userSession(String mbTilesFileName)
          throws SQLException, ClassNotFoundException, IOException {
    System.out.printf("Benchmarking Dataset %s --------------------------------------------------------------------%n",
            mbTilesFileName.split("/")[1]);

    List<Triple<Triple<Integer, Integer, Integer>, byte[], MapboxVectorTile>> mvTiles;
    try (var repo = new MbtilesRepsitory("jdbc:sqlite:" + mbTilesFileName, 0, 14, COLUMN_MAPPINGS)) {
        mvTiles = repo.getAllTiles();
    }

    var decodedMvTiles = mvTiles.stream().map(Triple::getRight).collect(Collectors.toList());
    Optional<List<ColumnMapping>> columnMappings = Optional.of(COLUMN_MAPPINGS);
    MltTilesetMetadata.TileSetMetadata tilesetMetadata;
    Map<String, Field> nestedScheme = null;
    /* Only used nested encoding for the Overture Maps dataset */
    var encodeNestedProperties = mbTilesFileName.contains("ov");
    if(encodeNestedProperties){
      var scheme = MltConverter.createTilesetMetadataFromNestedJsonProperties(decodedMvTiles, columnMappings,
              true);
      tilesetMetadata = scheme.getLeft();
      nestedScheme = scheme.getRight();
    }
    else{
      tilesetMetadata = MltConverter.createTilesetMetadata(decodedMvTiles, columnMappings,
              true);
    }

    if(STORE_TILES){
      var outputMetadataPath = Paths.get(OUT_DIR_MLT, TILESET_METADATA_FILE_NAME);
      tilesetMetadata.writeTo(Files.newOutputStream(outputMetadataPath));
    }

    var idReassignedOptimizations = getOptimizations(true, TestUtils.Optimization.IDS_REASSIGNED);
    var noOptimizations = getOptimizations(false, TestUtils.Optimization.NONE);
    var divider = 1000d;
    var mode1 = "Advanced Morton Encodings, ID Reassigned, No Pre-Tessellation";
    var mode2 = "Advanced Morton Encodings, No Optimization, No Pre-Tessellation";
    var mode3 = "Simple Encodings, No Optimization, No Pre-Tessellation";
    var optimizedMortonAdvancedEncodedStats = new ArrayList<List<Integer>>();
    var unoptimizedMortonAdvancedEncodedStats = new ArrayList<List<Integer>>();
    var unoptimizedSimpleEncodedStats = new ArrayList<List<Integer>>();

    var maxCr = 0.0d;
    for (var mvTile : mvTiles) {
      try {
        if(mvTile.getMiddle().length == 0){
          continue;
        }

        byte[] optimizedMortonAdvancedEncodedMlt, unoptimizedMortonAdvancedEncodedMlt, unoptimizedSimpleEncodedMlt;
        if(!encodeNestedProperties){
          optimizedMortonAdvancedEncodedMlt = convertMvtToMlt(idReassignedOptimizations,
                  false, mvTile.getRight(), tilesetMetadata, true,
                  true);
          unoptimizedMortonAdvancedEncodedMlt = convertMvtToMlt(noOptimizations,
                  false, mvTile.getRight(), tilesetMetadata, true,
                  true);
          unoptimizedSimpleEncodedMlt = convertMvtToMlt(noOptimizations,
                  false, mvTile.getRight(), tilesetMetadata, false,
                  false);

          /* Verification of the flat encoded MLT files happens in the unit tests of the TS decoder */
          /*verifyResult(mvTile, unoptimizedMortonAdvancedEncodedMlt, tilesetMetadata);
          verifyResult(mvTile, unoptimizedSimpleEncodedMlt, tilesetMetadata);*/
        }
        else{
          optimizedMortonAdvancedEncodedMlt = convertComplexMvtToMlt(idReassignedOptimizations,
                  false, mvTile.getRight(), tilesetMetadata, true,
                  true, nestedScheme);
          unoptimizedMortonAdvancedEncodedMlt = convertComplexMvtToMlt(noOptimizations,
                  false, mvTile.getRight(), tilesetMetadata, true,
                  true, nestedScheme);
          unoptimizedSimpleEncodedMlt = convertComplexMvtToMlt(noOptimizations,
                  false, mvTile.getRight(), tilesetMetadata, false,
                  false, nestedScheme);

          /* Verification of the nested encoded datasets */
          verifyResult(mvTile, unoptimizedMortonAdvancedEncodedMlt, tilesetMetadata, nestedScheme);
          verifyResult(mvTile, unoptimizedSimpleEncodedMlt, tilesetMetadata, nestedScheme);
        }

        //var cr = ((double)mvTile.getMiddle().length / optimizedMortonAdvancedEncodedMlt.length);
        var cr = ((double)mvTile.getMiddle().length / unoptimizedMortonAdvancedEncodedMlt.length);
        if(cr > maxCr){
          maxCr = cr;
        }

        var stats1 = printStats(mvTile, optimizedMortonAdvancedEncodedMlt, divider, mode1);
        optimizedMortonAdvancedEncodedStats.add(stats1);
        var stats2 = printStats(mvTile, unoptimizedMortonAdvancedEncodedMlt, divider, mode2);
        unoptimizedMortonAdvancedEncodedStats.add(stats2);
        var stats3 = printStats(mvTile, unoptimizedSimpleEncodedMlt, divider, mode3);
        unoptimizedSimpleEncodedStats.add(stats3);
        System.out.println("-----------------------------------------------------------------------------");

        if(STORE_TILES){
          var tileId = mvTile.getLeft();
          String fileName = String.format("%s_%s_%s", tileId.getLeft(), tileId.getMiddle(), tileId.getRight());
          Files.write(Path.of(OUT_DIR_MLT, fileName + ".mlt"), unoptimizedSimpleEncodedMlt);
          Files.write(Path.of(OUT_DIR_MVT, fileName + ".mvt"), mvTile.getMiddle());
        }
      } catch (Exception e) {
        System.out.println("Error while processing tile " + mvTile);
        e.printStackTrace();
      }
    }

    printTotalStats(optimizedMortonAdvancedEncodedStats, divider, mode1);
    printTotalStats(unoptimizedMortonAdvancedEncodedStats, divider, mode2);
    printTotalStats(unoptimizedSimpleEncodedStats, divider, mode3);
    System.out.println("Max Compression Ratio: " + maxCr);
  }

  private static void verifyResult(Triple<Triple<Integer, Integer, Integer>, byte[], MapboxVectorTile> mvTile, byte[] unoptimizedMortonAdvancedEncodedMlt, MltTilesetMetadata.TileSetMetadata tilesetMetadata, Map<String, Field> nestedScheme) throws JsonProcessingException {
    var decodedTile = MltDecoder.decodeMlTileVectorized(unoptimizedMortonAdvancedEncodedMlt, tilesetMetadata,
            nestedScheme);
    TestUtils.compareTilesVectorized(decodedTile, mvTile.getRight(), null, List.of());
  }

  private static void verifyResult(Triple<Triple<Integer, Integer, Integer>, byte[], MapboxVectorTile> mvTile, byte[] unoptimizedMortonAdvancedEncodedMlt, MltTilesetMetadata.TileSetMetadata tilesetMetadata) throws JsonProcessingException {
    var decodedTile = MltDecoder.decodeMlTileVectorized(unoptimizedMortonAdvancedEncodedMlt, tilesetMetadata);
    TestUtils.compareTilesVectorized(decodedTile, mvTile.getRight(), null, List.of());
  }

  private static void printTotalStats(ArrayList<List<Integer>> stats, double divider, String mode) {
    var mltSize = stats.stream().mapToDouble(List::getFirst).sum();
    var mvtSize = stats.stream().mapToDouble(l -> l.get(1)).sum();
    var compressedMltSize = stats.stream().mapToDouble(l -> l.get(2)).sum();
    var compressedMvtSize = stats.stream().mapToDouble(l -> l.get(3)).sum();
    System.out.println("Overall Statistics --------------------------------------------------------------------------");
    System.out.printf(Locale.US,"Reduction: %.2f%%, Reduction Compressed: %.2f%%, " +
                    "MVT: %.2f, MLT: %.2f, Compressed MVT: %.2f, Compressed MLT: %.2f | %s %n",
            (1 - (mltSize / mvtSize)) * 100, (1 - (compressedMltSize / compressedMvtSize)) * 100
            , mvtSize / divider, mltSize / divider, compressedMvtSize / divider, compressedMltSize / divider
            , mode);
  }

  private static List<Integer> printStats(Triple<Triple<Integer, Integer, Integer>, byte[], MapboxVectorTile> mvTile,
                                 byte[] uncompressedOptimizedMortonAdvancedEncodedMlt, double divider, String mode) throws IOException {
    var uncompressedMvt = mvTile.getMiddle();
    var compressedMlt = EncodingUtils.gzip(uncompressedOptimizedMortonAdvancedEncodedMlt);
    var compressedMvt = EncodingUtils.gzip(uncompressedMvt);

    var mltSize = uncompressedOptimizedMortonAdvancedEncodedMlt.length;
    var mvtSize = uncompressedMvt.length;
    var compressedMltSize = compressedMlt.length;
    var compressedMvtSize = compressedMvt.length;
    System.out.printf(Locale.US,"%s: Reduction: %.2f%%, Reduction Compressed: %.2f%%, " +
                    "MVT: %.2f, MLT: %.2f, Compressed MVT: %.2f, Compressed MLT: %.2f | %s %n",
            mvTile.getLeft().toString(), (1 - ((double)mltSize / mvtSize)) * 100,
            (1 - ((double)compressedMltSize / (compressedMvtSize))) * 100,
            mvtSize / divider, mltSize/ divider, compressedMvtSize/ divider, compressedMltSize/ divider, mode);

    return List.of(mltSize, mvtSize, compressedMltSize, compressedMvtSize);
  }

  private Map<String, FeatureTableOptimizations> getOptimizations(boolean allowSorting,
                                                                  TestUtils.Optimization optimization) {
    var columnMappings = Optional.of(COLUMN_MAPPINGS);
    var featureTableOptimization =
        new FeatureTableOptimizations(allowSorting, false, columnMappings);
    var optimizations =
        TestSettings.OPTIMIZED_MVT_LAYERS.stream()
            .collect(Collectors.toMap(l -> l, l -> featureTableOptimization));

    /* Only regenerate the ids for specific layers when the column is not sorted for comparison reasons */
    if (optimization == TestUtils.Optimization.IDS_REASSIGNED) {
      for (var reassignableLayer : ID_REASSIGNABLE_MVT_LAYERS) {
        optimizations.put(
            reassignableLayer, new FeatureTableOptimizations(true, true, columnMappings));
      }
    }
    else if(optimization == TestUtils.Optimization.SORTED){
        for (var reassignableLayer : ID_REASSIGNABLE_MVT_LAYERS) {
            optimizations.put(
                reassignableLayer, new FeatureTableOptimizations(true, false, columnMappings));
        }
    }

    return optimizations;
  }

  private byte[] convertMvtToMlt(
      Map<String, FeatureTableOptimizations> optimizations,
      boolean preTessellatePolygons,
      MapboxVectorTile mvTile,
      MltTilesetMetadata.TileSetMetadata tileMetadata,
      boolean useAdvancedEncodings,
      boolean useMortonEncoding)
      throws IOException {
    var config =
            preTessellatePolygons
            ? new RenderingOptimizedConversionConfig(true, useAdvancedEncodings, optimizations,
                    true, OUTLINE_POLYGON_FEATURE_TABLE_NAMES)
            : new ConversionConfig(true, useAdvancedEncodings, optimizations, useMortonEncoding);
    return MltConverter.convertMvt(mvTile, config, tileMetadata);
  }

  private byte[] convertComplexMvtToMlt(
          Map<String, FeatureTableOptimizations> optimizations,
          boolean preTessellatePolygons,
          MapboxVectorTile mvTile,
          MltTilesetMetadata.TileSetMetadata tileMetadata,
          boolean useAdvancedEncodings,
          boolean useMortonEncoding,
          Map<String, Field> nestedPropertyScheme)
          throws IOException {
    var config =
            preTessellatePolygons
                    ? new RenderingOptimizedConversionConfig(true, useAdvancedEncodings, optimizations,
                    true, OUTLINE_POLYGON_FEATURE_TABLE_NAMES)
                    : new ConversionConfig(true, useAdvancedEncodings, optimizations, useMortonEncoding);
    return MltConverter.convertMvt(mvTile, config, tileMetadata, nestedPropertyScheme);
  }

}

