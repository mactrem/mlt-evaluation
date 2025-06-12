import Benchmark from "benchmark";
import {LineBucket} from "./line/line_bucket";
import {getAllMltFeatureTables, getAllMvtLayers, getTiles} from "../../utils/vectorTilesProvider";
import {ColumnarLineBucket} from "./line/columnar_line_bucket";
import {FeatureTable, GeometryVector} from "../../../../src";
import {GEOMETRY_TYPE} from "../../../../src/vector/geometry/geometryType";
import {classifyRings} from "@maplibre/maplibre-gl-style-spec";

/* restrict to dominant line layers in this tileset */
const layerNames = ["transportation", "boundary", "waterway"];
const EARCUT_MAX_RINGS = 500;

const omtUnoptimizedPlainMltDir = "./test/data/omt/unoptimized_user_session/mlt/plain";
const omtUnoptimizedMvtDir = "./test/data/omt/unoptimized_user_session/mvt";
const omtUnoptimizedPlainFiles = getTiles(omtUnoptimizedPlainMltDir,
    omtUnoptimizedMvtDir);
const omtUnoptimizedMvtFiles = omtUnoptimizedPlainFiles[2];
const omtUnoptimizedFeatureTables = getAllMltFeatureTables(omtUnoptimizedPlainFiles[0],
    omtUnoptimizedPlainFiles[1]);//.filter(featureTable => layerNames.includes(featureTable.name));
const omtUnoptimizedLayers = getAllMvtLayers(omtUnoptimizedMvtFiles)
    //.filter(layer => layerNames.includes(layer.name));


const numSuiteRuns = 5;
const suite = new Benchmark.Suite;
const stats = new Map<string, [{ hz: number; count: number }]>();
suite.
add("MLT sequential scan", function () {
    let diff = 0;

    for(const featureTable of omtUnoptimizedFeatureTables){
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
add("MVT sequential scan", function () {
    let diff = 0;

    for(const layer of omtUnoptimizedLayers){
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
add("MVT sequential scan with ring classification", function () {
    let diff = 0;
    for(const layer of omtUnoptimizedLayers){
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
/*add("MLT sequential scan Line", function () {
            let diff = 0;

            for(const featureTable of selectedOmtUnoptimizedFeatureTables){
                const geometryVector = featureTable.geometryVector;
                const topologyVector = geometryVector.topologyVector;

                if(geometryVector.containsSingleGeometryType() && topologyVector.partOffsets && !topologyVector.geometryOffsets){
                    diff += scanLineStrings(featureTable, diff);
                }
                else if(topologyVector.geometryOffsets && topologyVector.partOffsets && !topologyVector.ringOffsets){
                    diff += scanMultiLineStrings(featureTable, diff);
                }
                else if(!topologyVector.geometryOffsets && topologyVector.partOffsets && topologyVector.ringOffsets){
                    diff += scanPolygon(featureTable, diff);
                }
                else if(topologyVector.geometryOffsets && topologyVector.partOffsets && topologyVector.ringOffsets){
                    diff += scanMultiPolygon(featureTable, diff);
                }
                else{
                    throw new Error("Point and MultiPoint.");
                }
            }

            return diff;
}).*/
/*add("MLT tessellate line with miter joins and butt caps", function () {
        const join = "miter";
        const cap = "butt";
        const bucket = new ColumnarLineBucket();

        for(const featureTable of selectedOmtUnoptimizedFeatureTables){
            bucket.tessellateLine(featureTable, join, cap)
        }

        return bucket.layoutVertexArray;
    }).
    add("MLT tessellate line with round joins and round caps", function () {
        const join = "round";
        const cap = "round";
        const bucket = new ColumnarLineBucket();

        for(const featureTable of selectedOmtUnoptimizedFeatureTables){
            bucket.tessellateLine(featureTable, join, cap)
        }

        return bucket.layoutVertexArray;
    }).
    add("MVT tessellate line with miter joins and butt caps", function () {
        const join = "miter";
        const cap = "butt";
        const bucket = new LineBucket();

        for(const layer of selectedOmtUnoptimizedLayers){
            for(const feature of layer.features){
                for (const line of feature.geometry) {
                    bucket.tessellateLine(line, feature, join, cap);
                }
            }
        }

        return bucket.layoutVertexArray;
    }).
    add("MVT tessellate line with round joins and caps", function () {
        const join = "round";
        const cap = "round";
        const bucket = new LineBucket();

        for(const layer of selectedOmtUnoptimizedLayers){
            for(const feature of layer.features){
                for (const line of feature.geometry) {
                    bucket.tessellateLine(line, feature, join, cap);
                }
            }
        }

        return bucket.layoutVertexArray;
    }).*/
on("cycle", (event: Benchmark.Event) => {
    const target = event.target;
    const name = target.name;
    const runStats = { hz: target.hz, count: target.count };
    stats.has(name) ? stats.get(name).push(runStats) : stats.set(target.name, [runStats]);
    console.log(String(event.target));
});

for (let i = 0; i < numSuiteRuns; i++) {
    console.info("Suite run ", i, " ------------------------------------------------------------------------");
    suite.run({ initCount: 100, minSamples: 100 });
}

for (const [runName, runStats] of stats) {
    const totalHz = runStats.reduce((a, c) => a + c.hz, 0)
    const avgHz = totalHz/ numSuiteRuns;
    console.info(`${runName} ${avgHz}`);
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

let mltDiff = 0;
let mltNumVertices = 0;
for(const featureTable of omtUnoptimizedFeatureTables){
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
for(const layer of omtUnoptimizedLayers){
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




