/*
import * as fs from "fs";
import * as Path from "path";
import {VectorTile} from "@mapbox/vector-tile";
import Pbf from "pbf";
import {classifyRings} from "@maplibre/maplibre-gl-style-spec";
import Benchmark from "benchmark";
import {decodeVarint, decodeZigZagDelta} from "../../../src/encodings/vectorized/integerDecodingUtils";
import {IntWrapper} from "../../../src/encodings/IntWrapper";
const earcut = require("earcut");
const varint = require('varint');
const zlib = require('zlib');

const omtMvtTilesLocalDir = "./test/data/omt/mvt";
const tileIds =  ["0_0_0", "1_0_0", "1_0_1", "1_1_0", "2_2_2", "3_5_3", "5_16_11", "6_32_21", "7_69_44",
        "14_8919_5841", "14_8915_5841", "14_8919_5840", "14_8918_5841"];
/!*const tileIds =  ["7_69_42", "7_69_44"];*!/
const layerNames = ["water", "building", "landuse", "landcover"];

const geometries = [];
const preTessellatedBuffer = [];
/!*
* Compare
* -> Pre-Computing -> Transfer time of compressed NumTriangles and IndexBuffer (with Gzip) and decoding time
* -> Tessellation -> Tessellation time in MB/s and decoding time
*
* *!/
for(const tileId of tileIds){
        const mvtFileName = Path.join(omtMvtTilesLocalDir, tileId + ".mvt");
        const encodedMvt = fs.readFileSync(mvtFileName);
        const buf = new Pbf(encodedMvt)
        const decodedMvt = new VectorTile(buf);

        const numTrianglesBuffer = [];
        const indexBuffer = [];

        for(const layerName of layerNames){
                const layer = decodedMvt.layers[layerName];
                if(!layer){
                        continue;
                }

                for(let i = 0; i < layer.length; i++){
                        const feature = layer.feature(i);
                        const geometry = feature.loadGeometry();
                        const indices = tessellatePolygon(geometry);
                        indexBuffer.push(...indices);
                        numTrianglesBuffer.push(indices.length / 3);

                        geometries.push(geometry);
                }
        }


        const p  = [...numTrianglesBuffer, ...indexBuffer];
        preTessellatedBuffer.push(...p);
        const encodedPreTessellatedBuffers = deltaZigZagVarintEncode(p);
        console.info(encodedPreTessellatedBuffers.length);
}

const encodedPreTessellatedBuffer = deltaZigZagVarintEncode(preTessellatedBuffer);
console.info("Total Pre-Tessellated Size: ", encodedPreTessellatedBuffer.length);

const gzipPreTessellatedBuffer = zlib.gzipSync(encodedPreTessellatedBuffer);
console.info("Total Gzip Pre-Tessellated Size: ", gzipPreTessellatedBuffer.length);

const suite = new Benchmark.Suite;
suite.
add("tessellate polygon", function () {
        const indices = [];
        for(const geometry of geometries){
                const polygonIndices = tessellatePolygon(geometry);
                indices.push(...polygonIndices);
        }
        return indices;
}).
add("IndexBuffer decoding", function () {
        return decodeDeltaZigZagVarint(encodedPreTessellatedBuffer, preTessellatedBuffer.length)
}).
add("IndexBuffer Gzip decoding", function () {
        const encodedBuffer = zlib.unzipSync(gzipPreTessellatedBuffer);
        return decodeDeltaZigZagVarint(encodedBuffer, preTessellatedBuffer.length)
}).
on('cycle', (event: Benchmark.Event) => {
        console.log(String(event.target));
}).
on('complete', function() {
        console.log('Fastest is ' + suite.filter('fastest').map('name'));
}).run()

function deltaZigZagVarintEncode(values: number[]){
        const deltas = [];
        const varintEnocdedDeltas = [];
        for(let i = 1; i < values.length; i++){
                const delta = values[i] - values[i-1];
                deltas.push(delta);
                const zigZagDelta = (delta >> 31) ^ (delta << 1)
                const varintEncodedZigZagDelta = varint.encode(zigZagDelta);
                varintEnocdedDeltas.push(...varintEncodedZigZagDelta);
        }

        return new Uint8Array(varintEnocdedDeltas);
}

function decodeDeltaZigZagVarint(buffer: Uint8Array, numValues: number){
        const values = decodeVarint(buffer, new IntWrapper(0), numValues);
        decodeZigZagDelta(values);
        return values;
}


function tessellatePolygon(geometry: any): number[]{
        const EARCUT_MAX_RINGS = 500;
        const polygonIndices = [];
        for (const polygon of classifyRings(geometry, EARCUT_MAX_RINGS)) {
                const flattened = [];
                const holeIndices = [];
                for (const ring of polygon) {
                        if (ring.length === 0) {
                                continue;
                        }

                        if (ring !== polygon[0]) {
                                holeIndices.push(flattened.length / 2);
                        }

                        flattened.push(ring[0].x);
                        flattened.push(ring[0].y);
                        for (let i = 1; i < ring.length; i++) {
                                flattened.push(ring[i].x);
                                flattened.push(ring[i].y);
                        }
                }

                const indices = earcut(flattened, holeIndices);
                polygonIndices.push(...indices);
        }

        return polygonIndices;
}


*/
