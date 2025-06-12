package com.mlt.decoder.vectorized;

import com.mlt.converter.metadata.Field;
import com.mlt.metadata.stream.StreamMetadata;
import com.mlt.metadata.stream.StreamMetadataDecoder;
import com.mlt.metadata.tileset.MltTilesetMetadata;
import com.mlt.vector.BitVector;
import com.mlt.vector.NestedVector;
import com.mlt.vector.Vector;
import com.mlt.vector.flat.BooleanFlatVector;
import com.mlt.vector.flat.FloatFlatVector;
import com.mlt.vector.flat.IntFlatVector;
import com.mlt.vector.flat.LongFlatVector;
import java.io.IOException;
import java.util.Map;

import me.lemire.integercompression.IntWrapper;

import static com.mlt.metadata.tileset.MltTilesetMetadata.ScalarType.*;

public class VectorizedPropertyDecoder {
  private VectorizedPropertyDecoder() {}

  public static Vector decodePropertyColumn(
      byte[] data, IntWrapper offset, MltTilesetMetadata.Column column, int numStreams)
      throws IOException {
    StreamMetadata presentStreamMetadata;
    if (column.hasScalarType()) {
      BitVector presentStream = null;
      var numValues = 0;
      if (numStreams > 1) {
        presentStreamMetadata = StreamMetadataDecoder.decode(data, offset);
        numValues = presentStreamMetadata.numValues();
        var presentVector = VectorizedDecodingUtils.decodeBooleanRle(data, numValues, offset);
        presentStream = new BitVector(presentVector, presentStreamMetadata.numValues());
      }

      var scalarType = column.getScalarType();
      switch (scalarType.getPhysicalType()) {
        case BOOLEAN:
          {
            var dataStreamMetadata = StreamMetadataDecoder.decode(data, offset);
            var dataStream =
                VectorizedDecodingUtils.decodeBooleanRle(
                    data, dataStreamMetadata.numValues(), offset);
            var dataVector = new BitVector(dataStream, dataStreamMetadata.numValues());
            return presentStream != null
                ? new BooleanFlatVector(column.getName(), presentStream, dataVector)
                : new BooleanFlatVector(
                    column.getName(), dataVector, dataStreamMetadata.numValues());
          }
        case UINT_32:
        case INT_32:
          {
            var dataStreamMetadata = StreamMetadataDecoder.decode(data, offset);
            var dataStream =
                VectorizedIntegerDecoder.decodeIntStream(
                    data,
                    offset,
                    dataStreamMetadata,
                    scalarType.getPhysicalType() == INT_32);
            return presentStream != null
                ? new IntFlatVector(column.getName(), presentStream, dataStream)
                : new IntFlatVector(column.getName(), dataStream, dataStreamMetadata.numValues());
          }
        case UINT_64:
        case INT_64:
          {
            var dataStreamMetadata = StreamMetadataDecoder.decode(data, offset);
            var dataStream =
                VectorizedIntegerDecoder.decodeLongStream(
                    data,
                    offset,
                    dataStreamMetadata,
                    scalarType.getPhysicalType() == INT_64);
            return presentStream != null
                ? new LongFlatVector(column.getName(), presentStream, dataStream)
                : new LongFlatVector(column.getName(), dataStream, dataStreamMetadata.numValues());
          }
        case FLOAT:
          {
            var dataStreamMetadata = StreamMetadataDecoder.decode(data, offset);
            var dataStream =
                VectorizedFloatDecoder.decodeFloatStream(data, offset, dataStreamMetadata);
            return presentStream != null
                ? new FloatFlatVector(column.getName(), presentStream, dataStream)
                : new FloatFlatVector(column.getName(), dataStream, dataStreamMetadata.numValues());
          }
          /*case DOUBLE:{
              break;
          }*/
        case STRING:
          {
            return VectorizedStringDecoder.decode(
                column.getName(), data, offset, numStreams - 1, presentStream);
          }
        default:
          throw new IllegalArgumentException(
              "The specified data type for the field is currently not supported: " + scalarType);
      }
    }

    /* Handle struct which currently only supports strings as nested fields for supporting shared dictionary encoding */
    if (numStreams == 1) {
      throw new IllegalArgumentException("Present stream currently not supported for Structs.");
    }

    return VectorizedStringDecoder.decodeSharedDictionary(data, offset, column);
  }

