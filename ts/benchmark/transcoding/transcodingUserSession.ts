import {decodeTile} from "../../src";
import {getTiles} from "../../test/benchmark/utils/vectorTilesProvider";
import Benchmark from "benchmark";
import {VectorTile} from "@mapbox/vector-tile";
import Pbf from "pbf";
import OptimizeVectorTile from "../util/optimized-vector-tile/vectortile";
import fs from "fs";
import os from "os";
import Path from "path";

/* These benchmarks are testing the decoding (transcoding) performance of MLT and MVT.
 * We test different variations of the MVT decoding library.
 * The verification of the correct transcoding of MLT and MVT is done in the unit tests (mltDecoder.spec.ts) .*/

const omtUnoptimizedPlainMltDir = "./test/data/omt/unoptimized_user_session/mlt/plain";
const omtUnoptimizedMvtDir = "./test/data/omt/unoptimized_user_session/mvt";
const omtOptimizedPlainMltDir = "./test/data/omt/optimized_user_session/mlt/plain";
const omtOptimizedMvtDir = "./test/data/omt/optimized_user_session/mvt";
const swissTopoPlainMltDir = "./test/data/swisstopo/mlt/plain";
const swissTopoMvtDir = "./test/data/swisstopo/mvt";
const overturePlainMltDir = "./test/data/overture/mlt/plain";
const overtureMvtDir = "./test/data/overture/mvt";

const benchFile = Path.join("dist", "transcoding_benchmarks.txt");
const numSuiteRuns = 10;
runSuite(omtUnoptimizedPlainMltDir, omtUnoptimizedMvtDir, numSuiteRuns, "OMT Unoptimized");
runSuite(omtOptimizedPlainMltDir, omtOptimizedMvtDir, numSuiteRuns, "OMT Optimized");
runSuite(swissTopoPlainMltDir, swissTopoMvtDir, numSuiteRuns, "SwissTopo");
runSuite(overturePlainMltDir, overtureMvtDir, numSuiteRuns, "Overture Maps");

