import Benchmark from "benchmark";
import Path from "path";
import fs from "fs";
import {TileSetMetadata} from "../../../src/metadata/tileset/tilesetMetadata";
import decodeTile from "../../../src/mltDecoder";
import {VectorTile} from "@mapbox/vector-tile";
import OptimizeVectorTile from "../utils/optimized-vector-tile/vectortile";
import VectorTilePartial from "../utils/partial-vector-tile/vectortile";
import Pbf from "pbf";
import path from "node:path";
import * as os from "os";

const numSuiteRuns = 10;
const benchFile = "./dist/omt_benchmarks.txt";
const stats = new Map<string, [{hz: number, count: number}]>();

const optimizedMvtTilesDir = "./test/data/omt/optimized2/mvt";
const unoptimizedMvtTilesDir = "./test/data/omt/unoptimized/mvt";

const optimizedPlainMltTilesDir = "./test/data/omt/optimized2/mlt/plain";
const unoptimizedPlainMltTilesDir = "./test/data/omt/unoptimized/mlt/plain";

const optimizedPlainMortonMltTilesDir = "./test/data/omt/optimized2/mlt/plain-morton";
const unoptimizedPlainMortonMltTilesDir = "./test/data/omt/unoptimized/mlt/plain-morton";

const optimizedPretessellatedMltTilesDir = "./test/data/omt/optimized2/mlt/pre-tessellated";
const unoptimizedPretessellatedMltTilesDir = "./test/data/omt/unoptimized/mlt/pre-tessellated";


const optimizedPlainFiles = getTiles(optimizedPlainMltTilesDir);
const unoptimizedPlainFiles = getTiles(unoptimizedPlainMortonMltTilesDir);
const optimizedPlainMortonFiles = getTiles(optimizedPlainMortonMltTilesDir);
const unoptimizedPlainMortonFiles = getTiles(unoptimizedPlainMltTilesDir);
const optimizedPretessellatedFiles = getTiles(optimizedPretessellatedMltTilesDir,
    optimizedMvtTilesDir);
const unoptimizedPretessellatedFiles = getTiles(unoptimizedPretessellatedMltTilesDir,
    unoptimizedMvtTilesDir);

const unoptimizedMvtFiles = unoptimizedPretessellatedFiles[2];
const optimizedMvtFiles = optimizedPretessellatedFiles[2];



/* Used for partial/lazy deocoding tests. Simulates an OMT basic style.
*  Will be automatic detected based on the style in the future. */
const mltDecodingOptions = new Map<string, Set<string>>();
mltDecodingOptions.set("place", new Set(["class", "name:latin",
    "name:nonlatin", "capital", "rank", "iso:a2"]));
mltDecodingOptions.set("water", new Set());
mltDecodingOptions.set("transportation", new Set(["brunnel", "class"]));
mltDecodingOptions.set("building", new Set([]));
mltDecodingOptions.set("landuse", new Set(["class"]));
mltDecodingOptions.set("landcover", new Set());
mltDecodingOptions.set("poi", new Set(["rank", "name:latin", "name:nonlatin"]));
mltDecodingOptions.set("boundary", new Set(["admin:level", "maritime", "disputed",
    "claimed_by"]));
mltDecodingOptions.set("housenumber", new Set(["housenumber"]));
mltDecodingOptions.set("aeroway", new Set(["class"]));

const mvtLayerNames = Array.from(mltDecodingOptions.keys());

const suite = new Benchmark.Suite().

/* Newer (optimized) OpenMapTiles based tileset generated with planetiler */
/*add("optimized plain Mlt", function () {
        const metadata = optimizedPlainFiles[0];
        const mltFiles = optimizedPlainFiles[1];
        const decodeTiles = [];
        for(const mlt of mltFiles){
            const decodedMlt = decodeTile(mlt, metadata, undefined, undefined, false);
            decodeTiles.push(decodedMlt);
        }
        return decodeTiles;
}).*/

add("optimized plain Mlt with optimized id decoding", function () {
        const metadata = optimizedPlainFiles[0];
        const mltFiles = optimizedPlainFiles[1];
        const decodeTiles = [];
        for(const mlt of mltFiles){
            const decodedMlt = decodeTile(mlt, metadata, undefined,
                undefined, true);
            decodeTiles.push(decodedMlt);
        }
        return decodeTiles;
    }).
/*add("optimized pre-tessellated Mlt with optimized id decoding", function () {
        const metadata = optimizedPretessellatedFiles[0];
        const mltFiles = optimizedPretessellatedFiles[1];
        const decodeTiles = [];
        for(const mlt of mltFiles){
            const decodedMlt = decodeTile(mlt, metadata);
            decodeTiles.push(decodedMlt);
        }
        return decodeTiles;
    }).*/

