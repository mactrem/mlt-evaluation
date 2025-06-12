package com.mlt.converter.encodings;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mlt.converter.CollectionUtils;
import com.mlt.converter.Settings;
import com.mlt.converter.metadata.*;
import com.mlt.converter.mvt.ColumnMapping;
import com.mlt.data.Feature;
import com.mlt.metadata.stream.PhysicalLevelTechnique;
import com.mlt.metadata.tileset.MltTilesetMetadata;

import java.io.IOException;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Collectors;

public class PropertyEncoder {
  private static String ID_COLUMN_NAME = "id";

  public static byte[] encodeComplexPropertyColumns(
          List<MltTilesetMetadata.Column> propertyColumns,
          List<Field> nestedPropertyColumns,
          List<Feature> features,
          boolean useAdvancedEncodings,
          Optional<List<ColumnMapping>> columnMappings)
          throws IOException {
    /*
     * TODOs: - detect if column is nullable to get rid of the present stream - test boolean rle
     * against roaring bitmaps and integer encoding for present stream and boolean values - Add
     * vector type to field metadata
     */
    var physicalLevelTechnique =
            useAdvancedEncodings ? PhysicalLevelTechnique.FAST_PFOR : PhysicalLevelTechnique.VARINT;
    var featureScopedPropertyColumns = new byte[0];

    var i = 0;
    for (var columnMetadata : propertyColumns) {
      if (columnMetadata.hasScalarType()) {
        if (features.stream()
                .noneMatch(f -> f.properties().containsKey(columnMetadata.getName()))) {
          /* Indicate a missing property column in the tile with a zero for the number of streams */
          var encodedFieldMetadata = EncodingUtils.encodeVarints(new long[] {0}, false, false);
          featureScopedPropertyColumns =
                  CollectionUtils.concatByteArrays(featureScopedPropertyColumns, encodedFieldMetadata);
          continue;
        }

        var encodedScalarPropertyColumn =
                encodeScalarPropertyColumn(columnMetadata, features, physicalLevelTechnique, useAdvancedEncodings);
        featureScopedPropertyColumns =
                CollectionUtils.concatByteArrays(
                        featureScopedPropertyColumns, encodedScalarPropertyColumn);
      } else if (columnMetadata.hasComplexType()
              && columnMetadata.getComplexType().getPhysicalType()
              == MltTilesetMetadata.ComplexType.STRUCT) {
        if (columnMappings.isEmpty()) {
          throw new IllegalArgumentException(
                  "Column mappings are required for nested property column "
                          + columnMetadata.getName());
        }

        // TODO: add present stream for struct column

        /* We limit the nesting level to one in this implementation */
        var sharedDictionary = new ArrayList<List<String>>();
        var columnMapping = columnMappings.get().get(i++);

        /* Plan -> when there is a struct filed and the useSharedDictionaryFlag is enabled
         *  share the dictionary for all string columns which are located one after
         * the other in the sequence */
        for (var nestedFieldMetadata : columnMetadata.getComplexType().getChildrenList()) {
          if (nestedFieldMetadata.getScalarField().getPhysicalType()
                  == MltTilesetMetadata.ScalarType.STRING) {
            if (columnMapping.useSharedDictionaryEncoding()) {
              // request all string columns in row and merge
              if (nestedFieldMetadata.getName().equals("default")) {
                var propertyColumn =
                        features.stream()
                                .map(f -> (String) f.properties().get(columnMapping.mvtPropertyPrefix()))
                                .collect(Collectors.toList());
                sharedDictionary.add(propertyColumn);
              } else {
                // TODO: handle case where the nested field name is not present in the mvt layer
                // This can be the case when the Tileset Metadata document is not generated per
                // tile instead for the full tileset
                var mvtPropertyName =
                        columnMapping.mvtPropertyPrefix()
                                + Settings.MLT_CHILD_FIELD_SEPARATOR
                                + nestedFieldMetadata.getName();
                var propertyColumn =
                        features.stream()
                                .map(mvtFeature -> (String) mvtFeature.properties().get(mvtPropertyName))
                                .collect(Collectors.toList());
                sharedDictionary.add(propertyColumn);
              }
            } else {
              throw new IllegalArgumentException(
                      "Only shared dictionary encoding is currently supported for nested property columns.");
            }
          } else {
            throw new IllegalArgumentException(
                    "Only fields of type String are currently supported as nested property columns.");
          }
        }

        if (sharedDictionary.stream().allMatch(List::isEmpty)) {
          /* Set number of streams to zero if no columns are present in this tile */
          var encodedFieldMetadata = EncodingUtils.encodeVarints(new long[] {0}, false, false);
          return CollectionUtils.concatByteArrays(
                  featureScopedPropertyColumns, encodedFieldMetadata);
        }

        var nestedColumns =
                StringEncoder.encodeSharedDictionary(
                        sharedDictionary, physicalLevelTechnique, useAdvancedEncodings);
        // TODO: fix -> ony quick and dirty fix
        var numStreams = nestedColumns.getLeft() == 0 ? 0 : 1;
        /* Set number of streams to zero if no columns are present in this tile */
        var encodedFieldMetadata =
                EncodingUtils.encodeVarints(new long[] {numStreams}, false, false);

        // TODO: add present stream and present stream metadata for struct column in addition
        // to the FieldMetadata to be compliant with the specification
        featureScopedPropertyColumns =
                CollectionUtils.concatByteArrays(
                        featureScopedPropertyColumns, encodedFieldMetadata, nestedColumns.getRight());
      } else {
        throw new IllegalArgumentException(
                "The specified data type for the field is currently not supported: " + columnMetadata);
      }
    }

    for(var nestedColumn : nestedPropertyColumns) {
      /* Encode nested property column */
      var encodedComplexPropertyColumn =
                encodeComplexPropertyColumn(nestedColumn, features, physicalLevelTechnique,
                        useAdvancedEncodings);
        //TODO: get number of total streams for nested object -> currently just placeholder
        var encodedFieldMetadata = EncodingUtils.encodeVarints(new long[] {2}, false, false);
        featureScopedPropertyColumns =
                CollectionUtils.concatByteArrays(featureScopedPropertyColumns, encodedFieldMetadata,
                        encodedComplexPropertyColumn);
    }

    return featureScopedPropertyColumns;
  }

