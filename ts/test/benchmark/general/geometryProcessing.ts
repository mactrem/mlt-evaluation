import Benchmark from "benchmark";
import fs from "fs";
import path from "node:path";
import {VectorTile} from "@mapbox/vector-tile";
import Pbf from "pbf";
import varint from "varint";
import IntWrapper from "../../../src/encodings/intWrapper";
import {decodeComponentwiseDeltaVec2, decodeVarintInt64} from "../../../src/encodings/integerDecodingUtils";

const optimizedOmtMvtDir = "./test/data/omt/optimized/mvt";
const tiles = fs.readdirSync(optimizedOmtMvtDir, { withFileTypes: true });

const layerNames = ["waterway", "transportation", "boundary"];
const features = [];
const geometries = [];
const vertices = [];
const partOffsets = [];
for(const tile of tiles){
    const tileName = path.join(optimizedOmtMvtDir, tile.name);
    const encodedMvt = fs.readFileSync(tileName);
    const buf = new Pbf(encodedMvt)
    const decodedMvt = new VectorTile(buf);
    for(const layerName of layerNames){
        const layer = decodedMvt.layers[layerName];
        if(!layer){
            continue;
        }
        for(let i = 0; i < layer.length; i++){
            const mvtFeature = layer.feature(i);
            features.push(mvtFeature);
            const geometry = mvtFeature.loadGeometry();
            geometries.push(geometry);
            for(const line of geometry){
                for(const point of line){
                    vertices.push(point.x);
                    vertices.push(point.y);
                }
                partOffsets.push(line.length);
            }
        }
    }
}

const vertexBuffer = new Int32Array(vertices);
const partOffsetsBuffer = new Int32Array(partOffsets);

const scale = 8192 / 4096;
const BITS = 15;
const MAX = Math.pow(2, BITS - 1) - 1;
const MIN = MAX - 1;

class Vector{
    private scale = 8192 / 4096;
    private BITS = 15;
    private MAX = Math.pow(2, this.BITS - 1) - 1;
    private MIN = -this.MAX - 1;

    constructor(public partOffsets: Int32Array, public vertexBuffer: Int32Array){
    }

    getScaledVertex(index: number){
        const offset = index * 2;
        const x = this.clamp(Math.round(this.vertexBuffer[offset] * this.scale), this.MIN, this.MAX);
        const y = this.clamp(Math.round(this.vertexBuffer[offset+1] * this.scale), this.MIN, this.MAX);
        return [x, y];
    }

    clamp(n: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, n));
    }
}

class FlatVector extends Vector{
    constructor(public geometryType: number, partOffsets: Int32Array, vertexBuffer: Int32Array){
        super(partOffsets, vertexBuffer);
    }

}

//const vector2 = new FlatVector(1, partOffsetsBuffer, vertexBuffer);

const varintEncodedValues = varintEncode(vertices);
const deltaZigZagVarintEncodedValues = deltaZigZagVarintEncodeVerrices(vertices);

