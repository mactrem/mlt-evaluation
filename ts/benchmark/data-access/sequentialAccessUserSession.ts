import Benchmark from "benchmark";
import {classifyRings} from "@maplibre/maplibre-gl-style-spec";
import {FeatureTable, GeometryVector} from "../../src";
import {getAllMltFeatureTables, getAllMvtLayers, getTiles} from "../../test/benchmark/utils/vectorTilesProvider";
import {GEOMETRY_TYPE} from "../../src/vector/geometry/geometryType";
import fs from "fs";
import os from "os";
import Path from "path";

const scale = 8192 / 4096;
const BITS = 15;
const MAX = Math.pow(2, BITS - 1) - 1;
const MIN = -MAX - 1;
const EARCUT_MAX_RINGS = 500;

const omtUnoptimizedPlainMltDir = "./test/data/omt/unoptimized_user_session/mlt/plain";
const omtUnoptimizedMvtDir = "./test/data/omt/unoptimized_user_session/mvt";
const omtOptimizedPlainMltDir = "./test/data/omt/optimized_user_session/mlt/plain";
const omtOptimizedMvtDir = "./test/data/omt/optimized_user_session/mvt";
const swissTopoPlainMltDir = "./test/data/swisstopo/mlt/plain";
const swissTopoMvtDir = "./test/data/swisstopo/mvt";
const overturePlainMltDir = "./test/data/overture/mlt/plain";
const overtureMvtDir = "./test/data/overture/mvt";

const benchFile = Path.join("dist", "sequential_access_benchmarks.txt");
const numSuiteRuns = 10;
runSuite(omtUnoptimizedPlainMltDir, omtUnoptimizedMvtDir, "OMT Unoptimized");
runSuite(omtOptimizedPlainMltDir, omtOptimizedMvtDir, "OMT Optimized");
runSuite(swissTopoPlainMltDir, swissTopoMvtDir, "SwissTopo");
runSuite(overturePlainMltDir, overtureMvtDir, "Overture Maps");

/* Verify if the benchmarks are producing the same results */
verifyBenchmark(omtUnoptimizedPlainMltDir, omtUnoptimizedMvtDir);
verifyBenchmark(omtOptimizedPlainMltDir, omtOptimizedMvtDir);
verifyBenchmark(swissTopoPlainMltDir, swissTopoMvtDir);
verifyBenchmark(overturePlainMltDir, overtureMvtDir);