add("optimized Mvt with optimized decoder", function () {
        const decodedMvt = [];

        for(const encodedMvt of optimizedMvtFiles){
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

/*add("optimized plain morton Mlt with optimized id decoding", function () {
        const metadata = optimizedPlainMortonFiles[0];
        const mltFiles = optimizedPlainMortonFiles[1];
        const decodeTiles = [];
        for(const mlt of mltFiles){
            const decodedMlt = decodeTile(mlt, metadata);
            decodeTiles.push(decodedMlt);
        }
        return decodeTiles;
    }).*/

/*add("unoptimized plain Mlt", function () {
    const metadata = unoptimizedPlainFiles[0];
    const mltFiles = unoptimizedPlainFiles[1];
    const decodeTiles = [];
    for(const mlt of mltFiles){
        const decodedMlt = decodeTile(mlt, metadata, undefined, undefined, false);
        decodeTiles.push(decodedMlt);
    }
    return decodeTiles;
}).*/
/*add("unoptimized plain Mlt with optimized id decoding", function () {
    const metadata = unoptimizedPlainFiles[0];
    const mltFiles = unoptimizedPlainFiles[1];
    const decodeTiles = [];
    for(const mlt of mltFiles){
        const decodedMlt = decodeTile(mlt, metadata);
        decodeTiles.push(decodedMlt);
    }
    return decodeTiles;
}).
add("unoptimized plain Mlt with optimized id decoding", function () {
    const metadata = unoptimizedPlainMortonFiles[0];
    const mltFiles = unoptimizedPlainMortonFiles[1];
    const decodeTiles = [];
    for(const mlt of mltFiles){
        const decodedMlt = decodeTile(mlt, metadata, undefined,
            undefined, true);
        decodeTiles.push(decodedMlt);
    }
    return decodeTiles;
}).*/

/*add("unoptimized pre-tessellated Mlt with optimized id decoding", function () {
    const metadata = unoptimizedPretessellatedFiles[0];
    const mltFiles = unoptimizedPretessellatedFiles[1];
    const decodeTiles = [];
    for(const mlt of mltFiles){
        const decodedMlt = decodeTile(mlt, metadata);
        decodeTiles.push(decodedMlt);
    }
    return decodeTiles;
}).*/

/* Simulates the decoding of how it is used in the Bucket classes in MapLibre GL JS */
/*add("optimized Mvt", function () {
        const decodedMvt = [];
        for(const encodedMvt of optimizedMvtFiles){
            const buf = new Pbf(encodedMvt)
            const vt = new VectorTile(buf);

            const features = [];
            for (const id in vt.layers) {
                const layer = vt.layers[id];
                for (let i = 0; i < layer.length; i++) {
                    const feature = layer.feature(i);
                    const geometry = feature.loadGeometry();
                    const bucketFeature = {
                        id: feature.id,
                        type: feature.type,
                        geometry: geometry,
                        properties: feature.properties,
                    }
                    features.push(bucketFeature);
                }
            }
            decodedMvt.push(features);
        }
        return decodedMvt;
}).*/
/*add("optimized Mvt with optimized decoder", function () {
    const decodedMvt = [];

    for(const encodedMvt of optimizedMvtFiles){
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

/* Simulates the decoding of how it is used in the Bucket classes in MapLibre GL JS */
/*add("unoptimized Mvt", function () {
        const decodedMvt = [];
        for(const encodedMvt of unoptimizedMvtFiles){
            const buf = new Pbf(encodedMvt)
            const vt = new VectorTile(buf);

            const features = [];
            for (const id in vt.layers) {
                const layer = vt.layers[id];
                for (let i = 0; i < layer.length; i++) {
                    const feature = layer.feature(i);
                    const geometry = feature.loadGeometry();
                    const bucketFeature = {
                        id: feature.id,
                        type: feature.type,
                        geometry: geometry,
                        properties: feature.properties,
                    }
                    features.push(bucketFeature);
                }
            }
            decodedMvt.push(features);
        }
        return decodedMvt;
    }).*/
/*add("unoptimized Mvt with optimized decoder", function () {
        const decodedMvt = [];

        for(const encodedMvt of unoptimizedMvtFiles){
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

/*add("partial decode unoptimized Mvt", function () {
        const decodedMvt = [];
        for(const encodedMvt of unoptimizedMvtFiles){
            const buf = new Pbf(encodedMvt)
            const vt = new VectorTilePartial(buf, mvtLayerNames);

            const features = [];
            for (const id in vt.layers) {
                const layer = vt.layers[id];
                for (let i = 0; i < layer.length; i++) {
                    const feature = layer.feature(i);
                    const geometry = feature.loadGeometry();
                    const bucketFeature = {
                        id: feature.id,
                        type: feature.type,
                        geometry: geometry,
                        properties: feature.properties,
                    }
                    features.push(bucketFeature);
                }
            }
            decodedMvt.push(features);
        }
        return decodedMvt;
    }).
add("partial decode optimized Mvt", function () {
        const decodedMvt = [];
        for(const encodedMvt of optimizedMvtFiles){
            const buf = new Pbf(encodedMvt)
            const vt = new VectorTilePartial(buf, mvtLayerNames);

            const features = [];
            for (const id in vt.layers) {
                const layer = vt.layers[id];
                for (let i = 0; i < layer.length; i++) {
                    const feature = layer.feature(i);
                    const geometry = feature.loadGeometry();
                    const bucketFeature = {
                        id: feature.id,
                        type: feature.type,
                        geometry: geometry,
                        properties: feature.properties,
                    }
                    features.push(bucketFeature);
                }
            }
            decodedMvt.push(features);
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


function getTiles(mltDirectory: string, mvtDirectory?: string): [TileSetMetadata, Buffer[], Buffer[], Buffer]{
    const mvtFiles = [];
    const mltFiles = fs.readdirSync(mltDirectory).filter(file => path.parse(file).ext === ".mlt")
        .map((file) => path.parse(file).name).map(fileName => {
            const mltFileName = `${fileName}.mlt`;
            const mltPath = Path.join(mltDirectory, mltFileName);
            const mlt = fs.readFileSync(mltPath);

            if(mvtDirectory){
                const mvtFileName = `${fileName}.mvt`;
                const mvtPath = Path.join(mvtDirectory, mvtFileName);
                const mvt = fs.readFileSync(mvtPath);
                mvtFiles.push(mvt);
            }

            return mlt;
    });

    const mltMetaPath = Path.join(mltDirectory, "tileset.pbf");
    const tilesetMetadata = fs.readFileSync(mltMetaPath);
    const metadata = TileSetMetadata.fromBinary(tilesetMetadata);

    return [metadata, mltFiles, mvtFiles, tilesetMetadata];
}
