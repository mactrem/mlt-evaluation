package com.mlt.vector.flat;

import com.mlt.vector.BitVector;
import com.mlt.vector.Vector;
import java.nio.ByteBuffer;

public class BooleanFlatVector extends Vector<ByteBuffer, Boolean> {
  private final BitVector dataVector;

  public BooleanFlatVector(String name, BitVector dataVector, int size) {
    super(name, dataVector.getBuffer(), size);
    this.dataVector = dataVector;
  }

  public BooleanFlatVector(String name, BitVector nullabilityBuffer, BitVector dataVector) {
    super(name, nullabilityBuffer, dataVector.getBuffer());
    this.dataVector = dataVector;
  }

  @Override
  protected Boolean getValueFromBuffer(int index) {
    //TODO: fix -> workaround for the case when all values are false and BitSet return empty array
    //and also when the last bits are truncated
    //-> Introduce ConstBooleanVector for the const case
    //-> add padding to the end of the buffer for the other case
    var dataBuffer = this.dataVector.getBuffer();
    return (dataBuffer.capacity() * 8 > index) && this.dataVector.get(index);
  }
}