function runSuite(mltDir, mvtDir, numSuiteRuns, tilesetName){
    const files = getTiles(mltDir, mvtDir);
    const metadata = files[0];
    const mltFiles = files[1];
    const mvtFiles = files[2];

    const stats = new Map<string, [{ hz: number }]>();
    const suite = new Benchmark.Suite().
    add("MLT Transcoding", function () {
        let numFeatureTables = 0;
        for(const mlt of mltFiles){
            numFeatureTables += decodeTile(mlt, metadata, undefined,
                undefined, true).length;
        }
        return numFeatureTables;
    }).
    add("MVT Transcoding", function () {
        let numLayers = 0;
        for(const encodedMvt of mvtFiles){
            const buf = new Pbf(encodedMvt)
            const vt = new VectorTile(buf);
            for (const id in vt.layers) {
                const layer = vt.layers[id];
                for (let i = 0; i < layer.length; i++) {
                    const feature = layer.feature(i);
                    feature.loadGeometry();
                }
            }
            numLayers += vt.layers.length;
        }
        return numLayers;
    }).
    /*add("MVT Transcoding With Ring Classification", function () {
            let numLayers = 0;
            for(const encodedMvt of mvtFiles){
                const buf = new Pbf(encodedMvt)
                const vt = new VectorTile(buf);
                for (const id in vt.layers) {
                    const layer = vt.layers[id];
                    for (let i = 0; i < layer.length; i++) {
                        const feature = layer.feature(i);
                        let geometry = feature.loadGeometry();
                        if(feature.type === 3){
                            geometry = classifyRings(geometry);
                        }
                    }
                }
                numLayers += vt.layers.length;
            }
            return numLayers;
    }).*/
    /*add("MLT Transcoding 2", function () {
        const decodeTiles = [];
        for(const mlt of mltFiles){
            const decodedMlt = decodeTile(mlt, metadata, undefined,
                undefined, true);
            decodeTiles.push(decodedMlt);
        }
        return decodeTiles;
    }).*/
    /* Real world data access pattern of how MVT is accessed in map renderer see for example https://github.com/maplibre/maplibre-gl-js/blob/971b85385e9ef989b1df823cd0af48d852331be0/src/data/bucket/fill_bucket.ts#L78 */
    /*add("MVT Transcoding 2", function () {
        const decodedMvt = [];
        for(const encodedMvt of mvtFiles){
            const buf = new Pbf(encodedMvt)
            const vt = new VectorTile(buf);
            const layers = [];
            for (const id in vt.layers) {
                const features = [];
                const layer = vt.layers[id];
                for (let i = 0; i < layer.length; i++) {
                    const feature = layer.feature(i);
                    let geometry = feature.loadGeometry();
                    if(feature.type === 3){
                        geometry = classifyRings(geometry);
                    }
                    const transformedFeature = {
                        id,
                        properties: feature.properties,
                        type: feature.type,
                        geometry
                    };

                    features.push(transformedFeature);
                }
                layers.push(features);
            }
            decodedMvt.push(layers);
        }
        return decodedMvt;
    }).*/
    /*add("MVT Transcoding Patched Decoder", function () {
        const decodedMvt = [];
        for(const encodedMvt of mvtFiles){
            const buf = new Pbf(encodedMvt)
            const vt = new OptimizeVectorTile(buf);
            const layers = [];
            for (const id in vt.layers) {
                const features = [];
                const layer = vt.layers[id];
                for (let i = 0; i < layer.length; i++) {
                    const feature = layer.feature(i);
                    features.push(feature);
                }
                layers.push(features);
            }
            decodedMvt.push(layers);

        }

        return decodedMvt;
    }).*/
    on("cycle", (event: Benchmark.Event) => {
        const target = event.target;
        const name = target.name;
        const runStats = { hz: target.hz };
        stats.has(name) ? stats.get(name).push(runStats) : stats.set(target.name, [runStats]);
        console.log(String(event.target));
    })

    for(let i = 0; i < numSuiteRuns; i++){
        console.info(`${tilesetName} Suite Run ${i} ---------------------------------------------------------------`);
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

    const transcodingRatio = totalStats.get("MLT Transcoding").totalHz /
        totalStats.get("MVT Transcoding").totalHz;
    /*const transcodingRatio2 = totalStats.get("MLT Transcoding 2").totalHz /
        totalStats.get("MVT Transcoding 2").totalHz;
    const transcodingRatioRingClassification = totalStats.get("MLT Transcoding").totalHz /
        totalStats.get("MVT Transcoding With Ring Classification").totalHz;*/

    const mltAvgTranscodingTime = 1 / (totalStats.get("MLT Transcoding").totalHz / numSuiteRuns) * 1000;
    const mvtAvgTranscodingTime = 1 / (totalStats.get("MVT Transcoding").totalHz / numSuiteRuns) * 1000;
    /*const mltAvgTranscodingTime2 = 1 / (totalStats.get("MLT Transcoding 2").totalHz / numSuiteRuns) * 1000
    const mvtAvgTranscodingTime2 = 1 / (totalStats.get("MVT Transcoding 2").totalHz / numSuiteRuns) * 1000
    const mvtAvgTranscodingTimeRingClassification = 1 / (totalStats.get("MVT Transcoding With Ring Classification").totalHz / numSuiteRuns) * 1000;*/

    let log = `Transcoding Performance MLT to MVT on ${tilesetName} Tileset ----------------------------------`;
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
    log = `MLT to MVT ratio: ${transcodingRatio}, MLT time (milliseconds): ${mltAvgTranscodingTime}, MVT time: ${mvtAvgTranscodingTime}`;
    console.info(log);
    /*fs.appendFileSync(benchFile, log + os.EOL);
    log = `MLT to MVT ratio 2: ${transcodingRatio2} , MLT time (milliseconds): ${mltAvgTranscodingTime2}, MVT time: ${mvtAvgTranscodingTime2}`;
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
    log = `MLT to MVT ratio RingClassification: ${transcodingRatioRingClassification} , MLT time (milliseconds): ${mltAvgTranscodingTime}, MVT time: ${mvtAvgTranscodingTimeRingClassification}`;
    console.info(log);*/
    fs.appendFileSync(benchFile, log + os.EOL);
}

/* Extracted from the @mapbox/vector-tile library*/
function classifyRings(rings) {
    var len = rings.length;

    if (len <= 1) return [rings];

    var polygons = [],
        polygon,
        ccw;

    for (var i = 0; i < len; i++) {
        var area = signedArea(rings[i]);
        if (area === 0) continue;

        if (ccw === undefined) ccw = area < 0;

        if (ccw === area < 0) {
            if (polygon) polygons.push(polygon);
            polygon = [rings[i]];

        } else {
            polygon.push(rings[i]);
        }
    }
    if (polygon) polygons.push(polygon);

    return polygons;
}

function signedArea(ring) {
    var sum = 0;
    for (var i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
        p1 = ring[i];
        p2 = ring[j];
        sum += (p2.x - p1.x) * (p1.y + p2.y);
    }
    return sum;
}


