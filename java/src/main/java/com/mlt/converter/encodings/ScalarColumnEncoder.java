package com.mlt.converter.encodings;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.common.primitives.Bytes;
import com.mlt.converter.CollectionUtils;
import com.mlt.metadata.stream.LogicalLevelTechnique;
import com.mlt.metadata.stream.PhysicalLevelTechnique;
import com.mlt.metadata.stream.PhysicalStreamType;
import com.mlt.metadata.stream.StreamMetadata;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.util.ArrayList;
import java.util.BitSet;
import java.util.function.Supplier;
import java.util.stream.Collectors;

public class ScalarColumnEncoder {
    public static byte @NotNull [] createPresentStream(int numValues, BitSet presentStream) throws IOException {
        var encodedPresentStream = EncodingUtils.encodeBooleanRle(presentStream, numValues);
        var encodedPresentStreamMetadata =
                new StreamMetadata(
                        PhysicalStreamType.PRESENT,
                        null,
                        LogicalLevelTechnique.RLE,
                        LogicalLevelTechnique.NONE,
                        PhysicalLevelTechnique.NONE,
                        numValues,
                        encodedPresentStream.length)
                        .encode();
        return Bytes.concat(
                encodedPresentStreamMetadata,
                encodedPresentStream);
    }

    public static byte[] encodeBooleanColumn(int numValues, Supplier<Object> valueProvider)
            throws IOException {
        var presentStream = new BitSet(numValues);
        var dataStream = new BitSet(numValues);
        var dataStreamIndex = 0;
        var presentStreamIndex = 0;
        for (var i = 0; i < numValues; i++) {
            var propertyValue = valueProvider.get();
            if (propertyValue != null) {
                boolean value = propertyValue instanceof JsonNode ? ((JsonNode) propertyValue).booleanValue() :
                        (boolean) propertyValue;
                dataStream.set(dataStreamIndex++, value);
                presentStream.set(presentStreamIndex++, true);
            } else {
                presentStream.set(presentStreamIndex++, false);
            }
        }

        var encodedPresentStream = createPresentStream(numValues, presentStream);
        var encodedDataStream = EncodingUtils.encodeBooleanRle(dataStream, dataStreamIndex);
        var encodedDataStreamMetadata =
                new StreamMetadata(
                        PhysicalStreamType.DATA,
                        null,
                        LogicalLevelTechnique.RLE,
                        LogicalLevelTechnique.NONE,
                        PhysicalLevelTechnique.NONE,
                        dataStreamIndex,
                        encodedDataStream.length)
                        .encode();
        return Bytes.concat(encodedPresentStream, encodedDataStreamMetadata, encodedDataStream);
    }

    public static byte[] encodeFloatColumn(int numValues, Supplier<Object> valueProvider)
            throws IOException {
        var values = new ArrayList<Float>();
        var present = new ArrayList<Boolean>(numValues);
        for (var i = 0; i < numValues; i++) {
            var propertyValue = valueProvider.get();
            if (propertyValue != null) {
                float value = propertyValue instanceof JsonNode ? ((JsonNode) propertyValue).floatValue() :
                        (float) propertyValue;
                values.add(value);
                present.add(true);
            } else {
                present.add(false);
            }
        }

        var encodedPresentStream =
                BooleanEncoder.encodeBooleanStream(present, PhysicalStreamType.PRESENT);
        var encodedDataStream = FloatEncoder.encodeFloatStream(values);
        return Bytes.concat(encodedPresentStream, encodedDataStream);
    }

    public static byte[] encodeDoubleColumn(int numValues, Supplier<Object> valueProvider)
            throws IOException {
        var values = new ArrayList<Double>();
        var present = new ArrayList<Boolean>(numValues);
        for (var i = 0; i < numValues; i++) {
            var propertyValue = valueProvider.get();
            if (propertyValue != null) {
                var doubleValue = propertyValue instanceof JsonNode ? ((JsonNode) propertyValue).doubleValue() :
                        (double) propertyValue;
                values.add(doubleValue);
                present.add(true);
            } else {
                present.add(false);
            }
        }

        var encodedPresentStream =
                BooleanEncoder.encodeBooleanStream(present, PhysicalStreamType.PRESENT);
        var encodedDataStream = FloatEncoder.encodeDoubleStream(values);
        return Bytes.concat(encodedPresentStream, encodedDataStream);
    }

