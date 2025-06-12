/*
import * as fs from "fs";
import * as Path from "path";
import {VectorTile} from "@mapbox/vector-tile";
import Pbf from "pbf";
import Benchmark from "benchmark";
import {
    decodeComponentwiseDeltaVec2, decodeDeltaZigZagVarint,
    decodeVarint,
    decodeZigZagDelta
} from "../../../src/encodings/vectorized/integerDecodingUtils";
import {IntWrapper} from "../../../src/encodings/IntWrapper";
import {LineBucket} from "./line/lineBucket";
import {loadGeometry} from "./line/utils/load_geometry";
import Point from "./line/utils/point";
import {readVarint} from "../general/util";
const varint = require('varint');
const zlib = require('zlib');

const omtMvtTilesLocalDir = "./test/data/omt/mvt";
/!*const tileIds =  ["5_16_11", "6_32_21", "7_69_44"];*!/
const tileIds =  ["0_0_0", "1_0_0", "1_0_1", "1_1_0", "2_2_2", "3_5_3", "5_16_11", "6_32_21", "7_69_44",
    "14_8919_5841", "14_8915_5841", "14_8919_5840", "14_8918_5841"];

const layerNames = ["transportation", "boundary", "waterway"];
const geometries: Array<Array<Array<Point>>> = [];
const features = [];
let totalTileSizes = 0;
for(const tileId of tileIds){
    const mvtFileName = Path.join(omtMvtTilesLocalDir, tileId + ".mvt");
    const encodedMvt = fs.readFileSync(mvtFileName);
    const buf = new Pbf(encodedMvt)
    const decodedMvt = new VectorTile(buf);

    for(const layerName of layerNames){
        const layer = decodedMvt.layers[layerName];
        if(!layer){
            continue;
        }

        for(let i = 0; i < layer.length; i++){
            const feature = layer.feature(i);
            features.push(feature);
            const geometry = feature.loadGeometry();
            geometries.push(geometry);
        }
    }

    const gzipEncodedMvt = zlib.gzipSync(encodedMvt);
    totalTileSizes += gzipEncodedMvt.length;
}


const vertices = getVertices(geometries);
const encodedVertices = deltaZigZagVarintEncodeVertices(vertices);
const gzipEncodedVertices = zlib.gzipSync(encodedVertices);
const pretessellationData = getPretessellationData();
const verticesRuns = getVerticesRuns(pretessellationData.vertices);

const extrusionVectorLength = pretessellationData.extrusionVectors.length;
const encodedExtrusionVectors = deltaZigZagVarintEncodeVertices(pretessellationData.extrusionVectors);
const gzipEncodedExtrusionVectors = zlib.gzipSync(encodedExtrusionVectors);
const gzipEncodedExtrusionVectorsWithoutDeltaVarint = zlib.gzipSync(new Int32Array(pretessellationData.extrusionVectors));
//const decodedExtrusionVectors2 = new Int32Array(zlib.unzipSync(gzipEncodedExtrusionVectorsWithoutDeltaVarint).buffer.slice(0), 0, extrusionVectorLength);

const encodedVerticesRuns = deltaZigZagVarintEncode(verticesRuns);
const gzipEncodedVerticesRuns = zlib.gzipSync(encodedVerticesRuns);
const gzipEncodedVerticesRunsWithoutDeltaVarint = zlib.gzipSync(new Int32Array(verticesRuns));

const encodedScaledDistances = deltaZigZagVarintEncode(pretessellationData.scaledDistances);
const gzipEncodedScaledDistances = zlib.gzipSync(encodedScaledDistances);
const encodedDirections = deltaZigZagVarintEncode(pretessellationData.directions);
const gzipEncodedDirections = zlib.gzipSync(encodedDirections);
const gzipEncodedDirectionsWithoutDeltaVarint = zlib.gzipSync(new Int32Array(pretessellationData.directions));

const encodedIndices = deltaZigZagVarintEncode(pretessellationData.indices);
const gzipEncodedIndices = zlib.gzipSync(encodedIndices);

const encodedRound = deltaZigZagVarintEncode(pretessellationData.round);
const gzipEncodedRound = zlib.gzipSync(encodedRound);
const gzipEncodedRoundWithoutDeltaVarint = zlib.gzipSync(new Int32Array(pretessellationData.round));

const encodedUp = deltaZigZagVarintEncode(pretessellationData.up);
const gzipEncodedUp = zlib.gzipSync(encodedUp);
const gzipEncodedUpWithoutDeltaVarint = zlib.gzipSync(new Int32Array(pretessellationData.up));

console.info("Number of Vertices:", vertices.length / 2);
console.info("Number of Extrusion Vectors:", pretessellationData.extrusionVectors.length / 2);
console.info("Number of Extrusion Vertices:", pretessellationData.vertices.length);
console.info("Ratio:", pretessellationData.extrusionVectors.length / vertices.length);
console.info("Encoded Vertices Size:", encodedVertices.length / 1000, "kb");
console.info("Gzip Encoded Vertices Size:", gzipEncodedVertices.length / 1000,  "kb");
console.info("Encoded Extrusion Vectors Size:", encodedExtrusionVectors.length / 1000, "kb");
console.info("Gzip Encoded Extrusion Vectors Size:", gzipEncodedExtrusionVectors.length / 1000,  "kb");
console.info("Gzip Encoded Extrusion Vectors Without Delta Varint Size:", gzipEncodedExtrusionVectorsWithoutDeltaVarint.length / 1000,  "kb");
console.info("Encoded Vertices Runs Size:", encodedVerticesRuns.length / 1000, "kb");
console.info("Gzip Encoded Vertices Runs Size:", gzipEncodedVerticesRuns.length / 1000,  "kb");
console.info("Gzip Encoded Vertices Runs Without Delta Varint Size:", gzipEncodedVerticesRunsWithoutDeltaVarint.length / 1000,  "kb");
console.info("Encoded Scaled Distances Size:", encodedScaledDistances.length / 1000, "kb");
console.info("Gzip Encoded Scaled Distances Size:", gzipEncodedScaledDistances.length / 1000,  "kb");
console.info("Encoded Directions Size:", encodedDirections.length / 1000, "kb");
console.info("Gzip Encoded Directions Size:", gzipEncodedDirections.length / 1000,  "kb");
console.info("Gzip Encoded Directions Without Delta Varint Size:", gzipEncodedDirectionsWithoutDeltaVarint.length / 1000,  "kb");
console.info("Encoded Indices Size:", encodedIndices.length / 1000, "kb");
console.info("Gzip Encoded Indices Size:", gzipEncodedIndices.length / 1000,  "kb");
console.info("Encoded Round Size:", encodedRound.length / 1000, "kb");
console.info("Gzip Encoded Round Size:", gzipEncodedRound.length / 1000,  "kb");
console.info("Gzip Encoded Round Without Delta Varint Size:", gzipEncodedRoundWithoutDeltaVarint.length / 1000,  "kb");
console.info("Encoded Up Size:", encodedUp.length / 1000, "kb");
console.info("Gzip Encoded Up Size:", gzipEncodedUp.length / 1000,  "kb");
console.info("Gzip Encoded Up Without Delta Varint Size:", gzipEncodedUpWithoutDeltaVarint.length / 1000,  "kb");
console.info("Total Gzip Tile Sizes:", totalTileSizes / 1000, "kb");
console.info("Total Pre-Tessellation Size:", (gzipEncodedExtrusionVectors.length +
    gzipEncodedVerticesRuns.length + gzipEncodedScaledDistances.length + gzipEncodedDirections.length +
    gzipEncodedIndices.length + gzipEncodedRound.length + gzipEncodedRound.length) / 1000, "kb");
console.info("Total Pre-Tessellation Size With Extrusion Vectors, Runs, Directions, Round and Up:",
    (gzipEncodedExtrusionVectors.length + gzipEncodedVerticesRuns.length + gzipEncodedDirections.length +
    gzipEncodedRound.length + gzipEncodedUp.length) / 1000, "kb");
console.info("Total Pre-Tessellation Size With Extrusion Vectors, Runs, Directions, Round and Up With Gzip:",
    (gzipEncodedExtrusionVectorsWithoutDeltaVarint.length + gzipEncodedVerticesRunsWithoutDeltaVarint.length
        + gzipEncodedDirectionsWithoutDeltaVarint.length + gzipEncodedRoundWithoutDeltaVarint.length +
        gzipEncodedUpWithoutDeltaVarint.length) / 1000, "kb");


//const vertices2 = [new Point(0, 0), new Point(1, 0), new Point(2, 0)];
const vertices2 = [new Point(0, 0), new Point(1, 0.5), new Point(1.4, -1), new Point(2, -0.2)];
const lineBucket = new LineBucket();
//lineBucket.tessellateLine2(vertices2, false,  "bevel", "butt",);
lineBucket.tessellateLine2(vertices2, false, "round", "butt");


const suite = new Benchmark.Suite;
suite.
/!*add("tessellate line with geometry decoding and round joins and caps", function () {
    const join = "round";
    const cap = "round";
    const bucket = new Line_bucket();
    for(const feature of features){
        const geometry = loadGeometry(feature);
        for (const line of geometry) {
            bucket.tessellateLine(line, feature, join, cap);
        }
    }
}).*!/
add("tessellate line without geometry decoding and round joins and caps", function () {
    const join = "round";
    const cap = "round";
    const bucket = new LineBucket();
    let i = 0;
    for(const geometry of geometries){
        const feature = features[i++];
        for (const line of geometry) {
            bucket.tessellateLine(line, feature, join, cap);
        }
    }
}).
add("decode pre-tressellation buffer gzip only", function () {
    const vertices = pretessellationData.vertices;
    const vertexBuffer = new Int16Array(extrusionVectorLength);
    const decodedVerticesRuns = new Uint32Array(
        zlib.unzipSync(gzipEncodedVerticesRunsWithoutDeltaVarint).buffer.slice(0), 0, verticesRuns.length);
    const roundValues =  pretessellationData.round;
    const upValues = pretessellationData.up;
    const EXTRUDE_SCALE = 63;
    let vertexBufferIndex = 0;
    let roundIndex = 0;
    for(let i = 0; i < decodedVerticesRuns.length; i++){
        const vertexRun = decodedVerticesRuns[i];
        const currentVertex = vertices[i];
        const x = currentVertex[0];
        const y = currentVertex[1];

        for(let j = 0; j < vertexRun; j++){
            const round = roundValues[roundIndex];
            const up = upValues[roundIndex++];
            vertexBuffer[vertexBufferIndex++] = (x << 1) + (round ? 1 : 0);
            vertexBuffer[vertexBufferIndex++] = (y << 1) + (up ? 1 : 0);
        }
    }

    const extrusionVectorBuffer = new Uint8Array(extrusionVectorLength * 2);
    const extrusionVectors = new Int16Array(
        zlib.unzipSync(gzipEncodedExtrusionVectorsWithoutDeltaVarint).buffer.slice(0), 0, extrusionVectorLength)

    const directionValues = pretessellationData.directions;
    let extrusionVectorIndex = 0;
    for(let i = 0; i < extrusionVectorLength; i+=2){
        const extrudeX = extrusionVectors[i];
        const extrudeY = extrusionVectors[i];
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeX) + 128;
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeY) + 128;
        const direction = directionValues[i / 2];
        extrusionVectorBuffer[extrusionVectorIndex++] = ((direction === 0 ? 0 : (direction < 0 ? -1 : 1)) + 1);
        extrusionVectorBuffer[extrusionVectorIndex++] = 0;
    }
}).
add("decode pre-tressellation buffer gzip only with all data", function () {
    const vertices = pretessellationData.vertices;
    const vertexBuffer = new Int16Array(extrusionVectorLength);
    const decodedVerticesRuns = new Uint32Array(
        zlib.unzipSync(gzipEncodedVerticesRunsWithoutDeltaVarint).buffer.slice(0), 0, verticesRuns.length);
    const roundValues =  zlib.unzipSync(gzipEncodedRoundWithoutDeltaVarint);
    const upValues = zlib.unzipSync(gzipEncodedUpWithoutDeltaVarint);
    const EXTRUDE_SCALE = 63;
    let vertexBufferIndex = 0;
    let roundIndex = 0;
    for(let i = 0; i < decodedVerticesRuns.length; i++){
        const vertexRun = decodedVerticesRuns[i];
        const currentVertex = vertices[i];
        const x = currentVertex[0];
        const y = currentVertex[1];

        for(let j = 0; j < vertexRun; j++){
            const round = roundValues[roundIndex];
            const up = upValues[roundIndex++];
            vertexBuffer[vertexBufferIndex++] = (x << 1) + (round ? 1 : 0);
            vertexBuffer[vertexBufferIndex++] = (y << 1) + (up ? 1 : 0);
        }
    }

    const extrusionVectorBuffer = new Uint8Array(extrusionVectorLength * 2);
    const extrusionVectors = new Int16Array(
        zlib.unzipSync(gzipEncodedExtrusionVectorsWithoutDeltaVarint).buffer.slice(0), 0, extrusionVectorLength)
    const directionValues = zlib.unzipSync(gzipEncodedDirectionsWithoutDeltaVarint);
    let extrusionVectorIndex = 0;
    for(let i = 0; i < extrusionVectorLength; i+=2){
        const extrudeX = extrusionVectors[i];
        const extrudeY = extrusionVectors[i];
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeX) + 128;
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeY) + 128;
        const direction = directionValues[i / 2];
        extrusionVectorBuffer[extrusionVectorIndex++] = ((direction === 0 ? 0 : (direction < 0 ? -1 : 1)) + 1);
        extrusionVectorBuffer[extrusionVectorIndex++] = 0;
    }
}).
add("decode pre-tressellation buffer gzip only with all data new approach", function () {
    const vertices = pretessellationData.vertices;
    const decodedVerticesRuns = new Uint32Array(
        zlib.unzipSync(gzipEncodedVerticesRunsWithoutDeltaVarint).buffer.slice(0), 0, verticesRuns.length);
    const decodedRoundValues =  zlib.unzipSync(gzipEncodedRoundWithoutDeltaVarint);
    const decodedUpValues = zlib.unzipSync(gzipEncodedUpWithoutDeltaVarint);
    const decodedExtrusionVectors = new Int16Array(
        zlib.unzipSync(gzipEncodedExtrusionVectorsWithoutDeltaVarint).buffer.slice(0), 0, extrusionVectorLength)
    const decodedDirectionValues = zlib.unzipSync(gzipEncodedDirectionsWithoutDeltaVarint);

    const numVertices = decodedUpValues.length ;
    const layoutVertexArraySize = numVertices * 8;
    const arrayBuffer = new ArrayBuffer(layoutVertexArraySize);
    const uint8 = new Uint8Array(arrayBuffer);
    const int16 = new Int16Array(arrayBuffer);

    let extrusionVectorIndex = 0;
    for(let i = 0; i < decodedVerticesRuns.length; i++){
        const vertexRun = decodedVerticesRuns[i];
        const currentVertex = vertices[i];
        const x = currentVertex[0];
        const y = currentVertex[1];

        for(let j = 0; j < vertexRun; j++){
            const round = decodedRoundValues[extrusionVectorIndex];
            const up = decodedUpValues[extrusionVectorIndex];
            const extrudeIndex = extrusionVectorIndex * 2;
            const extrudeX = decodedExtrusionVectors[extrudeIndex];
            const extrudeY = decodedExtrusionVectors[extrudeIndex + 1];
            const direction = decodedDirectionValues[extrusionVectorIndex];

            const o2 = extrusionVectorIndex * 4;
            const o1 = extrusionVectorIndex * 8;
            int16[o2 + 0] = (x << 1) + (round ? 1 : 0);
            int16[o2 + 1] = (y << 1) + (up ? 1 : 0);
            uint8[o1 + 4] = extrudeX;
            uint8[o1 + 5] = extrudeY;
            uint8[o1 + 6] = direction;
            uint8[o1 + 7] = 0;
            extrusionVectorIndex++;
        }
    }
}).
add("decode pre-tressellation buffer gzip only with all data new approach optimized", function () {
    const vertices = pretessellationData.vertices;
    const decodedVerticesRuns = new Uint32Array(
        zlib.unzipSync(gzipEncodedVerticesRunsWithoutDeltaVarint).buffer.slice(0), 0, verticesRuns.length);
    const decodedRoundValues =  zlib.unzipSync(gzipEncodedRoundWithoutDeltaVarint);
    const decodedUpValues = zlib.unzipSync(gzipEncodedUpWithoutDeltaVarint);
    const numVertices = decodedUpValues.length ;
    const layoutVertexArraySize = numVertices * 8;
    const arrayBuffer = new ArrayBuffer(layoutVertexArraySize);
    const uint8 = new Uint8Array(arrayBuffer);
    const int16 = new Int16Array(arrayBuffer);

    let extrusionVectorIndex = 0;
    for(let i = 0; i < decodedVerticesRuns.length; i++){
        const vertexRun = decodedVerticesRuns[i];
        const currentVertex = vertices[i];
        const x = currentVertex[0];
        const y = currentVertex[1];

        for(let j = 0; j < vertexRun; j++){
            const round = decodedRoundValues[extrusionVectorIndex];
            const up = decodedUpValues[extrusionVectorIndex];
            const o2 = extrusionVectorIndex * 4;
            int16[o2 + 0] = (x << 1) + (round ? 1 : 0);
            int16[o2 + 1] = (y << 1) + (up ? 1 : 0);
            extrusionVectorIndex++;
        }
    }

    const decodedExtrusionVectors = new Int16Array(
        zlib.unzipSync(gzipEncodedExtrusionVectorsWithoutDeltaVarint).buffer.slice(0), 0, extrusionVectorLength)
    const decodedDirectionValues = zlib.unzipSync(gzipEncodedDirectionsWithoutDeltaVarint);
    for(let i = 0; i < decodedExtrusionVectors.length; i++){
        const extrudeIndex = i * 2;
        const extrudeX = decodedExtrusionVectors[extrudeIndex];
        const extrudeY = decodedExtrusionVectors[extrudeIndex + 1];
        const direction = decodedDirectionValues[i];
        const o1 = i * 8;
        uint8[o1 + 4] = extrudeX;
        uint8[o1 + 5] = extrudeY;
        uint8[o1 + 6] = direction;
        uint8[o1 + 7] = 0;
    }
}).
add("decode pre-tressellation buffer gzip only with all data new approach optimized 2", function () {
    const vertices = pretessellationData.vertices;
    const decodedVerticesRuns = new Uint32Array(
        zlib.unzipSync(gzipEncodedVerticesRunsWithoutDeltaVarint).buffer.slice(0), 0, verticesRuns.length);
    const decodedRoundValues =  zlib.unzipSync(gzipEncodedRoundWithoutDeltaVarint);
    const decodedUpValues = zlib.unzipSync(gzipEncodedUpWithoutDeltaVarint);
    const numVertices = decodedUpValues.length ;
    const int16 = new Int16Array(numVertices * 4);
    let vertexBufferIndex = 0;
    let roundIndex = 0;
    for(let i = 0; i < decodedVerticesRuns.length; i++){
        const vertexRun = decodedVerticesRuns[i];
        const currentVertex = vertices[i];
        const x = currentVertex[0];
        const y = currentVertex[1];

        for(let j = 0; j < vertexRun; j++){
            const round = decodedRoundValues[roundIndex];
            const up = decodedUpValues[roundIndex++];

            int16[vertexBufferIndex++] = (x << 1) + (round ? 1 : 0);
            int16[vertexBufferIndex++] = (y << 1) + (up ? 1 : 0);
        }
    }

    const uint8 = new Uint8Array(numVertices * 4);
    const decodedExtrusionVectors = new Int16Array(
        zlib.unzipSync(gzipEncodedExtrusionVectorsWithoutDeltaVarint).buffer.slice(0), 0, extrusionVectorLength)
    const decodedDirectionValues = zlib.unzipSync(gzipEncodedDirectionsWithoutDeltaVarint);
    const EXTRUDE_SCALE = 63;
    let extrusionVectorIndex = 0;
    for(let i = 0; i < decodedExtrusionVectors.length; i+=2){
        const extrudeX = decodedExtrusionVectors[i];
        const extrudeY = decodedExtrusionVectors[i];
        const direction = decodedDirectionValues[i/2];

        uint8[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeX) + 128;
        uint8[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeY) + 128;
        uint8[extrusionVectorIndex++] = ((direction === 0 ? 0 : (direction < 0 ? -1 : 1)) + 1);
        uint8[extrusionVectorIndex++] = 0;
    }
}).
/!*add("decode pre-tressellation buffer", function () {
    //const indices = pretessellationData.indices;
    //const scaledDistances = pretessellationData.scaledDistances;
    /!* In practical use case already decoded *!/
    //TODO: decode runs buffer

    const vertices = pretessellationData.vertices;
    const extrusionVectors = decodeDeltaZigZagVarintVec2(encodedExtrusionVectors, extrusionVectorLength);
    //TODO: use bitvector encoding
    /!*const directionValues = decodeDeltaZigZagVarint(encodedDirections, pretessellationData.directions.length);
    const roundValues =   decodeDeltaZigZagVarint(encodedRound, pretessellationData.round.length);
    const upValues = decodeDeltaZigZagVarint(encodedUp, pretessellationData.up.length);*!/
    const directionValues = pretessellationData.directions;
    const roundValues =  pretessellationData.round;
    const upValues = pretessellationData.up;
    const decodedVerticesRuns = decodeDeltaZigZagVarint(encodedVerticesRuns, new IntWrapper(0), verticesRuns.length);

    const vertexBuffer = new Int16Array(extrusionVectorLength);
    const extrusionVectorBuffer = new Uint8Array(extrusionVectorLength * 2);
    const EXTRUDE_SCALE = 63;
    let vertexBufferIndex = 0;
    let extrusionVectorIndex = 0;
    let roundIndex = 0;
    //TODO: add emplaceBack logic for segments
    for(let i = 0; i < decodedVerticesRuns.length; i++){
        const vertexRun = decodedVerticesRuns[i];
        const currentVertex = vertices[i];
        const x = currentVertex[0];
        const y = currentVertex[1];

        for(let j = 0; j < vertexRun; j++){
            const round = roundValues[roundIndex];
            const up = upValues[roundIndex];
            vertexBuffer[vertexBufferIndex] = (x << 1) + (round ? 1 : 0);
            vertexBuffer[vertexBufferIndex+1] = (y << 1) + (up ? 1 : 0);

            const extrudeX = extrusionVectors[vertexBufferIndex++];
            const extrudeY = extrusionVectors[vertexBufferIndex++];
            extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeX) + 128;
            extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeY) + 128;
            const direction = directionValues[roundIndex++];
            extrusionVectorBuffer[extrusionVectorIndex++] = ((direction === 0 ? 0 : (direction < 0 ? -1 : 1)) + 1);
            /!* ignore linefofarScaled value -> not used in line vertex shader= *!/
            extrusionVectorBuffer[extrusionVectorIndex++] = 0;
        }
    }
}).*!/
add("uncompress and decode pre-tressellation buffer", function () {
    const vertices = pretessellationData.vertices;
    const vertexBuffer = new Int16Array(extrusionVectorLength);
    const decodedVerticesRuns = decodeDeltaZigZagVarint(zlib.unzipSync(gzipEncodedVerticesRuns),
        new IntWrapper(0), verticesRuns.length);
    const roundValues =  pretessellationData.round;
    const upValues = pretessellationData.up;
    const EXTRUDE_SCALE = 63;
    let vertexBufferIndex = 0;
    let roundIndex = 0;
    for(let i = 0; i < decodedVerticesRuns.length; i++){
        const vertexRun = decodedVerticesRuns[i];
        const currentVertex = vertices[i];
        const x = currentVertex[0];
        const y = currentVertex[1];

        for(let j = 0; j < vertexRun; j++){
            const round = roundValues[roundIndex];
            const up = upValues[roundIndex++];
            vertexBuffer[vertexBufferIndex++] = (x << 1) + (round ? 1 : 0);
            vertexBuffer[vertexBufferIndex++] = (y << 1) + (up ? 1 : 0);
        }
    }

    const extrusionVectorBuffer = new Uint8Array(extrusionVectorLength * 2);
    const extrusionVectors = decodeDeltaZigZagVarintVec2(zlib.unzipSync(gzipEncodedExtrusionVectors), extrusionVectorLength);
    const directionValues = pretessellationData.directions;
    let extrusionVectorIndex = 0;
    for(let i = 0; i < extrusionVectorLength; i+=2){
        const extrudeX = extrusionVectors[i];
        const extrudeY = extrusionVectors[i];
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeX) + 128;
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeY) + 128;
        const direction = directionValues[i / 2];
        extrusionVectorBuffer[extrusionVectorIndex++] = ((direction === 0 ? 0 : (direction < 0 ? -1 : 1)) + 1);
        extrusionVectorBuffer[extrusionVectorIndex++] = 0;
    }
}).
add("decode pre-tressellation buffer optimized", function () {
    const vertices = pretessellationData.vertices;
    const vertexBuffer = new Int16Array(extrusionVectorLength);
    const decodedVerticesRuns = decodeDeltaZigZagVarint(encodedVerticesRuns, new IntWrapper(0), verticesRuns.length);
    const roundValues =  pretessellationData.round;
    const upValues = pretessellationData.up;
    const EXTRUDE_SCALE = 63;
    let vertexBufferIndex = 0;
    let roundIndex = 0;
    for(let i = 0; i < decodedVerticesRuns.length; i++){
        const vertexRun = decodedVerticesRuns[i];
        const currentVertex = vertices[i];
        const x = currentVertex[0];
        const y = currentVertex[1];

        for(let j = 0; j < vertexRun; j++){
            const round = roundValues[roundIndex];
            const up = upValues[roundIndex++];
            vertexBuffer[vertexBufferIndex++] = (x << 1) + (round ? 1 : 0);
            vertexBuffer[vertexBufferIndex++] = (y << 1) + (up ? 1 : 0);
        }
    }

    const extrusionVectorBuffer = new Uint8Array(extrusionVectorLength * 2);
    const extrusionVectors = decodeDeltaZigZagVarintVec2(encodedExtrusionVectors, extrusionVectorLength);
    const directionValues = pretessellationData.directions;
    let extrusionVectorIndex = 0;
    for(let i = 0; i < extrusionVectorLength; i+=2){
        const extrudeX = extrusionVectors[i];
        const extrudeY = extrusionVectors[i];
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeX) + 128;
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeY) + 128;
        const direction = directionValues[i / 2];
        extrusionVectorBuffer[extrusionVectorIndex++] = ((direction === 0 ? 0 : (direction < 0 ? -1 : 1)) + 1);
        extrusionVectorBuffer[extrusionVectorIndex++] = 0;
    }
}).
/!*add("decode pre-tressellation buffer optimized Mapbox", function () {
    const vertices = pretessellationData.vertices;
    const vertexBuffer = new Int16Array(extrusionVectorLength);
    const decodedVerticesRuns = decodeDeltaZigZagVarintMapbox(encodedVerticesRuns, verticesRuns.length);
    const roundValues =  pretessellationData.round;
    const upValues = pretessellationData.up;
    const EXTRUDE_SCALE = 63;
    let vertexBufferIndex = 0;
    let roundIndex = 0;
    for(let i = 0; i < decodedVerticesRuns.length; i++){
        const vertexRun = decodedVerticesRuns[i];
        const currentVertex = vertices[i];
        const x = currentVertex[0];
        const y = currentVertex[1];

        for(let j = 0; j < vertexRun; j++){
            const round = roundValues[roundIndex];
            const up = upValues[roundIndex++];
            vertexBuffer[vertexBufferIndex++] = (x << 1) + (round ? 1 : 0);
            vertexBuffer[vertexBufferIndex++] = (y << 1) + (up ? 1 : 0);
        }
    }

    const extrusionVectorBuffer = new Uint8Array(extrusionVectorLength * 2);
    const extrusionVectors = decodeDeltaZigZagVarintVec2Mapbox(encodedExtrusionVectors, extrusionVectorLength);
    const directionValues = pretessellationData.directions;
    let extrusionVectorIndex = 0;
    for(let i = 0; i < extrusionVectorLength; i+=2){
        const extrudeX = extrusionVectors[i];
        const extrudeY = extrusionVectors[i];
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeX) + 128;
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeY) + 128;
        const direction = directionValues[i / 2];
        extrusionVectorBuffer[extrusionVectorIndex++] = ((direction === 0 ? 0 : (direction < 0 ? -1 : 1)) + 1);
        extrusionVectorBuffer[extrusionVectorIndex++] = 0;
    }
}).*!/
add("decode pre-tressellation buffer optimized 2", function () {
    const EXTRUDE_SCALE = 63;
    const vertices = pretessellationData.vertices;
    const decodedVerticesRuns = decodeDeltaZigZagVarint(encodedVerticesRuns, new IntWrapper(0), verticesRuns.length);
    const vertexBuffer = new Int16Array(extrusionVectorLength);
    const roundValues = pretessellationData.round;
    const upValues = pretessellationData.up;

    let vertexBufferIndex = 0;
    let roundIndex = 0;
    let vertexRunIndex = 0;
    let currentRunCount = decodedVerticesRuns[vertexRunIndex];
    let currentVertexIndex = 0;

    while (vertexBufferIndex < vertexBuffer.length) {
        if (currentRunCount === 0) {
            currentVertexIndex++;
            vertexRunIndex++;
            currentRunCount = decodedVerticesRuns[vertexRunIndex];
        }

        const currentVertex = vertices[currentVertexIndex];
        const x = currentVertex[0];
        const y = currentVertex[1];
        const round = roundValues[roundIndex];
        const up = upValues[roundIndex++];

        vertexBuffer[vertexBufferIndex++] = (x << 1) | (round & 1);
        vertexBuffer[vertexBufferIndex++] = (y << 1) | (up & 1);

        currentRunCount--;
    }

    const extrusionVectorBuffer = new Uint8Array(extrusionVectorLength * 2);
    const extrusionVectors = decodeDeltaZigZagVarintVec2(encodedExtrusionVectors, extrusionVectorLength);
    const directionValues = pretessellationData.directions;
    let extrusionVectorIndex = 0;
    for(let i = 0; i < extrusionVectorLength; i+=2){
        const extrudeX = extrusionVectors[i];
        const extrudeY = extrusionVectors[i];
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeX) + 128;
        extrusionVectorBuffer[extrusionVectorIndex++] = Math.round(EXTRUDE_SCALE * extrudeY) + 128;
        const direction = directionValues[i / 2];
        extrusionVectorBuffer[extrusionVectorIndex++] = ((direction === 0 ? 0 : (direction < 0 ? -1 : 1)) + 1);
        extrusionVectorBuffer[extrusionVectorIndex++] = 0;
    }
}).on('cycle', (event: Benchmark.Event) => {
    console.log(String(event.target));
}).
on('complete', function() {
    console.log('Fastest is ' + suite.filter('fastest').map('name'));
}).run()

function getVerticesRuns(vertices: number[][]){
    const runs = [];
    let prevVertex = vertices[0];
    let count = 1;
    for(let i = 1; i < vertices.length; i++){
        const currentVertex = vertices[i];
        if(currentVertex[0] === prevVertex[0] && currentVertex[1] === prevVertex[1]){
            count++;
        }else{
            runs.push(count);
            prevVertex = currentVertex;
            count = 1;
        }
    }
    runs.push(count);
    return runs;
}

function getPretessellationData(){
    const join = "round";
    const cap = "round";
    /!*const join = "bevel";
    const cap = "butt";*!/
    const bucket = new LineBucket();
    for(const feature of features){
        const isPolygon = feature.type === 2 || feature.type === 5;
        const geometry = loadGeometry(feature);
        for (const line of geometry) {
            bucket.tessellateLine2(line, isPolygon, join, cap);
        }
    }

    return {extrusionVectors: bucket.extrusionVectors, indices: bucket.indices, vertices: bucket.vertices,
    scaledDistances: bucket.scaledDistances, directions: bucket.directions, round: bucket.round, up: bucket.up};
}

function getVertices(geometries: Array<Array<Array<Point>>>): number[]{
    const vertices = [];
    for(const geometry of geometries){
        for(const line of geometry){
            for(const point of line){
                vertices.push(point.x);
                vertices.push(point.y);
            }
        }
    }
    return vertices;
}

function deltaZigZagVarintEncodeVertices(values: number[]){
    const varintEncodedDeltas = [];
    const deltas = [];
    for(let i = 0; i < values.length; i+=2){
        const deltaX =  i==0?  values[i] : (values[i] - values[i-2]);
        const deltaY = i==0? values[i+1] : (values[i+1] - values[i-1]);

        if(i > 0){
            deltas.push(deltaX);
            deltas.push(deltaY);
        }

        const zigZagDeltaX = (deltaX >> 31) ^ (deltaY << 1);
        const zigZagDeltaY = (deltaY >> 31) ^ (deltaY << 1);
        const varintEncodedZigZagDeltaX = varint.encode(zigZagDeltaX);
        const varintEncodedZigZagDeltaY = varint.encode(zigZagDeltaY);
        varintEncodedDeltas.push(...varintEncodedZigZagDeltaX);
        varintEncodedDeltas.push(...varintEncodedZigZagDeltaY);
    }

    //console.info("Max delta: ", Math.max(...deltas));
    let deltaSum = 0;
    for(let i = 0; i < deltas.length; i++){
        deltaSum += Math.abs(deltas[i]);
    }
    const avgDelta = deltaSum / deltas.length;
    //console.info("Avg delta: ", avgDelta);

    return new Uint8Array(varintEncodedDeltas);
}

function deltaZigZagVarintEncode(values: number[]){
    const deltas = [];
    const varintEncodedDeltas = [];
    for(let i = 0; i < values.length; i++){
        const delta = i === 0? values[0] : values[i] - values[i-1];
        deltas.push(delta);
        const zigZagDelta = (delta >> 31) ^ (delta << 1)
        const varintEncodedZigZagDelta = varint.encode(zigZagDelta);
        varintEncodedDeltas.push(...varintEncodedZigZagDelta);
    }

    return new Uint8Array(varintEncodedDeltas);
}

function decodeDeltaZigZagVarintUnoptimized(buffer: Uint8Array, numValues: number){
    const values = decodeVarint(buffer, new IntWrapper(0), numValues);
    decodeZigZagDelta(values);
    return values;
}

function decodeDeltaZigZagVarintVec2(buffer: Uint8Array, numValues: number){
    const values = decodeVarint(buffer, new IntWrapper(0), numValues);
    decodeComponentwiseDeltaVec2(values);
    return values;
}

function decodeDeltaZigZagVarintVec2Mapbox(buffer: Uint8Array, numValues: number){
    const decodedValues = new Int32Array(numValues);
    const offset = new IntWrapper(0);
    for(let i = 0; i < numValues; i++) {
        decodedValues[i] = readVarint(buffer,  true, offset);
    }

    decodeComponentwiseDeltaOnlyVec2(decodedValues);
    return decodedValues;
}

function decodeDeltaZigZagVarintMapbox(buffer: Uint8Array, numValues: number){
    const decodedValues = new Int32Array(numValues);
    const offset = new IntWrapper(0);
    for(let i = 0; i < numValues; i++) {
        decodedValues[i] = readVarint(buffer,  true, offset);
    }

    deltaDecode(decodedValues)
    return decodedValues;
}

function decodeComponentwiseDeltaOnlyVec2(data: Int32Array): void {
    data[0] = ((data[0] >>> 1) ^ -(data[0] & 1));
    data[1] = ((data[1] >>> 1) ^ -(data[1] & 1));
    const sz0 = data.length / 4 * 4;
    let i = 2;
    if (sz0 >= 4) {
        for (; i < sz0 - 4; i += 4) {
            const x1 = data[i];
            const y1 = data[i + 1];
            const x2 = data[i + 2];
            const y2 = data[i + 3];

            data[i] = x1 + data[i - 2];
            data[i + 1] = y1 + data[i - 1];
            data[i + 2] = x2 + data[i];
            data[i + 3] = y2 + data[i + 1];
        }
    }

    for (; i != data.length; i += 2) {
        data[i] = data[i] + data[i - 2];
        data[i + 1] = data[i+1] + data[i - 1];
    }
}

function deltaDecode(data: Int32Array): void {
    for (let i = 1; i < data.length; i++) {
        data[i] = data[i] + data[i - 1];
    }
}




*/
