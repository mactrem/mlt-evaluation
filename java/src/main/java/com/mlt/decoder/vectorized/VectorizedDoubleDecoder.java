package com.mlt.decoder.vectorized;

import com.mlt.metadata.stream.StreamMetadata;
import com.mlt.vector.BitVector;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.DoubleBuffer;
import me.lemire.integercompression.IntWrapper;

public class VectorizedDoubleDecoder {
  private VectorizedDoubleDecoder() {}

  public static DoubleBuffer decodeDoubleStream(
      byte[] data, IntWrapper offset, StreamMetadata streamMetadata) {
    // TODO: refactor for performance
    var doubleBuffer =
        ByteBuffer.wrap(data, offset.get(), streamMetadata.byteLength())
            .order(ByteOrder.LITTLE_ENDIAN)
            .asDoubleBuffer();
    offset.add(streamMetadata.byteLength());
    return doubleBuffer;
  }

  public static DoubleBuffer decodeNullableDoubleStream(
      byte[] data, IntWrapper offset, StreamMetadata streamMetadata, BitVector nullabilityBuffer) {
    var doubleBuffer = decodeDoubleStream(data, offset, streamMetadata);

    var nullableDoubleBuffer = new double[nullabilityBuffer.size()];
    var index = 0;
    for (var i = 0; i < nullabilityBuffer.size(); i++) {
      // TODO: or use Double.NaN -> check performance
      nullableDoubleBuffer[i] = nullabilityBuffer.get(i) ? doubleBuffer.get(index++) : 0;
    }

    return DoubleBuffer.wrap(nullableDoubleBuffer);
  }
}