  public static byte[] encodePropertyColumns(
      List<MltTilesetMetadata.Column> propertyColumns,
      List<Feature> features,
      boolean useAdvancedEncodings,
      Optional<List<ColumnMapping>> columnMappings)
      throws IOException {
    /*
     * TODOs: - detect if column is nullable to get rid of the present stream - test boolean rle
     * against roaring bitmaps and integer encoding for present stream and boolean values - Add
     * vector type to field metadata
     */
    var physicalLevelTechnique =
        useAdvancedEncodings ? PhysicalLevelTechnique.FAST_PFOR : PhysicalLevelTechnique.VARINT;
    var featureScopedPropertyColumns = new byte[0];

    var i = 0;
    for (var columnMetadata : propertyColumns) {
      if (columnMetadata.hasScalarType()) {
        if (features.stream()
            .noneMatch(f -> f.properties().containsKey(columnMetadata.getName()))) {
          /* Indicate a missing property column in the tile with a zero for the number of streams */
          var encodedFieldMetadata = EncodingUtils.encodeVarints(new long[] {0}, false, false);
          featureScopedPropertyColumns =
              CollectionUtils.concatByteArrays(featureScopedPropertyColumns, encodedFieldMetadata);
          continue;
        }

        var encodedScalarPropertyColumn = encodeScalarPropertyColumn(columnMetadata, features, physicalLevelTechnique,
                useAdvancedEncodings);
        featureScopedPropertyColumns =
            CollectionUtils.concatByteArrays(
                featureScopedPropertyColumns, encodedScalarPropertyColumn);
      } else if (columnMetadata.hasComplexType()
          && columnMetadata.getComplexType().getPhysicalType()
              == MltTilesetMetadata.ComplexType.STRUCT) {
        if (columnMappings.isEmpty()) {
          throw new IllegalArgumentException(
              "Column mappings are required for nested property column "
                  + columnMetadata.getName());
        }

        // TODO: add present stream for struct column

        /* We limit the nesting level to one in this implementation */
        var sharedDictionary = new ArrayList<List<String>>();
        var columnMapping = columnMappings.get().get(i++);

        /* Plan -> when there is a struct filed and the useSharedDictionaryFlag is enabled
         *  share the dictionary for all string columns which are located one after
         * the other in the sequence */
        for (var nestedFieldMetadata : columnMetadata.getComplexType().getChildrenList()) {
          if (nestedFieldMetadata.getScalarField().getPhysicalType()
              == MltTilesetMetadata.ScalarType.STRING) {
            if (columnMapping.useSharedDictionaryEncoding()) {
              // request all string columns in row and merge
              if (nestedFieldMetadata.getName().equals("default")) {
                var propertyColumn =
                    features.stream()
                        .map(f -> (String) f.properties().get(columnMapping.mvtPropertyPrefix()))
                        .collect(Collectors.toList());
                sharedDictionary.add(propertyColumn);
              } else {
                // TODO: handle case where the nested field name is not present in the mvt layer
                // This can be the case when the Tileset Metadata document is not generated per
                // tile instead for the full tileset
                var mvtPropertyName =
                    columnMapping.mvtPropertyPrefix()
                        + Settings.MLT_CHILD_FIELD_SEPARATOR
                        + nestedFieldMetadata.getName();
                var propertyColumn =
                    features.stream()
                        .map(mvtFeature -> (String) mvtFeature.properties().get(mvtPropertyName))
                        .collect(Collectors.toList());
                sharedDictionary.add(propertyColumn);
              }
            } else {
              throw new IllegalArgumentException(
                  "Only shared dictionary encoding is currently supported for nested property columns.");
            }
          } else {
            throw new IllegalArgumentException(
                "Only fields of type String are currently supported as nested property columns.");
          }
        }

        if (sharedDictionary.stream().allMatch(List::isEmpty)) {
          /* Set number of streams to zero if no columns are present in this tile */
          var encodedFieldMetadata = EncodingUtils.encodeVarints(new long[] {0}, false, false);
          return CollectionUtils.concatByteArrays(
              featureScopedPropertyColumns, encodedFieldMetadata);
        }

        var nestedColumns =
            StringEncoder.encodeSharedDictionary(
                sharedDictionary, physicalLevelTechnique, useAdvancedEncodings);
        // TODO: fix -> ony quick and dirty fix
        var numStreams = nestedColumns.getLeft() == 0 ? 0 : 1;
        /* Set number of streams to zero if no columns are present in this tile */
        var encodedFieldMetadata =
            EncodingUtils.encodeVarints(new long[] {numStreams}, false, false);

        // TODO: add present stream and present stream metadata for struct column in addition
        // to the FieldMetadata to be compliant with the specification
        featureScopedPropertyColumns =
            CollectionUtils.concatByteArrays(
                featureScopedPropertyColumns, encodedFieldMetadata, nestedColumns.getRight());
      } else {
        throw new IllegalArgumentException(
            "The specified data type for the field is currently not supported: " + columnMetadata);
      }
    }

    return featureScopedPropertyColumns;
  }