const suite = new Benchmark.Suite()
    .add("varint decode Int32Array", function () {
        const values = decodeVarint(deltaZigZagVarintEncodedValues,
            new IntWrapper(0), vertices.length);
        return values;
    })
    .add("varint decode Int32Array Optimized", function () {
        const values = decodeVarintInlinedOptimized(deltaZigZagVarintEncodedValues,
            new IntWrapper(0), vertices.length);
        return values;
    })

    .add("varint decode pre-allocated array", function () {
        const values = readVarintArrayPbfBased(deltaZigZagVarintEncodedValues, vertices.length,
            new IntWrapper(0));
        return values;
    })
    .add("varint decode not pre-allocated array", function () {
        const values = readVarintArrayPbfBasedNotPreallocated(deltaZigZagVarintEncodedValues, vertices.length,
            new IntWrapper(0));
        return values;
    })
    .add("varint decode BigInt64Array", function () {
        const values = decodeVarintInt64(deltaZigZagVarintEncodedValues,
            new IntWrapper(0), vertices.length);
        return values;
    })
    .add("varint decode Float64Array", function () {
        const values = readVarintFloat64ArrayPbfBased(deltaZigZagVarintEncodedValues, vertices.length,
            new IntWrapper(0));
        return values;
    })
    .add("varint decode BigIntArray pbf based", function () {
        const values = readVarintBigIntPbfBased(deltaZigZagVarintEncodedValues, vertices.length,
            new IntWrapper(0));
        return values;
    })


    .add("varint decode Float64Array", function () {

    })
    .add("varint decode number", function () {

    })

    /*.add("decode Varint inlined", function () {
        return decodeVarintInlined(deltaZigZagVarintEncodedValues, new IntWrapper(0), vertices.length);
    })
    .add("decode Varint", function () {
        return decodeVarint(deltaZigZagVarintEncodedValues, new IntWrapper(0), vertices.length);
    })
    .add("decode Varint inlined optimized", function () {
        return decodeVarintInlinedOptimized(deltaZigZagVarintEncodedValues, new IntWrapper(0), vertices.length);
    })*/
    .add("decode delta zigZag Varint in one pass optimized", function () {
        const values = decodeDeltaZigZagVarintInlinedOptimizedTest(deltaZigZagVarintEncodedValues,
            new IntWrapper(0), vertices.length);
        return values;
    })
    .add("decode delta zigZag Varint in one pass optimized 2", function () {
        const values = decodeDeltaZigZagVarintInlinedOptimizedTest2(deltaZigZagVarintEncodedValues,
            new IntWrapper(0), vertices.length);
        return values;
    })
    .add("decode delta zigZag Varint", function () {
        const values = decodeVarint(deltaZigZagVarintEncodedValues, new IntWrapper(0), vertices.length);
        decodeComponentwiseDeltaVec2(values);
        return values;
    })
    .add("decode delta zigZag Varint in one pass", function () {
        const values = decodeDeltaZigZagVarintInlinedOptimized(deltaZigZagVarintEncodedValues,
            new IntWrapper(0), vertices.length);
        return values;
    })
    /*.add("copying", function () {
        const scaledVertices = new Int32Array(vertexBuffer.length);
        for(let i = 0; i < vertexBuffer.length; i+=2){
            scaledVertices[i] = vertexBuffer[i];
            scaledVertices[i+1] = vertexBuffer[i+1];
        }
        return scaledVertices;
    })
    .add("vertices scaling object based", function () {
        const scale = 8192 / 4096;
        const BITS = 15;
        const clampMax = Math.pow(2, BITS - 1) - 1;
        const clampMin = -clampMax - 1;
        const scaledVertices = [];
        for(let i = 0; i < vertexBuffer.length; i+=2){
            const x = clamp(Math.round(vertexBuffer[i] * scale), clampMin, clampMax);
            const y = clamp(Math.round(vertexBuffer[i+1] * scale), clampMin, clampMax);
            scaledVertices.push(new Point(x, y));
        }
        return scaledVertices;
    })
    .add("vertices scaling object based 2", function () {
        const scale = 8192 / 4096;
        const BITS = 15;
        const clampMax = Math.pow(2, BITS - 1) - 1;
        const clampMin = -clampMax - 1;
        const scaledVertices = [];
        for(let i = 0; i < vertexBuffer.length; i+=2){
            const x = clamp(Math.round(vertexBuffer[i] * scale), clampMin, clampMax);
            const y = clamp(Math.round(vertexBuffer[i+1] * scale), clampMin, clampMax);
            scaledVertices.push(x);
            scaledVertices.push(y);
        }
        return scaledVertices;
    })*/
    /*.add("getVertex without function call", function () {
        const newVertices = new Int32Array(vertexBuffer.length);
        for(let i = 0; i < partOffsetsBuffer.length; i++){
            const numParts = partOffsetsBuffer[i];
            for(let j = 0; j < numParts; j++){
                const vertexOffset = i + j * 2;
                newVertices[vertexOffset] = vertexBuffer[vertexOffset];
                newVertices[vertexOffset+1]  = vertexBuffer[vertexOffset+1];
            }
        }
        return newVertices;
    })
    .add("getVertex with function call", function () {
        const newVertices = new Int32Array(vertexBuffer.length);
        for(let i = 0; i < vertices.length; i++){
            const numParts = partOffsetsBuffer[i];
            for(let j = 0; j < numParts; j++){
                const vertexOffset = i + j * 2;
                const vertex = getVertex(vertexBuffer, vertexOffset);
                newVertices[vertexOffset] = vertex[0];
                newVertices[vertexOffset+1] = vertex[1];
            }
        }
        return newVertices;
    })
    .add("MapLibre loadGeometry", function (){
        const scale = 8192 / 4096;
        const BITS = 15;
        const MAX = Math.pow(2, BITS - 1) - 1;
        const MIN = -MAX - 1;
        const scaledGeometries = [];
        for(const geometry of geometries){
            for (let r = 0; r < geometry.length; r++) {
                const ring = geometry[r];
                for (let p = 0; p < ring.length; p++) {
                    const point = ring[p];
                    const x = Math.round(point.x * scale);
                    const y = Math.round(point.y * scale);
                    point.x = clamp(x, MIN, MAX);
                    point.y = clamp(y, MIN, MAX);
                }
            }
            scaledGeometries.push(geometry);
        }
        return scaledGeometries;
    })
    .add("MapLibre loadGeometry copy", function (){
        const scale = 8192 / 4096;
        const BITS = 15;
        const MAX = Math.pow(2, BITS - 1) - 1;
        const MIN = -MAX - 1;
        const scaledGeometries = [];
        for(const geometry of geometries){
            const rings = [];
            for (let r = 0; r < geometry.length; r++) {
                const ring = geometry[r];
                const points = [];
                for (let p = 0; p < ring.length; p++) {
                    const point = ring[p];
                    const x = Math.round(point.x * scale);
                    const y = Math.round(point.y * scale);
                    point.x = clamp(x, MIN, MAX);
                    point.y = clamp(y, MIN, MAX);
                    points.push(point);
                }
                rings.push([points]);
            }
            scaledGeometries.push(rings);
        }
        return scaledGeometries;
    })
    .add("MapLibre loadGeometry optimized", function (){
        const scale = 8192 / 4096;
        const BITS = 15;
        const MAX = Math.pow(2, BITS - 1) - 1;
        const MIN = -MAX - 1;
        for(const geometry of geometries){
            for (let r = 0; r < geometry.length; r++) {
                const ring = geometry[r];
                for (let p = 0; p < ring.length; p++) {
                    const point = ring[p];
                    const x = Math.round(point.x * scale);
                    const y = Math.round(point.y * scale);
                    point.x = clamp(x, MIN, MAX);
                    point.y = clamp(y, MIN, MAX);
                }
            }
        }
        return geometries;
    })*/
    /*.add("vertices scaling array based", function () {
        const scale = 8192 / 4096;
        const BITS = 15;
        const clampMax = Math.pow(2, BITS - 1) - 1;
        const clampMin = -clampMax - 1;
        const scaledVertices = new Int32Array(vertexBuffer.length);
        for(let i = 0; i < vertexBuffer.length; i+=2){
            scaledVertices[i] = clamp(Math.round(vertexBuffer[i] * scale), clampMin, clampMax);
            scaledVertices[i+1] = clamp(Math.round(vertexBuffer[i+1] * scale), clampMin, clampMax);
        }
        return scaledVertices;
    })
    .add("vertices scaling inheritance based", function () {
        const numVertices = vertexBuffer.length;
        const scaledVertices = new Int32Array(numVertices);
        const vector = new FlatVector(1, partOffsetsBuffer, vertexBuffer);
        let counter = 0;
        for(let i = 0; i < numVertices; i+=2){
            const scaledVertex = vector.getScaledVertex(counter++);
            scaledVertices[i] = scaledVertex[0];
            scaledVertices[i+1] = scaledVertex[1];
        }
        return scaledVertices;
    })
    .add("vertices scaling array based in place", function () {
        const scale = 8192 / 4096;
        const BITS = 15;
        const clampMax = Math.pow(2, BITS - 1) - 1;
        const clampMin = -clampMax - 1;
        for(let i = 0; i < vertexBuffer.length; i+=2){
            vertexBuffer[i] = clamp(Math.round(vertexBuffer[i] * scale), clampMin, clampMax);
            vertexBuffer[i+1] = clamp(Math.round(vertexBuffer[i+1] * scale), clampMin, clampMax);
        }
        return vertexBuffer;
    })
    .add("vertices scaling function based in place", function () {
        const numVertices = vertexBuffer.length;
        let counter = 0;
        for(let i = 0; i < numVertices; i+=2){
            const scaledVertex = getScaledVertex(counter++);
            vertexBuffer[i] = scaledVertex[0];
            vertexBuffer[i+1] = scaledVertex[1];
        }
        return vertexBuffer;
    })
    .add("vertices scaling inheritance based in place", function () {
        const numVertices = vertexBuffer.length;
        const vector = new FlatVector(1, partOffsetsBuffer, vertexBuffer);
        let counter = 0;
        for(let i = 0; i < numVertices; i+=2){
            const scaledVertex = vector.getScaledVertex(counter++);
            vertexBuffer[i] = scaledVertex[0];
            vertexBuffer[i+1] = scaledVertex[1];
        }
        return vertexBuffer;
    })*/
   /* .add("process row oriented", function () {

    })
    .add("process column oriented", function () {

    })
    .add("process object oriented", function () {

    })*/
    .on('cycle', (event: Benchmark.Event) => {
        console.log(String(event.target));
    })
    .on('complete', function() {
        console.log('Fastest is ' + suite.filter('fastest').map('name'));
    })
    //.run();

