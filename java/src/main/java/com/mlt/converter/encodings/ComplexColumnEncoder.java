package com.mlt.converter.encodings;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.common.primitives.Bytes;
import com.mlt.converter.metadata.Field;
import com.mlt.converter.metadata.RepeatedField;
import com.mlt.converter.metadata.ScalarField;
import com.mlt.converter.metadata.StructField;
import com.mlt.data.Feature;
import com.mlt.metadata.stream.PhysicalLevelTechnique;
import com.mlt.metadata.stream.PhysicalStreamType;

import java.io.IOException;
import java.util.ArrayList;
import java.util.BitSet;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import java.util.function.Supplier;

public class ComplexColumnEncoder {
    public static byte[] encodeComplexPropertyColumn(
            Field fieldMetadata,
            final List<JsonNode> nodes,
            PhysicalLevelTechnique physicalLevelTechnique,
            boolean useAdvancedEncodings) throws IOException {
        /* The nested fields are flattened based on a pre-order traversal */
        if (fieldMetadata instanceof StructField) {
            var presentStream = new BitSet(nodes.size());
            var presentStreamIndex = 0;
            var nonEmptyNodes = new ArrayList<JsonNode>();
            for (var node : nodes) {
                var isPresent = node != null && !node.isNull() && !node.isEmpty();
                presentStream.set(presentStreamIndex++, isPresent);
                if(isPresent) {
                    nonEmptyNodes.add(node);
                }
            }

            var encodedPresentStream = ScalarColumnEncoder.createPresentStream(nodes.size(), presentStream);

            if (!presentStream.isEmpty()) {
                var childStreams = new byte[0];
                for (var childField : ((StructField) fieldMetadata).childs.entrySet()) {
                    var childName = childField.getKey();
                    var childNodes = nonEmptyNodes.stream().map(n -> n.get(childName)).toList();
                    var childStream = encodeComplexPropertyColumn(childField.getValue(), childNodes,
                            physicalLevelTechnique, useAdvancedEncodings);
                    childStreams = Bytes.concat(childStreams, childStream);
                }
                return Bytes.concat(encodedPresentStream, childStreams);
            }

            return encodedPresentStream;
        }

        if (fieldMetadata instanceof RepeatedField) {
            var presentStream = new BitSet(nodes.size());
            var lengthStream = new ArrayList<Integer>();
            var presentStreamIndex = 0;
            var childNodes = new ArrayList<JsonNode>();
            for (var arrayNode : nodes) {
                if (arrayNode == null || arrayNode.isNull() || arrayNode.isEmpty()) {
                    presentStream.set(presentStreamIndex++, false);
                    continue;
                }
                presentStream.set(presentStreamIndex++, true);
                lengthStream.add(arrayNode.size());

                for (var childNode : arrayNode) {
                    var value = childNode == null || childNode.isNull() ||
                            ((childNode.isObject() || childNode.isArray()) && childNode.isEmpty()) ? null : childNode;
                    childNodes.add(value);
                }
            }

            var encodedPresentStream = ScalarColumnEncoder.createPresentStream(nodes.size(), presentStream);

            /* Check if there are data for this fields  */
            if (!childNodes.isEmpty()) {
                var childField = ((RepeatedField) fieldMetadata).childField;
                var encodedChildStreams = encodeComplexPropertyColumn(childField, childNodes, physicalLevelTechnique,
                        useAdvancedEncodings);
                var encodedLengthStream = IntegerEncoder.encodeIntStream(lengthStream, physicalLevelTechnique, false,
                        PhysicalStreamType.LENGTH, null);
                return Bytes.concat(encodedPresentStream, encodedLengthStream, encodedChildStreams);
            }

            /* If no data for this field only return presentStream and no lengthStream */
            return encodedPresentStream;
        }

        var scalarField = (ScalarField) fieldMetadata;
        final var iter = nodes.iterator();
        Supplier<Object> valueProvider = () -> {
            var value = iter.next();
            return value == null || value.isNull() ? null : value;
        };

        return PropertyEncoder.encodeScalarPropertyColumn(nodes.size(), scalarField.type, valueProvider,
                physicalLevelTechnique, useAdvancedEncodings);
    }
}