function runSuite(mltDir, mvtDir, tilesetName){
    const files = getTiles(mltDir, mvtDir);
    const featureTables = getAllMltFeatureTables(files[0], files[1]);
    const layers = getAllMvtLayers(files[2]);

    const stats = new Map<string, [{ hz: number }]>();
    const suite = new Benchmark.Suite().
    /* Realistic scaling workflow see https://github.com/maplibre/maplibre-gl-js/blob/main/src/data/load_geometry.ts */
    add("MLT Scaling", function () {
        for(const featureTable of featureTables) {
            const vertexBuffer = featureTable.geometryVector.vertexBuffer;
            let i = 0;
            while(i < vertexBuffer.length) {
                const x = Math.round(vertexBuffer[i] * scale);
                const y = Math.round(vertexBuffer[i+1] * scale);
                vertexBuffer[i++]  = Math.min(MAX, Math.max(MIN, x));
                vertexBuffer[i++] = Math.min(MAX, Math.max(MIN, y));
            }
        }
    }).
    add("MVT Scaling", function () {
        for(const layer of layers){
            for(const feature of layer.features){
                const geometry = feature.geometry;
                for (let r = 0; r < geometry.length; r++) {
                    const ring = geometry[r];
                    for (let p = 0; p < ring.length; p++) {
                        const point = ring[p];
                        const x = Math.round(point.x * scale);
                        const y = Math.round(point.y * scale);
                        point.x = Math.min(MAX, Math.max(MIN, x));
                        point.y = Math.min(MAX, Math.max(MIN, y));
                    }
                }
            }
        }
    }).
    add("MLT Sequential Scan VertexBuffer", function () {
        let diff = 0;
        for(const featureTable of featureTables) {
            const vertexBuffer = featureTable.geometryVector.vertexBuffer;
            let i = 0;
            while(i < vertexBuffer.length) {
                diff += vertexBuffer[i++] - vertexBuffer[i++];
            }
        }
        return diff;
    }).
    add("MVT Sequential Scan VertexBuffer", function () {
        let diff = 0;
        for(const layer of layers){
            for(const feature of layer.features){
                const geometry = feature.geometry;
                for (let r = 0; r < geometry.length; r++) {
                    const ring = geometry[r];
                    for (let p = 0; p < ring.length; p++) {
                        const point = ring[p];
                        diff += point.x - point.y;
                    }
                }
            }
        }
        return diff;
    }).
    add("MLT Sequential Scan", function () {
        let diff = 0;

        for(const featureTable of featureTables){
            const geometryVector = featureTable.geometryVector;
            const topologyVector = geometryVector.topologyVector;

            if(!topologyVector.geometryOffsets){
                if(!topologyVector.partOffsets && !topologyVector.ringOffsets){
                    diff += scanPoint(featureTable, diff);
                }
                else if(topologyVector.partOffsets && !topologyVector.ringOffsets){
                    diff += scanLineStrings(featureTable, diff);
                }
                else{
                    diff += scanPolygon(featureTable, diff);
                }
            }
            else{
                if(!topologyVector.partOffsets && !topologyVector.ringOffsets){
                    diff += scanMultiPoint(featureTable, diff);
                }
                else if(topologyVector.partOffsets && !topologyVector.ringOffsets){
                    diff += scanMultiLineStrings(featureTable, diff);
                }
                else{
                    diff += scanMultiPolygon(featureTable, diff);
                }
            }
        }

        return diff;
    }).
    add("MVT Sequential Scan", function () {
        let diff = 0;

        for(const layer of layers){
            for(const feature of layer.features){
                for (const line of feature.geometry) {
                    for(const vertex of line){
                        const x = vertex.x;
                        const y = vertex.y;
                        diff += (x - y);
                    }
                }
            }
        }

        return diff;
    }).
    add("MVT Sequential Scan With Ring Classification", function () {
        let diff = 0;
        for(const layer of layers){
            for(const feature of layer.features){
                if(feature.type !== 3){
                    for (const line of feature.geometry) {
                        for(const vertex of line){
                            const x = vertex.x;
                            const y = vertex.y;
                            diff += (x - y);
                        }
                    }
                }
                else{
                    for (const polygon of classifyRings(feature.geometry, EARCUT_MAX_RINGS)) {
                        for (const ring of polygon) {
                            for(const vertex of ring){
                                const x = vertex.x;
                                const y = vertex.y;
                                diff += (x - y);
                            }
                        }
                    }
                }
            }
        }

        return diff;
    }).
    on("cycle", (event: Benchmark.Event) => {
        const target = event.target;
        const name = target.name;
        const runStats = { hz: target.hz };
        stats.has(name) ? stats.get(name).push(runStats) : stats.set(target.name, [runStats]);
        console.log(String(event.target));
    })

    for(let i = 0; i < numSuiteRuns; i++){
        console.info(`${tilesetName} Suite Run ${i} ----------------------------------------------------------`);
        suite.run({initCount: 100, minSamples: 100});
    }

    const totalStats = new Map<string, { totalHz: number }>();
    const runNames = Array.from(stats.keys());
    for (let i = 0; i < numSuiteRuns; i++) {
        for (const runName of runNames) {
            const runStats = stats.get(runName)[i];
            if (totalStats.has(runName)) {
                const run = totalStats.get(runName);
                run.totalHz += runStats.hz;
            } else {
                totalStats.set(runName, { totalHz: runStats.hz });
            }
        }
    }

    console.info("Average run statistics ----------------------------------------------------------");
    for (const [runName, runStats] of totalStats) {
        const avgHz = runStats.totalHz / numSuiteRuns;
        const log = `${runName}: average hz: ${avgHz}`;
        console.info(log);
    }

    const scalingRatio = totalStats.get("MLT Scaling").totalHz / totalStats.get("MVT Scaling").totalHz;
    const sequentialScanVertexBufferRatio = totalStats.get("MLT Sequential Scan VertexBuffer").totalHz
        / totalStats.get("MVT Sequential Scan VertexBuffer").totalHz;
    const sequentialScanRatio = totalStats.get("MLT Sequential Scan").totalHz
        / totalStats.get("MVT Sequential Scan").totalHz;
    const sequentialScanWithRingClassificationRatio = totalStats.get("MLT Sequential Scan").totalHz
        / totalStats.get("MVT Sequential Scan With Ring Classification").totalHz;

    let log = `Sequential Access Performance MLT to MVT on ${tilesetName} Tileset -----------------------------`;
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
    log = `Scaling MLT to MVT ratio: ${scalingRatio}`;
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
    log = `Sequential Scan VertexBuffer MLT to MVT ratio: ${sequentialScanVertexBufferRatio}`;
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
    log = `Sequential Scan MLT to MVT ratio: ${sequentialScanRatio}`;
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
    log = `Sequential Scan With Ring ClassificationRatio MLT to MVT ratio: ${sequentialScanWithRingClassificationRatio}`;
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
}