for(let i = 0; i < 10; i++){
    suite.run();
}

function getScaledVertex(index: number): [number, number]{
    const offset = index * 2;
    const x = clamp(Math.round(vertexBuffer[offset] * scale), MIN, MAX);
    const y = clamp(Math.round(vertexBuffer[offset+1] * scale), MIN, MAX);
    return [x, y];
}


function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
}

function getVertex(vertexBuffer: Int32Array, offset: number){
    return [vertexBuffer[offset], vertexBuffer[offset+1]];
}

function deltaZigZagVarintEncodeVerrices(values: number[]){
    const varintEncodedDeltas = [];
    for(let i = 0; i < values.length; i+=2){
        const deltaX = i === 0? values[0] : values[i] - values[i-2];
        const deltaY = i === 0? values[1] : values[i+1] - values[i-1];

        const zigZagDeltaX = (deltaX >> 31) ^ (deltaX << 1);
        const zigZagDeltaY = (deltaY >> 31) ^ (deltaY << 1);
        const varintEncodedZigZagDeltaX = varint.encode(zigZagDeltaX);
        const varintEncodedZigZagDeltaY = varint.encode(zigZagDeltaY);
        varintEncodedDeltas.push(...varintEncodedZigZagDeltaX);
        varintEncodedDeltas.push(...varintEncodedZigZagDeltaY);
    }

    return new Uint8Array(varintEncodedDeltas);
}

