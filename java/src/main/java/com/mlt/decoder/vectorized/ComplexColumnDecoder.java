package com.mlt.decoder.vectorized;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mlt.converter.metadata.Field;
import com.mlt.converter.metadata.RepeatedField;
import com.mlt.converter.metadata.ScalarField;
import com.mlt.converter.metadata.StructField;
import com.mlt.decoder.DecodingUtils;
import com.mlt.metadata.stream.StreamMetadataDecoder;
import com.mlt.metadata.tileset.MltTilesetMetadata;
import com.mlt.vector.BitVector;
import com.mlt.vector.Vector;
import me.lemire.integercompression.IntWrapper;
import org.jetbrains.annotations.NotNull;

import java.nio.ByteBuffer;
import java.nio.IntBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.Supplier;

import static com.mlt.decoder.vectorized.ScalarColumnDecoder.*;
import static com.mlt.metadata.tileset.MltTilesetMetadata.ScalarType.*;

public class ComplexColumnDecoder {
    public static List<? extends JsonNode> decodeComplexColumn(
            byte[] data,
            IntWrapper offset,
            Field field,
            List<? extends JsonNode> parentNodes,
            String fieldName,
            IntBuffer lengthStream
    ) {
        /* Leaf fields are encoded as regular plain columns so also the number of streams is encoded */
        var numStreams = field instanceof ScalarField ? DecodingUtils.decodeVarint(data, offset, 1)[0]
                    : 0;

        /* Currently every nested field has a present stream assigned so no optional fields are currently encoded in the
         * converter */
        var nullabilityBuffer = getNullabilityBuffer(data, offset);

        if (field instanceof StructField structField) {
            Supplier<JsonNode> childNodeSupplier = () -> new ObjectMapper().createObjectNode();
            var structNodes = createChildNodes(parentNodes, lengthStream, nullabilityBuffer, fieldName,
                    childNodeSupplier);
            if(structNodes.isEmpty()){
                /* All fields contain no data */
                return structNodes;
            }

            /* Iterate over all fields of the struct and assign the fields to the structs */
            for (var structFields : structField.childs.entrySet()) {
                var propertyName = structFields.getKey();
                var propertyValue = structFields.getValue();
                decodeComplexColumn(data, offset, propertyValue, structNodes, propertyName, null);
            }

            /* If this is a root node add null values to provide random access */
            //TODO: get rid of that linear complexity
            return parentNodes == null? addNullValues(nullabilityBuffer, structNodes) : structNodes;
        }

        if (field instanceof RepeatedField) {
            Supplier<JsonNode> childNodeSupplier = () -> new ObjectMapper().createArrayNode();
            var arrayNodes = createChildNodes(parentNodes, lengthStream, nullabilityBuffer, fieldName,
                    childNodeSupplier);
            if(arrayNodes.isEmpty()){
                /* All fields contain no data */
                return arrayNodes;
            }

            var lengthStreamMetadata = StreamMetadataDecoder.decode(data, offset);
            lengthStream =
                    VectorizedIntegerDecoder.decodeIntStream(
                            data, offset, lengthStreamMetadata, false);

            /*
             * Child
             * -> Scalar -> Nodes and Length per Node
             * -> Array -> Nodes and Length per Node
             * -> Struct -> Node
             * */
            decodeComplexColumn(data, offset, ((RepeatedField) field).childField, arrayNodes, fieldName, lengthStream);

            /* If this is a root node add null values to provide random access */
            //TODO: get rid of that linear complexity
            return parentNodes == null? addNullValues(nullabilityBuffer, arrayNodes) : arrayNodes;
        }

        //TODO: handle case where json encodes scalar values as top-level property not only struct and array
        /* Scalar values -> leaf nodes */
        if (lengthStream == null) {
            addScalarValuesToStruct(data, offset, field, parentNodes, fieldName, nullabilityBuffer, numStreams);
            return parentNodes;
        }

        addScalarValuesToArray(data, offset, field, parentNodes, fieldName, nullabilityBuffer, lengthStream, numStreams);
        return null;
    }

    private static @NotNull ArrayList<JsonNode> addNullValues(BitVector nullabilityBuffer, List<JsonNode> structNodes) {
        var nullableStructNodes = new ArrayList<JsonNode>();
        var nodeCounter = 0;
        for (var i = 0; i < nullabilityBuffer.size(); i++) {
            var childNode = nullabilityBuffer.get(i)? structNodes.get(nodeCounter++) : null;
            nullableStructNodes.add(childNode);
        }
        return nullableStructNodes;
    }

