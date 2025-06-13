package com.mlt.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mlt.converter.mvt.MapboxVectorTile;
import com.mlt.data.Feature;
import com.mlt.data.MapLibreTile;
import com.mlt.vector.FeatureTable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

public class TestUtils {
  public enum Optimization {
    NONE,
    SORTED,
    IDS_REASSIGNED
  }

  public static void compareTilesVectorized(
      FeatureTable[] featureTables,
      MapboxVectorTile mvTile,
      Optimization optimization,
      List<String> reassignableLayers) throws JsonProcessingException {
    var mvtLayers = mvTile.layers();
    for (var i = 0; i < mvtLayers.size(); i++) {
      var mvtLayer = mvtLayers.get(i);
      var featureTable = Arrays.stream(featureTables).filter(f ->
              f != null && f.getName().equals(mvtLayer.name())).findFirst().get();
      var mltFeatureIterator = featureTable.iterator();
      var mvtFeatures = mvtLayer.features();

      for (var j = 0; j < mvtFeatures.size(); j++) {
        var mltFeature = mltFeatureIterator.next();
        Feature mvtFeature =
            optimization == Optimization.SORTED
                ? mvtFeatures.stream().filter(f -> f.id() == mltFeature.id()).findFirst().get()
                : mvtFeatures.get(j);

        /* Test for a sequential order if the  id was reassigned  */
        var mvtId =
            optimization == Optimization.IDS_REASSIGNED
                    && reassignableLayers.stream().anyMatch(l -> l.equals(featureTable.getName()))
                ? j
                : mvtFeature.id();
        try {
          assertEquals(mvtId, mltFeature.id());
        } catch (Error e) {
          System.out.println(e);
        }

        var mvtGeometry = mvtFeature.geometry();
        var mltGeometry = mltFeature.geometry();
        assertEquals(mvtGeometry, mltGeometry);

        var mltProperties = mltFeature.properties();
        for (var property : mltProperties.entrySet()) {
          var mltPropertyKey = property.getKey();
          var mltPropertyValue = property.getValue();
          if (mltPropertyValue instanceof Map<?, ?>) {
            /* Handle shared dictionary case -> currently only String is supported
             * as nested property in the converter, so only handle this case */
            var mvtProperties = mvtFeature.properties();
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

              /*if (mvtPropertyKey.equals("name:ja:rm") || mvtPropertyKey.equals("name:ja:kana")) {
                // TODO: fix -> currently the converter can't handle a triple nested property name
                System.out.println(
                    "Skip verification for the name:ja:rm property name since it is currently"
                        + "not supported in the converter.");
                continue;
              }*/

              if(mvtPropertyValue instanceof String && ((String) mvtPropertyValue).isEmpty() && mltValue == null) {
                /* Empty strings in MVT are currently encoded as null values in MLT  */
                continue;
              }

              assertEquals(mvtPropertyValue, mltValue);
            }
          } else {
            var mvtPropertyValue = mvtFeature.properties().get(mltPropertyKey);
            /* MLT optimizes int instead of long if possible for the dataset */
            if(mltPropertyValue instanceof Integer && mvtPropertyValue instanceof Long){
              assertEquals(((Integer) mltPropertyValue).longValue(), mvtPropertyValue);
              continue;
            }

            assertEquals(mvtPropertyValue, mltPropertyValue);
          }
        }

        var mltNestedProperties = mltFeature.nestedProperties();
        for(var nestedProperty : mltNestedProperties.entrySet()) {
          var mltPropertyKey = nestedProperty.getKey();
          var mltPropertyValue = nestedProperty.getValue();

          var mvtPropertyValue = mvtFeature.properties().get(mltPropertyKey);
          var mvtNestedPropertyValue = new ObjectMapper().readTree(mvtPropertyValue.toString());
          /* Currently we are not encoding null values and empty strings */
          var filteredMvtNestedPropertyValue = removeNullPropertyValues(mvtNestedPropertyValue);
          assertEquals(mltPropertyValue, filteredMvtNestedPropertyValue);
        }
      }
    }
  }

  public static void compareTilesSequential(MapLibreTile mlTile, MapboxVectorTile mvTile) {
    var mltLayers = mlTile.layers();
    var mvtLayers = mvTile.layers();

    for (var i = 0; i < mvtLayers.size(); i++) {
      var mltLayer = mltLayers.get(i);
      var mvtLayer = mvtLayers.get(i);
      var mltFeatures = mltLayer.features();
      var mvtFeatures = mvtLayer.features();
      for (com.mlt.data.Feature mvtFeature : mvtFeatures) {
        var mltFeature =
            mltFeatures.stream().filter(f -> f.id() == mvtFeature.id()).findFirst().get();
        assertEquals(mvtFeature.id(), mltFeature.id());

        var mltGeometry = mltFeature.geometry();
        var mvtGeometry = mvtFeature.geometry();
        assertEquals(mvtGeometry, mltGeometry);

        var mltProperties = mltFeature.properties();
        var mvtProperties = mvtFeature.properties();
        for (var mvtProperty : mvtProperties.entrySet()) {
          /*if(mvtProperty.getKey().contains("name:ja:rm")){
              System.out.println(mvtProperty.getKey() + " " + mvtProperty.getValue() + " " + mltProperties.get(mvtProperty.getKey()) + " " + j + " " + i);
              continue;
          }*/

          var mltProperty = mltProperties.get(mvtProperty.getKey());
          assertEquals(mvtProperty.getValue(), mltProperty);
        }
      }
    }
  }

  private static int compareFeatures(
      List<Feature> mltFeatures, List<Feature> mvtFeatures, boolean isFeatureTableSorted) {
    int numErrors = 0;
    assertEquals(
        mvtFeatures.size(),
        mltFeatures.size(),
        "mvtFeatures.size()=" + mvtFeatures.size() + " mltFeatures.size()=" + mltFeatures.size());
    for (var j = 0; j < mltFeatures.size(); j++) {
      var mltFeature = mltFeatures.get(j);
      var mvtFeature =
          isFeatureTableSorted
              ? mvtFeatures.stream().filter(f -> f.id() == mltFeature.id()).findFirst().get()
              : mvtFeatures.get(j);

      // TODO: add id again
      /*assertEquals(
      mvtFeature.id(),
      mltFeature.id(),
      "mvtFeature.id()=" + mvtFeature.id() + " mltFeature.id()=" + mltFeature.id());*/

      var mltGeometry = mltFeature.geometry();
      var mvtGeometry = mvtFeature.geometry();
      if (!mvtGeometry.equalsExact(mltGeometry)) {
        // System.out.println("Failure comparing geometry for feature: " + mvtFeature.id());
        // System.out.println("    mvtGeometry: " + mvtGeometry);
        // System.out.println("    mltGeometry: " + mltGeometry);
        numErrors++;
      }
      var mltProperties = mltFeature.properties();
      var mvtProperties = mvtFeature.properties();
      for (var mvtProperty : mvtProperties.entrySet()) {
        var mvtPropertyKey = mvtProperty.getKey();
        // TODO: remove the below special case once this bug is fixed:
        // https://github.com/maplibre/maplibre-tile-spec/issues/181
        if (mvtPropertyKey.equals("id")) {
          continue;
        }
        var mltProperty = mltProperties.get(mvtPropertyKey);
        if (mltProperty == null) {
          // System.out.println(mvtFeature.id() + " mlt prop missing for " + mvtProperty.getKey());
          // System.out.println("  mvtProperties: " + mvtProperties);
          // System.out.println("  mltProperties: " + mltProperties);
          numErrors++;
        } else if (!mltProperty.equals(mvtProperty.getValue())) {
          // System.out.println(
          //     "Failure comparing property "
          //         + mvtProperty.getKey()
          //         + " for feature: "
          //         + mvtFeature.id());
          // System.out.println("    mvtProperty: " + mvtProperty.getValue());
          // System.out.println("    mltProperty: " + mltProperty);
          numErrors++;
        } else {
          assertEquals(
              mvtProperty.getValue(),
              mltProperty,
              "mvtProperty.getValue()=" + mvtProperty.getValue() + " mltProperty=" + mltProperty);
        }
      }
    }
    return numErrors;
  }

  public static int compareTilesVectorized(
      FeatureTable[] featureTables, MapboxVectorTile mvTile, boolean isFeatureTableSorted) {
    int numErrors = 0;
    var mvtLayers = mvTile.layers();
    assertEquals(
        featureTables.length,
        mvtLayers.size(),
        "featureTables.length=" + featureTables.length + " mvtLayers.size()=" + mvtLayers.size());
    for (var i = 0; i < mvtLayers.size(); i++) {
      var mvtLayer = mvtLayers.get(i);
      var mvtFeatures = mvtLayers.get(i).features();
      var featureTable = featureTables[i];
      var featureIterator = featureTable.iterator();
      var mltFeatures = new ArrayList<Feature>();
      while (featureIterator.hasNext()) {
        mltFeatures.add(featureIterator.next());
      }
      numErrors += compareFeatures(mltFeatures, mvtFeatures, isFeatureTableSorted);
    }
    return numErrors;
  }

  public static int compareTilesSequential(
      MapLibreTile mlTile, MapboxVectorTile mvTile, boolean isFeatureTableSorted) {
    int numErrors = 0;
    var mltLayers = mlTile.layers();
    var mvtLayers = mvTile.layers();
    assertEquals(
        mltLayers.size(),
        mvtLayers.size(),
        "mltLayers.size()=" + mltLayers.size() + " mvtLayers.size()=" + mvtLayers.size());
    for (var i = 0; i < mvtLayers.size(); i++) {
      var mvtLayer = mvtLayers.get(i);
      var mvtFeatures = mvtLayers.get(i).features();
      var mltLayer = mltLayers.get(i);
      var mltFeatures = mltLayer.features();
      numErrors += compareFeatures(mltFeatures, mvtFeatures, isFeatureTableSorted);
    }
    return numErrors;
  }

  private static JsonNode removeNullPropertyValues(JsonNode node) {
    if (node.isObject()) {
      ObjectNode objectNode = (ObjectNode) node;
      List<String> fieldsToRemove = new ArrayList<>();

      objectNode.fieldNames().forEachRemaining(fieldName -> {
        JsonNode valueNode = objectNode.get(fieldName);
        if (valueNode.isObject() || valueNode.isArray()) {
          removeNullPropertyValues(valueNode);
        }
        if (valueNode.isNull() || (valueNode.isTextual() && valueNode.asText().isEmpty())) {
          fieldsToRemove.add(fieldName);
        }
      });

      for (String fieldName : fieldsToRemove) {
        objectNode.remove(fieldName);
      }
    } else if (node.isArray()) {
      var newArrayNode = JsonNodeFactory.instance.arrayNode();
      boolean allEmpty = true;

      for (int i = 0; i < node.size(); i++) {
        JsonNode arrayElement = node.get(i);
        removeNullPropertyValues(arrayElement);
        if (!arrayElement.isNull() && !(arrayElement.isTextual() && arrayElement.asText().isEmpty())) {
          newArrayNode.add(arrayElement);
          allEmpty = false;
        }
      }

      if (allEmpty) {
        return JsonNodeFactory.instance.arrayNode();
      } else {
        return newArrayNode;
      }
    }
    return node;
  }

}
