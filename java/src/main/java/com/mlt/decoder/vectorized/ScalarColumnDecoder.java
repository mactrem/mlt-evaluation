package com.mlt.decoder.vectorized;

import com.mlt.metadata.stream.StreamMetadataDecoder;
import com.mlt.metadata.tileset.MltTilesetMetadata;
import com.mlt.vector.BitVector;
import com.mlt.vector.Vector;
import com.mlt.vector.VectorType;
import com.mlt.vector.constant.IntConstVector;
import com.mlt.vector.constant.LongConstVector;
import com.mlt.vector.flat.*;
import me.lemire.integercompression.IntWrapper;

import java.nio.IntBuffer;
import java.nio.LongBuffer;

import static com.mlt.metadata.tileset.MltTilesetMetadata.ScalarType.INT_32;
import static com.mlt.metadata.tileset.MltTilesetMetadata.ScalarType.INT_64;

public class ScalarColumnDecoder {
    public static BooleanFlatVector decodeBooleanColumn(
            byte[] data,
            IntWrapper offset,
            String columnName,
            BitVector nullabilityBuffer) {
        var dataStreamMetadata = StreamMetadataDecoder.decode(data, offset);
        //TODO: add support for ConstBooleanVector
      /*var vectorType =
          VectorizedDecodingUtils.getVectorTypeBooleanStream(
                  dataStreamMetadata.numValues(), dataStreamMetadata.byteLength(), data, offset);*/
        boolean isNullable = nullabilityBuffer != null;
        //if (vectorType.equals(VectorType.FLAT)) {
        var dataStream =
                isNullable
                        ? VectorizedDecodingUtils.decodeNullableBooleanRle(
                        data, dataStreamMetadata.numValues(), offset, nullabilityBuffer)
                        : VectorizedDecodingUtils.decodeBooleanRle(
                        data, dataStreamMetadata.numValues(), offset);
        var dataVector = new BitVector(dataStream, dataStreamMetadata.numValues());
        return new BooleanFlatVector(columnName, nullabilityBuffer, dataVector);
      /*} else {
        // TODO: handle const
        throw new IllegalArgumentException("ConstBooleanVector ist not supported yet.");
      }*/
    }

    public static DoubleFlatVector decodeDoubleColumn(
            byte[] data,
            IntWrapper offset,
            String columnName,
            BitVector nullabilityBuffer,
            int numValues) {
        var dataStreamMetadata = StreamMetadataDecoder.decode(data, offset);
        if (nullabilityBuffer != null) {
            var dataStream =
                    VectorizedDoubleDecoder.decodeNullableDoubleStream(
                            data, offset, dataStreamMetadata, nullabilityBuffer);
            return new DoubleFlatVector(columnName, nullabilityBuffer, dataStream);
        }

        var dataStream = VectorizedDoubleDecoder.decodeDoubleStream(data, offset, dataStreamMetadata);
        return new DoubleFlatVector(columnName, dataStream, numValues);
    }

    public static FloatFlatVector decodeFloatColumn(
            byte[] data,
            IntWrapper offset,
            String columnName,
            BitVector nullabilityBuffer,
            int numValues) {
        var dataStreamMetadata = StreamMetadataDecoder.decode(data, offset);
        if (nullabilityBuffer != null) {
            var dataStream =
                    VectorizedFloatDecoder.decodeNullableFloatStream(
                            data, offset, dataStreamMetadata, nullabilityBuffer);
            return new FloatFlatVector(columnName, nullabilityBuffer, dataStream);
        }

        var dataStream = VectorizedFloatDecoder.decodeFloatStream(data, offset, dataStreamMetadata);
        return new FloatFlatVector(columnName, dataStream, numValues);
    }

    public static Vector<LongBuffer, Long> decodeLongColumn(
            byte[] data,
            IntWrapper offset,
            String columnName,
            BitVector nullabilityBuffer,
            MltTilesetMetadata.ScalarType scalarType,
            int numFeatures) {
        var dataStreamMetadata = StreamMetadataDecoder.decode(data, offset);
        var vectorType = VectorizedDecodingUtils.getVectorType(dataStreamMetadata, numFeatures);
        var isNullable = nullabilityBuffer != null;
        var isSigned = scalarType == INT_64;
        // TODO: also add support for SequenceVector
        if (vectorType.equals(VectorType.FLAT)) {
            if (isNullable) {
                var dataStream =
                        VectorizedIntegerDecoder.decodeNullableLongStream(
                                data, offset, dataStreamMetadata, isSigned, nullabilityBuffer);
                return new LongFlatVector(columnName, nullabilityBuffer, dataStream);
            } else {
                var dataStream =
                        VectorizedIntegerDecoder.decodeLongStream(data, offset, dataStreamMetadata, isSigned);
                return new LongFlatVector(columnName, dataStream, dataStreamMetadata.numValues());
            }
        } else {
            /* handle ConstVector */
            var constValue =
                    VectorizedIntegerDecoder.decodeConstLongStream(
                            data, offset, dataStreamMetadata, isSigned);
            return isNullable
                    ? new LongConstVector(columnName, nullabilityBuffer, constValue)
                    : new LongConstVector(columnName, constValue, dataStreamMetadata.numValues());
        }
    }

    public static Vector<IntBuffer, Integer> decodeIntColumn(
            byte[] data,
            IntWrapper offset,
            String columnName,
            MltTilesetMetadata.ScalarType scalarType,
            BitVector nullabilityBuffer,
            int numFeatures) {
        var dataStreamMetadata = StreamMetadataDecoder.decode(data, offset);
        var vectorType = VectorizedDecodingUtils.getVectorType(dataStreamMetadata, numFeatures);
        var isSigned = scalarType == INT_32;
        var isNullable = nullabilityBuffer != null;
        // TODO: also add support for SequenceVector
        if (vectorType.equals(VectorType.FLAT)) {
            if (isNullable) {
                var dataStream =
                        VectorizedIntegerDecoder.decodeNullableIntStream(
                                data, offset, dataStreamMetadata, isSigned, nullabilityBuffer);
                return new IntFlatVector(columnName, nullabilityBuffer, dataStream);
            } else {
                var dataStream =
                        VectorizedIntegerDecoder.decodeIntStream(data, offset, dataStreamMetadata, isSigned);
                return new IntFlatVector(columnName, dataStream, dataStreamMetadata.numValues());
            }
        } else {
            /* handle ConstVector */
            var constValue =
                    VectorizedIntegerDecoder.decodeConstIntStream(data, offset, dataStreamMetadata, isSigned);
            return isNullable
                    ? new IntConstVector(columnName, nullabilityBuffer, constValue)
                    : new IntConstVector(columnName, constValue, dataStreamMetadata.numValues());
        }
    }
}
