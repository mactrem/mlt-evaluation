package com.mlt.decoder;

import com.mlt.TestSettings;
import com.mlt.converter.ConversionConfig;
import com.mlt.converter.FeatureTableOptimizations;
import com.mlt.converter.MltConverter;
import com.mlt.converter.mvt.ColumnMapping;
import com.mlt.converter.mvt.MapboxVectorTile;
import com.mlt.util.MbtilesRepsitory;
import com.mlt.util.UserSessionTestUtils;
import org.apache.commons.lang3.tuple.Triple;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;


public class MltDecoderUserSessionTest {
  private static final String OMT_MUNICH_UNOPTIMIZED = "data/ot1.mbtiles";
  private static final String OMT_MUNICH_OPTIMIZED = "data/ot2.mbtiles";
  private static final String Swisstopo = "data/st.mbtiles";
  private static final String Overture = "data/ov.mbtiles";

  protected static final List<ColumnMapping> COLUMN_MAPPINGS =
          List.of(
                  new ColumnMapping("name", "_", true),
                  new ColumnMapping("name", ":", true));

  /* Decode tiles in an in-memory format optimized for random access */

  @DisplayName("Decode unoptimized OpenMapTiles schema based vector tiles from user session MBTiles")
  @Test
  public void decodeMlTile_UserSessionMunichUnoptimizedOMT_AdvancedEncodings()
          throws IOException, SQLException, ClassNotFoundException {
    testMbTiles(OMT_MUNICH_UNOPTIMIZED);
  }

  @DisplayName("Decode optimized OpenMapTiles schema based vector tiles from user session MBTiles")
  @Test
  public void decodeMlTile_UserSessionMunichOptimizedOMT_AdvancedEncodings()
          throws IOException, SQLException, ClassNotFoundException {
    testMbTiles(OMT_MUNICH_OPTIMIZED);
  }

  @DisplayName("Decode Swisstopo schema based vector tiles from user session MBTiles")
  @Test
  public void decodeMlTile_UserSessionSwisstopo_AdvancedEncodings()
          throws IOException, SQLException, ClassNotFoundException {
    testMbTiles(Swisstopo);
  }

  @DisplayName("Decode Overture schema based vector tiles from user session MBTiles")
  @Test
  public void decodeMlTile_UserSessionOverture_AdvancedEncodings()
          throws IOException, SQLException, ClassNotFoundException {
    testMbTiles(Overture);
  }

  private void testMbTiles(String filename) throws IOException, SQLException, ClassNotFoundException {
    List<Triple<Triple<Integer, Integer, Integer>, byte[], MapboxVectorTile>> mvTiles;
    try (var repo = new MbtilesRepsitory("jdbc:sqlite:" + filename, 0, 14,
            COLUMN_MAPPINGS)) {
      mvTiles = repo.getAllTiles();
    }

    var columnMappings = Optional.of(COLUMN_MAPPINGS);
    var optimizations = getOptimizations(columnMappings);
    var conversionConfig = new ConversionConfig(true, true, optimizations);

    for(var mvTile : mvTiles){
      var tileId = mvTile.getLeft();
      System.out.printf("Test tile: %d/%d/%d%n", tileId.getLeft(), tileId.getMiddle(), tileId.getRight());
      testTile(mvTile.getRight(), conversionConfig, columnMappings);
    }
  }

  private void testTile(MapboxVectorTile mvt, ConversionConfig conversionConfig,
                        Optional<List<ColumnMapping>> columnMappings) throws IOException {
    var tileMetadata = MltConverter.createTilesetMetadata(List.of(mvt), columnMappings, true);
    var encodedMlt = MltConverter.convertMvt(mvt, conversionConfig, tileMetadata);

    var decodedMlt = MltDecoder.decodeMlTileVectorized(encodedMlt, tileMetadata);

    UserSessionTestUtils.compareTiles(decodedMlt, mvt);
  }

  private Map<String, FeatureTableOptimizations> getOptimizations(Optional<List<ColumnMapping>> columnMappings) {
    var featureTableOptimization =
            new FeatureTableOptimizations(false, false, columnMappings);
    return TestSettings.OPTIMIZED_MVT_LAYERS.stream()
                    .collect(Collectors.toMap(l -> l, l -> featureTableOptimization));
  }

}