    private static @NotNull BitVector getNullabilityBuffer(byte[] data, IntWrapper offset) {
        var presentStreamMetadata = StreamMetadataDecoder.decode(data, offset);
        var numValues = presentStreamMetadata.numValues();
        var presentVector = VectorizedDecodingUtils.decodeBooleanRle(data, numValues, offset);
        return new BitVector(presentVector, presentStreamMetadata.numValues());
    }

    private static void addScalarValuesToStruct(byte[] data, IntWrapper offset, Field field,
                                                List<? extends JsonNode> parentNodes, String fieldName,
                                                BitVector nullabilityBuffer, int numStreams) {
        var scalarField = (ScalarField) field;
        switch (scalarField.type) {
            case BOOLEAN: {
                var dataVector = decodeBooleanColumn(data, offset, fieldName, nullabilityBuffer);
                for (var i = 0; i < dataVector.size(); i++) {
                    var value = dataVector.getValue(i);
                    if(value.isPresent()){
                        var parentNode = parentNodes.get(i);
                        ((ObjectNode) parentNode).put(fieldName, value.get());
                    }
                }
                return;
            }
            case UINT_32:
            case INT_32: {
                var dataVector = decodeIntColumn(data, offset, fieldName, scalarField.type.equals(INT_32) ? INT_32 : UINT_32,
                        nullabilityBuffer, nullabilityBuffer.size());
                for (var i = 0; i < dataVector.size(); i++) {
                    var value = dataVector.getValue(i);
                    if(value.isPresent()){
                        var parentNode = parentNodes.get(i);
                        ((ObjectNode) parentNode).put(fieldName, value.get());
                    }
                }
                return;
            }
            case UINT_64:
            case INT_64: {
                var dataVector = decodeLongColumn(data, offset, fieldName, nullabilityBuffer,
                        scalarField.type.equals(INT_64) ? INT_64 : UINT_64, nullabilityBuffer.size());
                for (var i = 0; i < dataVector.size(); i++) {
                    var value = dataVector.getValue(i);
                    if(value.isPresent()){
                        var parentNode = parentNodes.get(i);
                        ((ObjectNode) parentNode).put(fieldName, value.get());
                    }
                }
                return;
            }
            case FLOAT: {
                var dataVector = decodeFloatColumn(data, offset, fieldName, nullabilityBuffer, nullabilityBuffer.size());
                for (var i = 0; i < dataVector.size(); i++) {
                    var value = dataVector.getValue(i);
                    if(value.isPresent()){
                        var parentNode = parentNodes.get(i);
                        ((ObjectNode) parentNode).put(fieldName, value.get());
                    }
                }
                return;
            }
            case DOUBLE: {
                var dataVector = decodeDoubleColumn(data, offset, fieldName, nullabilityBuffer, nullabilityBuffer.size());
                for (var i = 0; i < dataVector.size(); i++) {
                    var value = dataVector.getValue(i);
                    if(value.isPresent()){
                        var parentNode = parentNodes.get(i);
                        ((ObjectNode) parentNode).put(fieldName, value.get());
                    }
                }
                return;
            }
            case STRING: {
                var dataVector = VectorizedStringDecoder.decodeToRandomAccessFormat(fieldName, data, offset, numStreams - 1,
                        nullabilityBuffer, nullabilityBuffer.size());
                for (var i = 0; i < dataVector.size(); i++) {
                    var value = dataVector.getValue(i);
                    if(value.isPresent()){
                        var parentNode = parentNodes.get(i);
                        ((ObjectNode) parentNode).put(fieldName, value.get());
                    }
                }
            }
        }
    }