function varintEncode(values: number[]){
    const varintValues = [];
    for(let i = 0; i < values.length; i++){
        const varintValues = varint.encode(values[i]);
        varintValues.push(...varintValues);
    }

    return new Uint8Array(varintValues);
}

function decodeVarint(src: Uint8Array, offset: IntWrapper, numValues: number): Int32Array{
    const dst = new Int32Array(numValues);
    let dstOffset = 0;
    for (let i = 0; i < dst.length; i++) {
        const newOffset = decodeVarintInternal(src, offset.get(), dst, dstOffset++);
        offset.set(newOffset);
    }
    return dst;
}

function decodeVarintInlined(src: Uint8Array, bufferOffset: IntWrapper, numValues: number): Int32Array{
    const dst = new Int32Array(numValues);
    let dstOffset = 0;
    let offset = bufferOffset.get();
    for (let i = 0; i < dst.length; i++) {
        let b = src[offset++];
        let value = b & 0x7f;
        if ((b & 0x80) === 0) {
            dst[dstOffset++] = value;
            continue;
        }

        b = src[offset++];
        value |= (b & 0x7f) << 7;
        if ((b & 0x80) === 0) {
            dst[dstOffset++] = value;
            continue;
        }

        b = src[offset++];
        value |= (b & 0x7f) << 14;
        if ((b & 0x80) === 0) {
            dst[dstOffset++] = value;
            continue;
        }


        b = src[offset++];
        value |= (b & 0x7f) << 21;
        if ((b & 0x80) === 0) {
            dst[dstOffset++] = value;
            continue;
        }

        b = src[offset++];
        value |= (b & 0x7f) << 28;
        dst[dstOffset++] = value;
    }

    bufferOffset.set(offset);
    return dst;
}

