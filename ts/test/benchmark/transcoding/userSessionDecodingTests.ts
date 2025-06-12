import Benchmark from "benchmark";
import Path from "path";
import fs from "fs";
import {TileSetMetadata} from "../../../src/metadata/tileset/tilesetMetadata";
import decodeTile from "../../../src/mltDecoder";
import {VectorTile} from "@mapbox/vector-tile";
import OptimizeVectorTile from "../utils/optimized-vector-tile/vectortile";
import Pbf from "pbf";
import path from "node:path";
import * as os from "os";
import * as zlib from "zlib";
import {gunzipSync} from "fflate";

const numSuiteRuns = 10;
const benchFile = "./dist/omt_benchmarks.txt";
const stats = new Map<string, [{hz: number, count: number}]>();

const omtUnoptimizedPlainMltDir = "./test/data/omt/unoptimized_user_session/mlt/plain";
const omtUnoptimizedMvtDir = "./test/data/omt/unoptimized_user_session/mvt";
const omtUnoptimizedPlainFiles = getTiles(omtUnoptimizedPlainMltDir, omtUnoptimizedMvtDir);
const omtUnoptimizedMvtFiles = omtUnoptimizedPlainFiles[2];
const compressedOmtUnoptimizedMvtFiles = omtUnoptimizedPlainFiles[4];

const swisstopoPlainMltDir = "./test/data/swisstopo/mlt/plain";
const swisstopoMvtDir = "./test/data/swisstopo/mvt";
const swisstopoPlainFiles = getTiles(swisstopoPlainMltDir, swisstopoMvtDir);
const swisstopoMvtFiles = swisstopoPlainFiles[2];
const compressedSwisstopoMvtFiles = swisstopoPlainFiles[4];

const omtOptimizedPlainMltDir = "./test/data/omt/optimized_user_session/mlt/plain";
const omtOptimizedMvtDir = "./test/data/omt/optimized_user_session/mvt";
const omtOptimizedPlainFiles = getTiles(omtOptimizedPlainMltDir, omtOptimizedMvtDir);
const omtOptimizedMvtFiles = omtOptimizedPlainFiles[2];
const compressedOmtOptimizedMvtFiles = omtOptimizedPlainFiles[4];

const overturePlainMltDir = "./test/data/overture/mlt/plain";
const overtureMvtDir = "./test/data/overture/mvt";
const overturePlainFiles = getTiles(overturePlainMltDir, overtureMvtDir);
const overtureMvtFiles = overturePlainFiles[2];
const compressedOvertureMvtFiles = overturePlainFiles[4];

/*for(const encodedMvt of compressedOmtUnoptimizedMvtFiles) {
    console.info("--------------------------------------------");

    console.time("unzip");
    const mvt = zlib.unzipSync(encodedMvt);
    console.timeEnd("unzip");

    console.time("fflate");
    const decompressedData = gunzipSync(encodedMvt);
    console.timeEnd("fflate");
    console.info(mvt.length);
    console.info(decompressedData.length);

    /!*console.time("decode");
    const buf = new Pbf(mvt)
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
    console.timeEnd("decode");*!/
}*/