  public static byte[] encodeScalarPropertyColumn(
          MltTilesetMetadata.Column columnMetadata,
          List<Feature> features,
          PhysicalLevelTechnique physicalLevelTechnique,
          boolean useAdvancedEncodings)
          throws IOException {
    var iter = features.iterator();
    Supplier<Object> valueProvider = () -> {
      var feature = iter.next();
      return columnMetadata.getName().equals(ID_COLUMN_NAME)? feature.id() :
              feature.properties().get(columnMetadata.getName());
    };
    return encodeScalarPropertyColumn(features.size(), columnMetadata.getScalarType().getPhysicalType(), valueProvider,
            physicalLevelTechnique, useAdvancedEncodings);
  }

  static byte[] encodeScalarPropertyColumn(
          Integer numValues,
          MltTilesetMetadata.ScalarType scalarType,
          Supplier<Object> valueProvider,
          PhysicalLevelTechnique physicalLevelTechnique,
          boolean useAdvancedEncodings)
          throws IOException {
    switch (scalarType) {
      case BOOLEAN:
      {
        var booleanColumn = ScalarColumnEncoder.encodeBooleanColumn(numValues, valueProvider);
        var encodedFieldMetadata = EncodingUtils.encodeVarints(new long[] {2}, false, false);
        return CollectionUtils.concatByteArrays(encodedFieldMetadata, booleanColumn);
      }
      case UINT_32:
      case INT_32:
      {
        var intColumn =
                ScalarColumnEncoder.encodeInt32Column(numValues, valueProvider, physicalLevelTechnique,
                        scalarType.equals(MltTilesetMetadata.ScalarType.INT_32));
        var encodedFieldMetadata = EncodingUtils.encodeVarints(new long[] {2}, false, false);
        return CollectionUtils.concatByteArrays(encodedFieldMetadata, intColumn);
      }
      case UINT_64:
      case INT_64:
      {
        var intColumn = ScalarColumnEncoder.encodeInt64Column(numValues, valueProvider,
                scalarType.equals(MltTilesetMetadata.ScalarType.INT_64));
        var encodedFieldMetadata = EncodingUtils.encodeVarints(new long[] {2}, false, false);
        return CollectionUtils.concatByteArrays(encodedFieldMetadata, intColumn);
      }
      case FLOAT:
      {
        var floatColumn = ScalarColumnEncoder.encodeFloatColumn(numValues, valueProvider);
        var encodedFieldMetadata = EncodingUtils.encodeVarints(new long[] {2}, false, false);
        return CollectionUtils.concatByteArrays(encodedFieldMetadata, floatColumn);
      }
      case DOUBLE:
      {
        var doubleColumn = ScalarColumnEncoder.encodeDoubleColumn(numValues, valueProvider);
        var encodedFieldMetadata = EncodingUtils.encodeVarints(new long[] {2}, false, false);
        return CollectionUtils.concatByteArrays(encodedFieldMetadata, doubleColumn);
      }
      case STRING:
      {
        return ScalarColumnEncoder.encodeStringColumn(numValues, valueProvider, physicalLevelTechnique, useAdvancedEncodings);
      }
      default:
        throw new IllegalArgumentException(
                "The specified scalar data type is currently not supported: " + scalarType);
    }
  }

  public static byte[] encodeComplexPropertyColumn(
          Field fieldMetadata,
          List<Feature> features,
          PhysicalLevelTechnique physicalLevelTechnique,
          boolean useAdvancedEncodings) throws IOException {
    /* Convert the features into JsonNodes for traversal */
    List<JsonNode> jsonNodes = new ArrayList<>();
    for(var feature : features) {
      var json = (String)feature.properties().get(fieldMetadata.name);
      if(json == null) {
        jsonNodes.add(null);
        continue;
      }
      var node = new ObjectMapper().readTree(json);
      jsonNodes.add(!node.isEmpty()? node : null);
    }

    return ComplexColumnEncoder.encodeComplexPropertyColumn(fieldMetadata, jsonNodes, physicalLevelTechnique, useAdvancedEncodings);
  }

}