function decodeVarintInlinedOptimized(buf: Uint8Array, bufferOffset: IntWrapper, numValues: number): Int32Array{
    const dst = new Int32Array(numValues);
    let dstOffset = 0;
    let offset = bufferOffset.get();
    for (let i = 0; i < dst.length; i++) {
        let b = buf[offset++];
        let val = b & 0x7f;
        if (b < 0x80){
            dst[dstOffset++] = val;
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 7;
        if (b < 0x80){
            dst[dstOffset++] = val;
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 14;
        if (b < 0x80){
            dst[dstOffset++] = val;
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 21;
        if (b < 0x80){
            dst[dstOffset++] = val;
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x0f) << 28;
        dst[dstOffset++] = val;
    }

    bufferOffset.set(offset);
    return dst;
}

function decodeVarintInternal(src: Uint8Array, offset: number, dst: Int32Array, dstOffset: number): number {
    let b = src[offset++];
    let value = b & 0x7f;
    if ((b & 0x80) === 0) {
        dst[dstOffset] = value;
        return offset;
    }

    b = src[offset++];
    value |= (b & 0x7f) << 7;
    if ((b & 0x80) === 0) {
        dst[dstOffset] = value;
        return offset;
    }

    b = src[offset++];
    value |= (b & 0x7f) << 14;
    if ((b & 0x80) === 0) {
        dst[dstOffset] = value;
        return offset;
    }


    b = src[offset++];
    value |= (b & 0x7f) << 21;
    if ((b & 0x80) === 0) {
        dst[dstOffset] = value;
        return offset;
    }

    b = src[offset++];
    value |= (b & 0x7f) << 28;
    dst[dstOffset] = value;
    return offset;
}

function decodeDeltaZigZagVarintInlinedOptimized(buf: Uint8Array, bufferOffset: IntWrapper, numValues: number): Int32Array{
    const dst = new Int32Array(numValues);
    let dstOffset = 0;
    let offset = bufferOffset.get();
    let prevX = 0;
    let prevY = 0;
    for (let i = 0; i < dst.length; i++) {
        let b = buf[offset++];
        let val = b & 0x7f;
        if (b < 0x80){
            if(i % 2 === 0) {
                prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
            }
            else {
                prevY = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevY;
            }
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 7;
        if (b < 0x80){
            if(i % 2 === 0) {
                prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
            }
            else {
                prevY = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevY;
            }
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 14;
        if (b < 0x80){
            if(i % 2 === 0) {
                prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
            }
            else {
                prevY = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevY;
            }
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 21;
        if (b < 0x80){
            if(i % 2 === 0) {
                prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
            }
            else {
                prevY = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevY;
            }
            continue;
        }

        b = buf[offset++];
        if(i % 2 === 0) {
            prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
        }
        else {
            prevY = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevY;
        }
    }

    bufferOffset.set(offset);
    return dst;
}

function decodeDeltaZigZagVarintInlinedOptimizedTest(buf: Uint8Array, bufferOffset: IntWrapper, numValues: number): Int32Array{
    const dst = new Int32Array(numValues);
    let dstOffset = 0;
    let offset = bufferOffset.get();
    let prevX = 0;
    for (let i = 0; i < dst.length; i++) {
        let b = buf[offset++];
        let val = b & 0x7f;
        if (b < 0x80){
            prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 7;
        if (b < 0x80){
            prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 14;
        if (b < 0x80){
            prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 21;
        if (b < 0x80){
            prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
            continue;
        }

        b = buf[offset++];
        prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
    }

    bufferOffset.set(offset);
    return dst;
}

function decodeDeltaZigZagVarintInlinedOptimizedTest2(buf: Uint8Array, bufferOffset: IntWrapper, numValues: number): Int32Array{
    const dst = new Int32Array(numValues);
    let dstOffset = 0;
    let offset = bufferOffset.get();
    let prevX = 0;
    let prevY = 0;
    let isX = true;
    for (let i = 0; i < dst.length; i++) {
        let b = buf[offset++];
        let val = b & 0x7f;
        if (b < 0x80){
            if(isX) {
                prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
                isX = false;
            }
            else {
                prevY = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevY;
                isX = true;
            }
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 7;
        if (b < 0x80){
            if(isX) {
                prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
                isX = false;
            }
            else {
                prevY = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevY;
                isX = true;
            }
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 14;
        if (b < 0x80){
            if(isX) {
                prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
                isX = false;
            }
            else {
                prevY = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevY;
                isX = true;
            }
            continue;
        }

        b = buf[offset++];
        val |= (b & 0x7f) << 21;
        if (b < 0x80){
            if(isX) {
                prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
                isX = false;
            }
            else {
                prevY = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevY;
                isX = true;
            }
            continue;
        }

        b = buf[offset++];
        if(isX) {
            prevX = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevX;
            isX = false;
        }
        else {
            prevY = dst[dstOffset++] = ((val >>> 1) ^ -(val & 1)) + prevY;
            isX = true;
        }
    }

    bufferOffset.set(offset);
    return dst;
}

function readVarintArrayPbfBased(src: Uint8Array, numValues: number, offset: IntWrapper){
    const dst = new Array(numValues);
    for (let i = 0; i < numValues; i++) {
        dst[i] = readVarint(src, false, offset);
    }
    return dst;
}

function readVarintArrayPbfBasedNotPreallocated(src: Uint8Array, numValues: number, offset: IntWrapper){
    const dst = [];
    for (let i = 0; i < numValues; i++) {
        const val = readVarint(src, false, offset);
        dst.push(val);
    }
    return dst;
}

function readVarintBigIntPbfBased(src: Uint8Array, numValues: number, offset: IntWrapper){
    const dst = new BigInt64Array(numValues);
    for (let i = 0; i < numValues; i++) {
        dst[i] = BigInt(readVarint(src, false, offset));
    }
    return dst;
}

function readVarintFloat64ArrayPbfBased(src: Uint8Array, numValues: number, offset: IntWrapper){
    const dst = new Float64Array(numValues);
    for (let i = 0; i < numValues; i++) {
        dst[i] = readVarint(src, false, offset);
    }
    return dst;
}

function readVarint(buf: Uint8Array, isSigned: boolean, offset: IntWrapper): number {
    let val, b;
    b = buf[offset.get()]; offset.increment(); val  =  b & 0x7f;        if (b < 0x80) return val;
    b = buf[offset.get()]; offset.increment(); val |= (b & 0x7f) << 7;  if (b < 0x80) return val;
    b = buf[offset.get()]; offset.increment(); val |= (b & 0x7f) << 14; if (b < 0x80) return val;
    b = buf[offset.get()]; offset.increment(); val |= (b & 0x7f) << 21; if (b < 0x80) return val;
    b = buf[offset.get()];   val |= (b & 0x0f) << 28;

    return readVarintRemainder(val, isSigned, buf, offset);
}

function readVarintRemainder(l, s, buf, offset) {
    let h, b;

    b = buf[offset.get()]; offset.increment(); h  = (b & 0x70) >> 4;  if (b < 0x80) return toNum(l, h, s);
    b = buf[offset.get()];  offset.increment();h |= (b & 0x7f) << 3;  if (b < 0x80) return toNum(l, h, s);
    b = buf[offset.get()];  offset.increment();h |= (b & 0x7f) << 10; if (b < 0x80) return toNum(l, h, s);
    b = buf[offset.get()];  offset.increment();h |= (b & 0x7f) << 17; if (b < 0x80) return toNum(l, h, s);
    b = buf[offset.get()];  offset.increment();h |= (b & 0x7f) << 24; if (b < 0x80) return toNum(l, h, s);
    b = buf[offset.get()];  offset.increment();h |= (b & 0x01) << 31; if (b < 0x80) return toNum(l, h, s);


    throw new Error('Expected varint not more than 10 bytes');
}

function toNum(low, high, isSigned) {
    return isSigned ? high * 0x100000000 + (low >>> 0) : ((high >>> 0) * 0x100000000) + (low >>> 0);
}