function scanPoint(featureTable: FeatureTable, diff: number){
    const geometryVector = featureTable.geometryVector as GeometryVector;
    const numFeatures = featureTable.numFeatures;
    for(let i = 0; i < numFeatures; i++){
        const vertex = geometryVector.getSimpleEncodedVertex(i);
        diff += (vertex[0] - vertex[1]);
    }
    return diff;
}

function scanMultiPoint(featureTable: FeatureTable, diff: number){
    const geometryVector = featureTable.geometryVector as GeometryVector
    const geometryOffsets = geometryVector.topologyVector.geometryOffsets;
    const numFeatures = featureTable.numFeatures;
    for(let i = 0; i < numFeatures; i++){
        const startOffset = geometryOffsets[i];
        const endOffset = geometryOffsets[i+1];
        for(let j = startOffset; j < endOffset; j++){
            const vertex = geometryVector.getSimpleEncodedVertex(j);
            diff += (vertex[0] - vertex[1]);
        }
    }
    return diff;
}

function scanLineStrings(featureTable: FeatureTable, diff: number){
    const geometryVector = featureTable.geometryVector as GeometryVector;
    const partOffsets = geometryVector.topologyVector.partOffsets;
    const numFeatures = featureTable.numFeatures;
    for(let i = 0; i < numFeatures; i++){
        const startOffset = partOffsets[i];
        const endOffset = partOffsets[i+1];
        for(let j = startOffset; j < endOffset; j++){
            const vertex = geometryVector.getSimpleEncodedVertex(j);
            diff += (vertex[0] - vertex[1]);
        }
    }
    return diff;
}

function scanMultiLineStrings(featureTable: FeatureTable, diff: number){
    const geometryVector = featureTable.geometryVector as GeometryVector
    const geometryOffsets = geometryVector.topologyVector.geometryOffsets;
    const lineStringOffsets = geometryVector.topologyVector.partOffsets;
    const numFeatures = featureTable.numFeatures;
    for(let i = 0; i < numFeatures; i++){
        const startLineStringOffset = geometryOffsets[i];
        const endLineStringOffset = geometryOffsets[i+1];
        for(let j = startLineStringOffset; j < endLineStringOffset; j++){
            const startOffset = lineStringOffsets[j];
            const endOffset = lineStringOffsets[j+1];
            for(let k = startOffset; k < endOffset; k++){
                const vertex = geometryVector.getSimpleEncodedVertex(k);
                diff += (vertex[0] - vertex[1]);
            }
        }
    }
    return diff;
}

function scanPolygon(featureTable: FeatureTable, diff: number){
    const geometryVector = featureTable.geometryVector as GeometryVector;
    const ringOffsets = geometryVector.topologyVector.ringOffsets;
    const polygonOffsets = geometryVector.topologyVector.partOffsets;
    const numFeatures = featureTable.numFeatures;
    for(let i = 0; i < numFeatures; i++) {
        const polygonOffsetStart = polygonOffsets[i];
        const polygonOffsetEnd = polygonOffsets[i + 1];
        for (let j = polygonOffsetStart; j < polygonOffsetEnd; j++) {
            const ringOffsetStart = ringOffsets[j];
            const ringOffsetEnd = ringOffsets[j + 1];
            for (let k = ringOffsetStart; k < ringOffsetEnd; k++) {
                const vertex = geometryVector.getSimpleEncodedVertex(k);
                diff += (vertex[0] - vertex[1]);
            }
        }
    }
    return diff;
}

function scanMultiPolygon(featureTable: FeatureTable, diff: number){
    const geometryVector = featureTable.geometryVector as GeometryVector;
    const geometryOffsets = geometryVector.topologyVector.geometryOffsets;
    const ringOffsets = geometryVector.topologyVector.ringOffsets;
    const polygonOffsets = geometryVector.topologyVector.partOffsets;
    const numFeatures = featureTable.numFeatures;
    for(let i = 0; i < numFeatures; i++){
        const geometryOffsetStart = geometryOffsets[i];
        const geometryOffsetEnd = geometryOffsets[i+1];
        for(let j = geometryOffsetStart; j < geometryOffsetEnd; j++){
            const polygonOffsetStart = polygonOffsets[j];
            const polygonOffsetEnd = polygonOffsets[j+1];
            for(let k = polygonOffsetStart; k < polygonOffsetEnd; k++){
                const ringOffsetStart = ringOffsets[k];
                const ringOffsetEnd = ringOffsets[k+1];
                for(let l = ringOffsetStart; l < ringOffsetEnd; l++){
                    const vertex = geometryVector.getSimpleEncodedVertex(l);
                    diff += (vertex[0] - vertex[1]);
                }
            }
        }
    }
    return diff;
}


