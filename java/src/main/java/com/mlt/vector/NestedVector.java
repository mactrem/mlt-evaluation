package com.mlt.vector;

import com.fasterxml.jackson.databind.JsonNode;

//Quick and dirty container class for tests
public class NestedVector extends Vector {
    public JsonNode node = null;

    public NestedVector(JsonNode node) {
        super(null, null, null);
        this.node = node;
    }

    @Override
    protected Object getValueFromBuffer(int index) {
        return null;
    }
}