    private static void addScalarValuesToArray(byte[] data, IntWrapper offset, Field field,
                                               List<? extends JsonNode> parentNodes, String fieldName,
                                               BitVector nullabilityBuffer, IntBuffer lengthStream, int numStreams) {
        var scalarField = (ScalarField) field;
        switch (scalarField.type) {
            case BOOLEAN: {
                var dataVector = decodeBooleanColumn(data, offset, fieldName, nullabilityBuffer);
                var k = 0;
                for (var i = 0; i < lengthStream.limit(); i++) {
                    var length = lengthStream.get(i);
                    var parentNode = (ArrayNode) parentNodes.get(i);
                    for (var j = 0; j < length; j++) {
                        dataVector.getValue(k++).ifPresent(parentNode::add);
                    }
                }
                return;
            }
            case UINT_32:
            case INT_32: {
                var dataVector = decodeIntColumn(data, offset, fieldName, scalarField.type.equals(INT_32) ? INT_32 : UINT_32,
                        nullabilityBuffer, nullabilityBuffer.size());
                var k = 0;
                for (var i = 0; i < lengthStream.limit(); i++) {
                    var length = lengthStream.get(i);
                    var parentNode = (ArrayNode) parentNodes.get(i);
                    for (var j = 0; j < length; j++) {
                        dataVector.getValue(k++).ifPresent(parentNode::add);
                    }
                }
            }
            case UINT_64:
            case INT_64: {
                var dataVector = decodeLongColumn(data, offset, fieldName, nullabilityBuffer,
                        scalarField.type.equals(INT_64) ? INT_64 : UINT_64, nullabilityBuffer.size());
                var k = 0;
                for (var i = 0; i < lengthStream.limit(); i++) {
                    var length = lengthStream.get(i);
                    var parentNode = (ArrayNode) parentNodes.get(i);
                    for (var j = 0; j < length; j++) {
                        dataVector.getValue(k++).ifPresent(parentNode::add);
                    }
                }
            }
            case FLOAT: {
                var dataVector = decodeFloatColumn(data, offset, fieldName, nullabilityBuffer, nullabilityBuffer.size());
                var k = 0;
                for (var i = 0; i < lengthStream.limit(); i++) {
                    var length = lengthStream.get(i);
                    var parentNode = (ArrayNode) parentNodes.get(i);
                    for (var j = 0; j < length; j++) {
                        dataVector.getValue(k++).ifPresent(parentNode::add);
                    }
                }
            }
            case DOUBLE: {
                var dataVector = decodeDoubleColumn(data, offset, fieldName, nullabilityBuffer, nullabilityBuffer.size());
                var k = 0;
                for (var i = 0; i < lengthStream.limit(); i++) {
                    var length = lengthStream.get(i);
                    var parentNode = (ArrayNode) parentNodes.get(i);
                    for (var j = 0; j < length; j++) {
                        dataVector.getValue(k++).ifPresent(parentNode::add);
                    }
                }
                return;
            }
            case STRING: {
                var dataVector = VectorizedStringDecoder.decodeToRandomAccessFormat(fieldName, data, offset, numStreams - 1,
                        nullabilityBuffer, nullabilityBuffer.size());
                var k = 0;
                for (var i = 0; i < lengthStream.limit(); i++) {
                    var length = lengthStream.get(i);
                    var parentNode = (ArrayNode) parentNodes.get(i);
                    for (var j = 0; j < length; j++) {
                        dataVector.getValue(k++).ifPresent(parentNode::add);
                    }
                }
            }
        }

    }

    private static List<JsonNode> createChildNodes(List<? extends JsonNode> parentNodes, IntBuffer lengthStream,
                                                     BitVector nullabilityBuffer, String fieldName,
                                                     Supplier<JsonNode> childNodeFactory) {
        var childNodes = new ArrayList<JsonNode>();
        if (parentNodes == null || lengthStream == null) {
            /* Struct is root node or has a struct as parent which means there is a 1:1 mapping between parent and
             * child node */
            for (var i = 0; i < nullabilityBuffer.size(); i++) {
                if (nullabilityBuffer.get(i)) {
                    var childNode = childNodeFactory.get();
                    childNodes.add(childNode);
                    if (parentNodes != null) {
                        ((ObjectNode) parentNodes.get(i)).put(fieldName, childNode);
                    }
                }
            }
            return childNodes;
        }

        /* Parent nodes are arrays -> 1:n mapping between parent and child node -> iterate based on length stream */
        var k = 0;
        for (var i = 0; i < lengthStream.limit(); i++) {
            var length = lengthStream.get(i);
            var parentNode = (ArrayNode) parentNodes.get(i);
            for (var j = 0; j < length; j++) {
                if (nullabilityBuffer.get(k++)) {
                    var childNode = childNodeFactory.get();
                    childNodes.add(childNode);
                    parentNode.add(childNode);
                }
            }
        }

        return childNodes;
    }
}