/* Verify if the benchmarks are producing the same results by fixing the different handling of the closing Point
  of a Polygon within the two formats */

function verifyBenchmark(mltDir, mvtDir) {
    const files = getTiles(mltDir, mvtDir);
    const featureTables = getAllMltFeatureTables(files[0], files[1]);
    const layers = getAllMvtLayers(files[2]);

    let mltDiff = 0;
    let mltNumVertices = 0;
    for(const featureTable of featureTables){
        const geometryVector = featureTable.geometryVector;
        const topologyVector = geometryVector.topologyVector;

        if(!topologyVector.geometryOffsets){
            if(!topologyVector.partOffsets && !topologyVector.ringOffsets){
                const n = scanPointWithCounter(featureTable, mltDiff, mltNumVertices);
                mltDiff = n[0];
                mltNumVertices = n[1];
            }
            else if(topologyVector.partOffsets && !topologyVector.ringOffsets){
                const n = scanLineStringsWithCounter(featureTable, mltDiff, mltNumVertices);
                mltDiff = n[0];
                mltNumVertices = n[1];
            }
            else{
                const n = scanPolygonWithCounter(featureTable, mltDiff, mltNumVertices);
                mltDiff = n[0];
                mltNumVertices = n[1];
            }
        }
        else{
            if(!topologyVector.partOffsets && !topologyVector.ringOffsets){
                const n = scanMultiPointWithCounter(featureTable, mltDiff, mltNumVertices);
                mltDiff = n[0];
                mltNumVertices = n[1];
            }
            else if(topologyVector.partOffsets && !topologyVector.ringOffsets){
                const n = scanMultiLineStringsWithCounter(featureTable, mltDiff, mltNumVertices);
                mltDiff = n[0];
                mltNumVertices = n[1];
            }
            else{
                const n = scanMultiPolygonWithCounter(featureTable, mltDiff, mltNumVertices);
                mltDiff = n[0];
                mltNumVertices = n[1];
            }
        }
    }

    let mvtDiff = 0;
    let mvtNumVertices = 0;
    for(const layer of layers){
        for(const feature of layer.features){
            //console.info("num geometries: ", feature.geometry.length)
            for (const line of feature.geometry) {
                //console.info(line.length);
                for(const vertex of line){
                    const x = vertex.x;
                    const y = vertex.y;
                    mvtDiff += (x - y);
                    mvtNumVertices++;
                }

            }
        }
    }

    if(mltNumVertices !== mvtNumVertices || mltDiff !== mvtDiff){
        throw new Error("Verification of the produced results failed.");
    }

    console.info("Verification of the produced results successful.");
}

function scanPointWithCounter(featureTable: FeatureTable, diff: number, numVertices: number){
    const geometryVector = featureTable.geometryVector as GeometryVector;
    const numFeatures = featureTable.numFeatures;
    for(let i = 0; i < numFeatures; i++){
        const vertex = geometryVector.getSimpleEncodedVertex(i);
        diff += (vertex[0] - vertex[1]);
        numVertices++;
    }

    return [diff, numVertices];
}

function scanMultiPointWithCounter(featureTable: FeatureTable, diff: number, numVertices: number){
    const geometryVector = featureTable.geometryVector as GeometryVector;
    const geometryOffsets = geometryVector.topologyVector.geometryOffsets;
    const numFeatures = featureTable.numFeatures;
    for(let i = 0; i < numFeatures; i++){
        const startOffset = geometryOffsets[i];
        const endOffset = geometryOffsets[i+1];
        for(let j = startOffset; j < endOffset; j++){
            const vertex = geometryVector.getSimpleEncodedVertex(j);
            diff += (vertex[0] - vertex[1]);
            numVertices++;
        }
    }

    return [diff, numVertices];
}

