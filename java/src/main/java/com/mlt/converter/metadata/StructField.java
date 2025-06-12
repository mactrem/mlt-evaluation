package com.mlt.converter.metadata;


import java.util.HashMap;
import java.util.Map;

public class StructField extends Field {
    public Map<String, Field> childs = new HashMap<>();
}
