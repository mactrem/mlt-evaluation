import Benchmark from "benchmark";
import fs from "fs";
import * as os from "os";
import {ConstGeometryVector} from "../../../../src/vector/geometry/constGeometryVector";
import {getAllMltFeatureTables, getAllMvtLayers, getTiles} from "../../utils/vectorTilesProvider";

const scale = 8192 / 4096;
const BITS = 15;
const MAX = Math.pow(2, BITS - 1) - 1;
const MIN = -MAX - 1;


const numSuiteRuns = 10;
const benchFile = "./dist/omt_benchmarks.txt";
const stats = new Map<string, [{hz: number, count: number}]>();

/*const omtUnoptimizedPlainMltDir = "./test/data/omt/unoptimized_user_session/mlt/plain";
const omtUnoptimizedMvtDir = "./test/data/omt/unoptimized_user_session/mvt";*/
const omtUnoptimizedPlainMltDir = "./test/data/overture/mlt/plain";
const omtUnoptimizedMvtDir = "./test/data/overture/mvt";
const omtUnoptimizedPlainFiles = getTiles(omtUnoptimizedPlainMltDir, omtUnoptimizedMvtDir);
const omtUnoptimizedMvtFiles = omtUnoptimizedPlainFiles[2];
/*const omtOptimizedPlainMltDir = "./test/data/omt/optimized_user_session/mlt/plain";
const omtOptimizedMvtDir = "./test/data/omt/optimized_user_session/mvt";
const omtOptimizedPlainFiles = getTiles(omtOptimizedPlainMltDir, omtOptimizedMvtDir);
const omtOptimizedMvtFiles = omtOptimizedPlainFiles[2];
const swissTopoPlainMltDir = "./test/data/swisstopo/mlt/plain";
const swissTopoMvtDir = "./test/data/swisstopo/mvt";
const swissTopoPlainFiles = getTiles(swissTopoPlainMltDir, swissTopoMvtDir);
const swissTopoMvtFiles = swissTopoPlainFiles[2];
const overturePlainMltDir = "./test/data/overture/mlt/plain";
const overtureMvtDir = "./test/data/overture/mvt";
const overturePlainFiles = getTiles(overturePlainMltDir, overtureMvtDir);
const overtureMvtFiles = overturePlainFiles[2];*/


const omtUnoptimizedFeatureTables = getAllMltFeatureTables(omtUnoptimizedPlainFiles[0], omtUnoptimizedPlainFiles[1]);
const omtUnoptimizedLayers = getAllMvtLayers(omtUnoptimizedMvtFiles);
/*
const omtOptimizedFeatureTables = getAllMltFeatureTables(omtOptimizedPlainFiles[0], omtOptimizedPlainFiles[1]);
const omtOptimizedLayers = getAllMvtLayers(omtOptimizedMvtFiles);
const swissTopoFeatureTables = getAllMltFeatureTables(swissTopoPlainFiles[0], swissTopoPlainFiles[1]);
const swissTopoLayers = getAllMvtLayers(swissTopoMvtFiles);
const overtureFeatureTables = getAllMltFeatureTables(overturePlainFiles[0], overturePlainFiles[1]);
const overtureLayers = getAllMvtLayers(overtureMvtFiles);
*/


const suite = new Benchmark.Suite().
add("OMT unoptimized Mlt Scaling", function () {
    console.info("---------------------------------------------------------------------------------------");
    let numProperties = 0;
    let numFeatureTables = 0;
    let numTransportationProperties = 0;
    let numTransportationFeatureTables = 0;
    for(const featureTable of omtUnoptimizedFeatureTables) {
        if(featureTable.numFeatures < 1000){
            continue;
        }

        //console.info("---------------------------------------------------------------------------------------");

        if(featureTable.geometryVector instanceof ConstGeometryVector){
            console.info("Const geometry Type", featureTable.name);
        }
        else{
            console.info("Mixed geometry Types", featureTable.name);
        }
        console.info(featureTable.propertyVectors.map(v => v.name).join(", "));

        if(featureTable.name.includes("transportation")){
            numTransportationProperties += featureTable.propertyVectors.length;
            numTransportationFeatureTables++;
            console.info("Transportation vectors: ",
                featureTable.propertyVectors.map(v => v.constructor.name).join(", "));
        }


        const vertexBuffer = featureTable.geometryVector.vertexBuffer;
        let i = 0;
        while(i < vertexBuffer.length) {
            const x = Math.round(vertexBuffer[i] * scale);
            const y = Math.round(vertexBuffer[i+1] * scale);
            vertexBuffer[i++]  = Math.min(MAX, Math.max(MIN, x));
            vertexBuffer[i++] = Math.min(MAX, Math.max(MIN, y));
        }
        numProperties += featureTable.propertyVectors.length;
        numFeatureTables++;
    }
    console.info("Num Propteries: ", numTransportationProperties / numTransportationFeatureTables);
    console.info("Num Propteries: ", numProperties / numFeatureTables,
        "--------------------------------------------------");
}).
/*add("MT unoptimized Mlt Scaling 2", function () {
    for(const featureTable of featureTables) {
        const vertexBuffer = featureTable.geometryVector.vertexBuffer;
        for(let i = 0; i < vertexBuffer.length; i+=2) {
            const x = Math.round(vertexBuffer[i] * scale);
            const y = Math.round(vertexBuffer[i+1] * scale);
            vertexBuffer[i]  = Math.min(MAX, Math.max(MIN, x));
            vertexBuffer[i+1] = Math.min(MAX, Math.max(MIN, y));
        }
    }
}).*/
/*add("OMT unoptimized Mvt Scaling", function () {
    for(const layer of omtUnoptimizedLayers){
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
}).*/
/*add("OMT optimized Mlt Scaling", function () {
    for(const featureTable of omtOptimizedFeatureTables) {
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
add("OMT optimized Mvt Scaling", function () {
    for(const layer of omtOptimizedLayers){
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
add("Swisstopo Mlt Scaling", function () {
    for(const featureTable of swissTopoFeatureTables) {
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
add("Swisstopo Mvt Scaling", function () {
    for(const layer of swissTopoLayers){
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
add("Overture Mlt Scaling", function () {
    for(const featureTable of overtureFeatureTables) {
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
add("Overture Mvt Scaling", function () {
    for(const layer of overtureLayers){
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


