package com.mlt.data;

import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import org.locationtech.jts.geom.Geometry;

//public record Feature(long id, Geometry geometry, Map<String, Object> properties) {}

public class Feature {
    private long id;
    private Geometry geometry;
    private Map<String, Object> properties;
    private Map<String, JsonNode> nestedProperties;

    public Feature(long id, Geometry geometry, Map<String, Object> properties){
        this.id = id;
        this.geometry = geometry;
        this.properties = properties;
    }

    public Feature(long id, Geometry geometry, Map<String, Object> properties,  Map<String, JsonNode> nestedProperties){
        this.id = id;
        this.geometry = geometry;
        this.properties = properties;
        this.nestedProperties = nestedProperties;
    }

    public long id() {
        return id;
    }

    public Geometry geometry() {
        return geometry;
    }

    public Map<String, Object> properties() {
        return properties;
    }

    public Map<String, JsonNode> nestedProperties() {
        return nestedProperties;
    }

}


