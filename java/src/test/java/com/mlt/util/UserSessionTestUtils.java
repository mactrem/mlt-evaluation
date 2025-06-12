package com.mlt.util;

import com.mlt.converter.mvt.MapboxVectorTile;
import com.mlt.data.Feature;
import com.mlt.vector.FeatureTable;

import java.util.ArrayList;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

public class UserSessionTestUtils {

  @SuppressWarnings("unchecked")
  public static void compareTiles(FeatureTable[] featureTables, MapboxVectorTile mvTile) {
    var mvtLayers = mvTile.layers();
    for (var i = 0; i < mvtLayers.size(); i++) {
      var featureTable = featureTables[i];
      var mvtLayer = mvtLayers.get(i);
      var mvtFeatures = mvtLayer.features();
      var featureIterator = featureTable.iterator();

      for(var j = 0; j < mvtFeatures.size(); j++) {
        var mltFeature = featureIterator.next();
        Feature mvtFeature = mvtFeatures.get(j);

        try{
          assertEquals(mvtFeature.id(), mltFeature.id());
        }
        catch (Error e) {
          System.out.printf("Id mismatch: %s vs %s%n", mltFeature.id(), mvtFeature.id());
        }

        var mvtGeometry = mvtFeature.geometry();
        var mltGeometry = mltFeature.geometry();
        assertEquals(mvtGeometry, mltGeometry);

        var mltProperties = mltFeature.properties();
        for (var property : mltProperties.entrySet()) {
          var mltPropertyKey = property.getKey();
          var mltPropertyValue = property.getValue();
          var mvtProperties = mvtFeature.properties();
          if (mltPropertyValue instanceof Map<?, ?>) {
            /* Handle shared dictionary case -> currently only String is supported
             * as nested property in the converter, so only handle this case */
            var nestedStringValues = (Map<String, String>) mltPropertyValue;
            var mvtStringProperties =
                mvtProperties.entrySet().stream()
                    .filter(
                        p -> p.getKey().startsWith(mltPropertyKey) && p.getValue() instanceof String)
                    .toList();

            for (var mvtProperty : mvtStringProperties) {
              var mvtPropertyKey = mvtProperty.getKey();
              var mvtPropertyValue = mvtProperty.getValue();
              var mltValue = nestedStringValues.get(mvtPropertyKey);

              if(mltValue == null && mvtPropertyValue != null && ((String)mvtPropertyValue).isEmpty()){
                //TODO: fix -> currently we don't encode empty strings
                continue;
              }
              assertEquals(mvtPropertyValue, mltValue);
            }

            /* MLT also stores columns in a shared dictionary encoding which are present in the overall tileset
            *  but not in current tile. Check if all values are null. */
            var excessMltKeys = new ArrayList<>(nestedStringValues.keySet());
            var mvtKeys = mvtStringProperties.stream().map(Map.Entry::getKey).toList();
            excessMltKeys.removeAll(mvtKeys);
            for (var mltKey : excessMltKeys) {
              var mltValue = nestedStringValues.get(mltKey);
              assertNull(mltValue);
            }
          } else {
            var mvtPropertyValue = mvtProperties.get(mltPropertyKey);
            if(mltPropertyValue instanceof Integer && mvtPropertyValue instanceof Long){
              /* Handle the case where the MLT converter uses an int type when all values in a specific column
                 of all tiles are integers */
              mvtPropertyValue = ((Long) mvtPropertyValue).intValue();
            }

            assertEquals(mvtPropertyValue, mltPropertyValue);
          }
        }
      }
    }
  }

}