function scanLineStringsWithCounter(featureTable: FeatureTable, diff: number, numVertices: number){
    const geometryVector = featureTable.geometryVector as GeometryVector;
    const partOffsets = geometryVector.topologyVector.partOffsets;
    const numFeatures = featureTable.numFeatures;
    for(let i = 0; i < numFeatures; i++){
        const startOffset = partOffsets[i];
        const endOffset = partOffsets[i+1];
        for(let j = startOffset; j < endOffset; j++){
            const vertex = geometryVector.getSimpleEncodedVertex(j);
            diff += (vertex[0] - vertex[1]);
            numVertices++;
        }
    }

    return [diff, numVertices];
}

function scanMultiLineStringsWithCounter(featureTable: FeatureTable, diff: number, numVertices: number){
    const geometryVector = featureTable.geometryVector as GeometryVector
    const geometryOffsets = geometryVector.topologyVector.geometryOffsets;
    const lineStringOffsets = geometryVector.topologyVector.partOffsets;
    const numFeatures = featureTable.numFeatures;

    for(let i = 0; i < numFeatures; i++){
        const startLineStringOffset = geometryOffsets[i];
        const endLineStringOffset = geometryOffsets[i+1];
        for(let j = startLineStringOffset; j < endLineStringOffset; j++){
            const startOffset = lineStringOffsets[j];
            const endOffset = lineStringOffsets[j+1];
            for(let k = startOffset; k < endOffset; k++){
                const vertex = geometryVector.getSimpleEncodedVertex(k);
                diff += (vertex[0] - vertex[1]);
                numVertices++;
            }
        }
    }

    return [diff, numVertices];
}

function scanPolygonWithCounter(featureTable: FeatureTable, diff: number, numVertices: number){
    const geometryVector = featureTable.geometryVector as GeometryVector;
    const ringOffsets = geometryVector.topologyVector.ringOffsets;
    const polygonOffsets = geometryVector.topologyVector.partOffsets;
    const numFeatures = featureTable.numFeatures;

    for(let i = 0; i < numFeatures; i++) {
        const polygonOffsetStart = polygonOffsets[i];
        const polygonOffsetEnd = polygonOffsets[i + 1];
        for (let j = polygonOffsetStart; j < polygonOffsetEnd; j++) {
            const ringOffsetStart = ringOffsets[j];
            const ringOffsetEnd = ringOffsets[j + 1];
            for (let k = ringOffsetStart; k < ringOffsetEnd; k++) {
                const vertex = geometryVector.getSimpleEncodedVertex(k);
                diff += (vertex[0] - vertex[1]);
                numVertices++;
            }
            if(geometryVector.geometryType(i) == GEOMETRY_TYPE.POLYGON ||
                geometryVector.geometryType(i) == GEOMETRY_TYPE.MULTIPOLYGON){
                const vertex = geometryVector.getSimpleEncodedVertex(ringOffsetStart);
                diff += (vertex[0] - vertex[1]);
                numVertices++;
            }
        }
    }

    return [diff, numVertices];
}

function scanMultiPolygonWithCounter(featureTable: FeatureTable, diff: number, numVertices: number){
    const geometryVector = featureTable.geometryVector as GeometryVector;
    const geometryOffsets = geometryVector.topologyVector.geometryOffsets;
    const ringOffsets = geometryVector.topologyVector.ringOffsets;
    const polygonOffsets = geometryVector.topologyVector.partOffsets;
    const numFeatures = featureTable.numFeatures;
    for(let i = 0; i < numFeatures; i++){
        const geometryOffsetStart = geometryOffsets[i];
        const geometryOffsetEnd = geometryOffsets[i+1];

        for(let j = geometryOffsetStart; j < geometryOffsetEnd; j++){
            const polygonOffsetStart = polygonOffsets[j];
            const polygonOffsetEnd = polygonOffsets[j+1];
            for(let k = polygonOffsetStart; k < polygonOffsetEnd; k++){
                const ringOffsetStart = ringOffsets[k];
                const ringOffsetEnd = ringOffsets[k+1];
                for(let l = ringOffsetStart; l < ringOffsetEnd; l++){
                    const vertex = geometryVector.getSimpleEncodedVertex(l);
                    diff += (vertex[0] - vertex[1]);
                    numVertices++;
                }
                if(geometryVector.geometryType(i) == GEOMETRY_TYPE.POLYGON ||
                    geometryVector.geometryType(i) == GEOMETRY_TYPE.MULTIPOLYGON){
                    const vertex = geometryVector.getSimpleEncodedVertex(ringOffsetStart);
                    diff += (vertex[0] - vertex[1]);
                    numVertices++;
                }
            }
        }
    }

    return [diff, numVertices];
}