  public static Vector decodeToRandomAccessFormat(
      byte[] data,
      IntWrapper offset,
      MltTilesetMetadata.Column column,
      int numStreams,
      int numFeatures) {
    StreamMetadata presentStreamMetadata;
    if (column.hasScalarType()) {
      BitVector nullabilityBuffer = null;
      var numValues = 0;
      if (numStreams == 0) {
        /*
         * The absence of an entire column can be identified by a zero value for the number of
         * streams.
         */
        return null;
      } else if (numStreams > 1) {
        presentStreamMetadata = StreamMetadataDecoder.decode(data, offset);
        //TODO: add check for const and flat vector again
        numValues = presentStreamMetadata.numValues();
        var presentVector = VectorizedDecodingUtils.decodeBooleanRle(data, numValues, offset);
        nullabilityBuffer = new BitVector(presentVector, presentStreamMetadata.numValues());
      }

      var scalarType = column.getScalarType();
      return switch (scalarType.getPhysicalType()) {
        case BOOLEAN -> ScalarColumnDecoder.decodeBooleanColumn(data, offset, column.getName(), nullabilityBuffer);
        case UINT_32, INT_32 ->
            ScalarColumnDecoder.decodeIntColumn(data, offset, column.getName(), scalarType.getPhysicalType(), nullabilityBuffer, numFeatures);
        case UINT_64, INT_64 ->
            ScalarColumnDecoder.decodeLongColumn(data, offset, column.getName(), nullabilityBuffer, scalarType.getPhysicalType(), numFeatures);
        case FLOAT ->
            // TODO: add rle encoding and ConstVector
            ScalarColumnDecoder.decodeFloatColumn(data, offset, column.getName(), nullabilityBuffer, numFeatures);
        case DOUBLE ->
            // TODO: add rle encoding and ConstVector
            ScalarColumnDecoder.decodeDoubleColumn(data, offset, column.getName(), nullabilityBuffer, numFeatures);
        case STRING ->
            VectorizedStringDecoder.decodeToRandomAccessFormat(
                column.getName(), data, offset, numStreams - 1, nullabilityBuffer, numFeatures);
        default ->
            throw new IllegalArgumentException(
                "The specified data type for the field is currently not supported: " + scalarType);
      };
    }

    /* Handle struct which currently only supports strings as nested fields for supporting shared dictionary encoding */
    // TODO: enable again
    /*if (numStreams == 1) {
      throw new IllegalArgumentException("Present stream currently not supported for Structs.");
    }*/

    if (numStreams != 1) {
      return null;
    }

    return VectorizedStringDecoder.decodeSharedDictionaryToRandomAccessFormat(
        data, offset, column, numFeatures);
  }

  public static Vector decodeToRandomAccessFormat(
          byte[] data,
          IntWrapper offset,
          MltTilesetMetadata.Column column,
          Map<String, Field> nestedScheme,
          int numStreams,
          int numFeatures,
          String featureTableName) {
    StreamMetadata presentStreamMetadata;
    if (column.hasScalarType()) {
      BitVector nullabilityBuffer = null;
      var numValues = 0;
      if (numStreams == 0) {
        /*
         * The absence of an entire column can be identified by a zero value for the number of
         * streams.
         */
        return null;
      } else if (numStreams > 1) {
        presentStreamMetadata = StreamMetadataDecoder.decode(data, offset);
        //TODO: add check for const and flat vector again
        numValues = presentStreamMetadata.numValues();
        var presentVector = VectorizedDecodingUtils.decodeBooleanRle(data, numValues, offset);
        nullabilityBuffer = new BitVector(presentVector, presentStreamMetadata.numValues());
      }

      var scalarType = column.getScalarType();
      return switch (scalarType.getPhysicalType()) {
        case BOOLEAN -> ScalarColumnDecoder.decodeBooleanColumn(data, offset, column.getName(), nullabilityBuffer);
        case UINT_32, INT_32 ->
                ScalarColumnDecoder.decodeIntColumn(data, offset, column.getName(), scalarType.getPhysicalType(), nullabilityBuffer,
                        numFeatures);
        case UINT_64, INT_64 ->
                ScalarColumnDecoder.decodeLongColumn(data, offset, column.getName(), nullabilityBuffer, scalarType.getPhysicalType(),
                        numFeatures);
        case FLOAT ->
          // TODO: add rle encoding and ConstVector
                ScalarColumnDecoder.decodeFloatColumn(data, offset, column.getName(), nullabilityBuffer, numFeatures);
        case DOUBLE ->
          // TODO: add rle encoding and ConstVector
                ScalarColumnDecoder.decodeDoubleColumn(data, offset, column.getName(), nullabilityBuffer, numFeatures);
        case STRING -> {
                var field = nestedScheme.get(featureTableName + "." + column.getName());
                if(field != null) {
                  var jsonNode = ComplexColumnDecoder.decodeComplexColumn(data, offset, field, null, column.getName(),
                          null).get(0);
                  yield new NestedVector(jsonNode);
                }

                yield VectorizedStringDecoder.decodeToRandomAccessFormat(
                  column.getName(), data, offset, numStreams - 1, nullabilityBuffer, numFeatures);

        }
        default ->
                throw new IllegalArgumentException(
                        "The specified data type for the field is currently not supported: " + scalarType);
      };
    }

    if (numStreams != 1) {
      return null;
    }

    return VectorizedStringDecoder.decodeSharedDictionaryToRandomAccessFormat(
            data, offset, column, numFeatures);
  }
}