    public static byte[] encodeInt32Column(int numValues, Supplier<Object> valueProvider,
                                    PhysicalLevelTechnique physicalLevelTechnique, boolean isSigned)
            throws IOException {
        var values = new ArrayList<Integer>();
        var present = new ArrayList<Boolean>(numValues);
        for (var i = 0; i < numValues; i++) {
            var propertyValue = valueProvider.get();
            if (propertyValue != null) {
                // TODO: refactor -> handle long values for ids differently
                var value = propertyValue instanceof JsonNode ? ((JsonNode) propertyValue).intValue() :
                        (propertyValue instanceof Long ? ((Long) propertyValue).intValue() : (int) propertyValue);
                values.add(value);
                present.add(true);
            } else {
                present.add(false);
            }
        }

        var encodedPresentStream =
                BooleanEncoder.encodeBooleanStream(present, PhysicalStreamType.PRESENT);
        var encodedDataStream =
                IntegerEncoder.encodeIntStream(
                        values, physicalLevelTechnique, isSigned, PhysicalStreamType.DATA, null);

        return Bytes.concat(encodedPresentStream, encodedDataStream);
    }

    public static byte[] encodeInt64Column(
            int numValues, Supplier<Object> valueProvider, boolean isSigned) throws IOException {
        var values = new ArrayList<Long>();
        var present = new ArrayList<Boolean>(numValues);
        for (var i = 0; i < numValues; i++) {
            var propertyValue = valueProvider.get();
            if (propertyValue != null) {
                var value = propertyValue instanceof JsonNode ? ((JsonNode) propertyValue).longValue() :
                        (long) propertyValue;
                values.add(value);
                present.add(true);
            } else {
                present.add(false);
            }
        }

        var encodedPresentStream =
                BooleanEncoder.encodeBooleanStream(present, PhysicalStreamType.PRESENT);
        var encodedDataStream =
                IntegerEncoder.encodeLongStream(values, isSigned, PhysicalStreamType.DATA, null);
        return Bytes.concat(encodedPresentStream, encodedDataStream);
    }

    static byte[] encodeStringColumn(Integer numValues, Supplier<Object> valueProvider, PhysicalLevelTechnique physicalLevelTechnique, boolean useAdvancedEncodings) throws IOException {
      /*
       * -> Single Column
       *   -> Plain Encoding Stream -> present, length, data
       *   -> Dictionary Encoding Streams -> present, length, data, dictionary
       * -> N Columns Dictionary
       *   -> SharedDictionaryLength, SharedDictionary, present1, data1, present2, data2
       * -> N Columns FsstDictionary
       * */
      var values = new ArrayList<String>(numValues);
      for(var i = 0; i < numValues; ++i) {
        var propertyValue = valueProvider.get();
        if(propertyValue == null) {
          values.add(null);
          continue;
        }

        var value = propertyValue instanceof JsonNode? ((JsonNode)propertyValue).textValue() :
                (String)propertyValue;
        values.add(value);
      }

      //TODO: also encode empty strings
      var present = values.stream().map(v -> v != null && !v.isEmpty()).collect(Collectors.toList());
      var presentStream =
              BooleanEncoder.encodeBooleanStream(present, PhysicalStreamType.PRESENT);

      var filteredValues = values.stream().filter(v -> v != null && !v.isEmpty()).collect(Collectors.toList());
      var stringColumn =
              StringEncoder.encode(filteredValues, physicalLevelTechnique, useAdvancedEncodings);
      /* Plus 1 for present stream */
      var encodedFieldMetadata =
              EncodingUtils.encodeVarints(new long[] {stringColumn.getLeft() + 1}, false, false);
      return CollectionUtils.concatByteArrays(
              encodedFieldMetadata, presentStream, stringColumn.getRight());
    }
}
