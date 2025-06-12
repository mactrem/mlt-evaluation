package com.mlt.vector;

import com.fasterxml.jackson.databind.JsonNode;
import com.mlt.data.Feature;
import com.mlt.vector.constant.IntConstVector;
import com.mlt.vector.flat.IntFlatVector;
import com.mlt.vector.geometry.GeometryVector;
import com.mlt.vector.sequence.IntSequenceVector;

import java.util.*;

import org.locationtech.jts.geom.Geometry;

/** In-Memory representation of MLT storage format for efficient processing */
public class FeatureTable implements Iterable<Feature> {
  private final String name;
  private final Vector idColumn;
  private final GeometryVector geometryColumn;
  private final Vector[] propertyColumns;

  //TODO: refactor -> only quick and dirty hack
  private Map<String, List<? extends JsonNode>> nestedPropertyColumns;

  public FeatureTable(String name, GeometryVector geometryVector, Vector[] properties) {
    this(name, null, geometryVector, properties);
  }

  public FeatureTable(
      String name, Vector idColumn, GeometryVector geometryVector, Vector[] properties) {
    this.name = name;
    this.idColumn = idColumn;
    this.geometryColumn = geometryVector;
    this.propertyColumns = properties;
  }

  public FeatureTable(
          String name, Vector idColumn, GeometryVector geometryVector, Vector[] properties,
          Map<String, List<? extends JsonNode>> nestedPropertyColumns) {
    this(name, idColumn, geometryVector, properties);
    this.nestedPropertyColumns = nestedPropertyColumns;
  }

  @Override
  public Iterator<Feature> iterator() {
    return new Iterator<>() {
      private int index = 0;
      private final Iterator<Geometry> geometryIterator = geometryColumn.iterator();

      @Override
      public boolean hasNext() {
        return index < idColumn.size();
      }

      @Override
      public Feature next() {
        var id =
            isIntVector(idColumn)
                ? ((Integer) idColumn.getValue(index).get()).longValue()
                : (Long) idColumn.getValue(index).get();

        var geometry = geometryIterator.next();

        var properties = new HashMap<String, Object>();
        for(var i = 0; i < propertyColumns.length; i++){
          var propertyColumnVector = propertyColumns[i];
          var columnName = propertyColumnVector.getName();
          var propertyValue = propertyColumnVector.getValue(index);
          if (propertyValue.isPresent()) {
            var value = propertyValue.get();
            properties.put(columnName, value);
          }
        }

        var nestedProperties = new HashMap<String, JsonNode>();
        if(nestedPropertyColumns != null){
          for(var column : nestedPropertyColumns.entrySet()){
            var columnName = column.getKey();
            var columnValues = column.getValue();
            if(!columnValues.isEmpty()){
              var nestedPropertyValue = columnValues.get(index);
              if (nestedPropertyValue != null) {
                nestedProperties.put(columnName, nestedPropertyValue);
              }
            }
          }
        }

        index++;
        return new Feature(id, geometry, properties, nestedProperties);
      }
    };
  }

  private boolean isIntVector(Vector<?, ?> vector) {
    return vector instanceof IntFlatVector
        || vector instanceof IntConstVector
        || vector instanceof IntSequenceVector;
  }

  public String getName() {
    return name;
  }

  public Vector getIdColumn() {
    return idColumn;
  }

  public GeometryVector getGeometryColumn() {
    return geometryColumn;
  }

  public Vector[] getPropertyColumns() {
    return propertyColumns;
  }
}