const suite = new Benchmark.Suite().
add("optimized plain OMT Mlt", function () {
    const metadata = omtOptimizedPlainFiles[0];
    const mltFiles = omtOptimizedPlainFiles[1];
    const decodeTiles = [];
    for(const mlt of mltFiles){
        const decodedMlt = decodeTile(mlt, metadata, undefined,
            undefined, true);
        decodeTiles.push(decodedMlt);
    }
    return decodeTiles;
}).
/*add("optimized OMT Mvt", function () {
    const decodedMvt = [];

    for(const encodedMvt of omtOptimizedMvtFiles){
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
add("optimized OMT Mvt with plain encoder 2", function () {
    for(const encodedMvt of omtOptimizedMvtFiles){
        const buf = new Pbf(encodedMvt)
        const vt = new VectorTile(buf);
        for (const id in vt.layers) {
            const layer = vt.layers[id];
            for (let i = 0; i < layer.length; i++) {
                const feature = layer.feature(i);
                feature.loadGeometry();
            }
        }
    }
}).
/*add("optimized OMT Mvt with plain encoder", function () {
    const decodedMvt = [];

    for(const encodedMvt of omtOptimizedMvtFiles){
        const buf = new Pbf(encodedMvt)
        const vt = new VectorTile(buf);
        const layers = [];
        for (const id in vt.layers) {
            const features = [];
            const layer = vt.layers[id];
            for (let i = 0; i < layer.length; i++) {
                const feature = layer.feature(i);
                feature.loadGeometry();
                features.push(feature);
            }
            layers.push(features);
        }
        decodedMvt.push(layers);
    }

    return decodedMvt;
}).*/
/*add("plain Overture Mlt", function () {
    const metadata = overturePlainFiles[0];
    const mltFiles = overturePlainFiles[1];
    const decodeTiles = [];
    for(const mlt of mltFiles){
        const decodedMlt = decodeTile(mlt, metadata, undefined,
            undefined, true);
        decodeTiles.push(decodedMlt);
    }
    return decodeTiles;
}).
add("Overture Mvt", function () {
    const decodedMvt = [];

    for(const encodedMvt of overtureMvtFiles){
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
}).
add("plain Swisstopo Mlt", function () {
    const metadata = swisstopoPlainFiles[0];
    const mltFiles = swisstopoPlainFiles[1];
    const decodeTiles = [];
    for(const mlt of mltFiles){
        const decodedMlt = decodeTile(mlt, metadata, undefined,
            undefined, true);
        decodeTiles.push(decodedMlt);
    }
    return decodeTiles;
}).
add("Swisstopo Mvt", function () {
    const decodedMvt = [];

    for(const encodedMvt of swisstopoMvtFiles){
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
}).
add("unoptimized plain OMT Mlt", function () {
    const metadata = omtUnoptimizedPlainFiles[0];
    const mltFiles = omtUnoptimizedPlainFiles[1];
    const decodeTiles = [];
    for(const mlt of mltFiles){
        const decodedMlt = decodeTile(mlt, metadata, undefined,
            undefined, true);
        decodeTiles.push(decodedMlt);
    }
    return decodeTiles;
}).
add("unoptimized OMT Mvt", function () {
     const decodedMvt = [];

     for(const encodedMvt of omtUnoptimizedMvtFiles){
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
 }).
add("unoptimized compressed OMT Mvt", function () {
        const decodedMvt = [];

        for(const encodedMvt of compressedOmtUnoptimizedMvtFiles){
            const mvt = zlib.unzipSync(encodedMvt);
            const buf = new Pbf(mvt)
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
    const runStats = {hz: target.hz, count: target.count};
    stats.has(name) ?
        stats.get(name).push(runStats) :
        stats.set(target.name, [runStats]);
    console.log(String(event.target));
})

for(let i = 0; i < numSuiteRuns; i++){
    console.info("Suite run ", i, " ------------------------------------------------------------------------");
    suite.run({initCount: 100, minSamples: 100});
}

const totalStats = new Map<string, {totalHz: number, totalCount}>()
const runNames = Array.from(stats.keys());
for(let i = 0; i < numSuiteRuns; i++){
    fs.appendFileSync(benchFile, `Suite run ${i} -----------------------------------------------------${os.EOL}`);
    for(const runName of runNames){
        const runStats = stats.get(runName)[i];
        fs.appendFileSync(benchFile, `${runName}: ${runStats.hz} (samples: ${runStats.count}) ${os.EOL}`);

        if(totalStats.has(runName)){
            const run = totalStats.get(runName);
            run.totalHz += runStats.hz;
            run.totalCount += runStats.count;
        }
        else{
            totalStats.set(runName, {totalHz: runStats.hz, totalCount: runStats.count});
        }
    }
}

let log = `${os.EOL} Average run statistics ----------------------------------------------------------`
console.info(log);
fs.appendFileSync(benchFile, log + os.EOL);
let optimizedMvtHz;
let unoptimizedMvtHz;
let partialOptimizedMvtHz;
let partialUnoptimizedMvtHz;
for(const [runName, runStats] of totalStats){
    const avgHz = runStats.totalHz / numSuiteRuns;
    const avgCount = runStats.totalCount / numSuiteRuns;
    const log = `${runName}: average hz: ${avgHz}, average samples: ${avgCount}`
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);

    if(runName.includes("Mvt")){
        if(["unoptimized", "partial"].every(t => runName.includes(t))){
            partialUnoptimizedMvtHz = avgHz;
        }
        else if(["optimized", "partial"].every(t => runName.includes(t))){
            partialOptimizedMvtHz = avgHz;
        }
        else if(runName.includes("unoptimized")){
            unoptimizedMvtHz = avgHz;
        }
        else if(runName.includes("optimized")){
            optimizedMvtHz = avgHz;
        }
    }
}

log = `${os.EOL} Ratio ----------------------------------------------------------`
console.info(log);
fs.appendFileSync(benchFile, log + os.EOL);
for(const [runName, runStats] of totalStats){
    if(runName.includes("Mvt")){
        continue;
    }

    const avgHz = runStats.totalHz / numSuiteRuns;
    let ratio;
    if(["unoptimized", "partial"].every(t => runName.includes(t))){
        ratio = avgHz / partialUnoptimizedMvtHz;
    }
    else if(["optimized", "partial"].every(t => runName.includes(t))){
        ratio = avgHz / partialOptimizedMvtHz
    }
    else if(runName.includes("unoptimized")){
        ratio = avgHz / unoptimizedMvtHz;
    }
    else{
        ratio = avgHz / optimizedMvtHz;
    }

    const log = `${runName} to Mvt ratio: ${ratio}`;
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
}


function getTiles(mltDirectory: string, mvtDirectory?: string): [TileSetMetadata, Buffer[], Buffer[], Buffer, Buffer[]]{
    const mvtFiles = [];
    const compressedMvtFiles = []
    const mltFiles = fs.readdirSync(mltDirectory).filter(file => path.parse(file).ext === ".mlt").
        map((file) => path.parse(file).name).map(fileName => {
            const mltFileName = `${fileName}.mlt`;
            const mltPath = Path.join(mltDirectory, mltFileName);
            const mlt = fs.readFileSync(mltPath);

            if(mvtDirectory){
                const mvtFileName = `${fileName}.mvt`;
                const mvtPath = Path.join(mvtDirectory, mvtFileName);
                const mvt = fs.readFileSync(mvtPath);
                mvtFiles.push(mvt);

                const compressedMVt = zlib.gzipSync(mvt);
                compressedMvtFiles.push(compressedMVt);
            }

            return mlt;
    });

    const mltMetaPath = Path.join(mltDirectory, "tileset.pbf");
    const tilesetMetadata = fs.readFileSync(mltMetaPath);
    const metadata = TileSetMetadata.fromBinary(tilesetMetadata);

    return [metadata, mltFiles, mvtFiles, tilesetMetadata, compressedMvtFiles];
}
