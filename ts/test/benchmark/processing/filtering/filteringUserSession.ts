import fs from "fs";
import filter from "../../../../src/processing/filter";
import Benchmark from "benchmark";
import os from "os";
import { getAllMltFeatureTables, getAllMvtLayers, getTiles } from "../../utils/vectorTilesProvider";

const ff = require("@maplibre/maplibre-gl-style-spec").featureFilter;

const omtBasicStylePath = "./test/benchmark/processing/data/omt-basic-style.json";

const data = fs.readFileSync(omtBasicStylePath, "utf8");
const styleSpecification = JSON.parse(data);
/* We filter all layers out that do not have a geometry predicate in the filter for fair and real-world comparison*/
const styleLayers = styleSpecification.layers
    .filter((layer) => layer.filter && layer.filter.toString().includes("$type"))
    .map((layer) => {
        return {
            name: layer.id,
            sourceLayer: layer["source-layer"],
            filter: ff(layer.filter).filter,
            expression: layer.filter,
        };
    });

const omtUnoptimizedPlainMltDir = "./test/data/omt/unoptimized_user_session/mlt/plain";
const omtUnoptimizedMvtDir = "./test/data/omt/unoptimized_user_session/mvt";
const omtUnoptimizedBenchFile = "./dist/omt_unoptimized_filter_benchmarks.txt";
const omtOptimizedPlainMltDir = "./test/data/omt/optimized_user_session/mlt/plain";
const omtOptimizedMvtDir = "./test/data/omt/optimized_user_session/mvt";
const omtOptimizedBenchFile = "./dist/omt_optimized_filter_benchmarks.txt";

const numSuiteRuns = 2;
runSuite(omtUnoptimizedPlainMltDir, omtUnoptimizedMvtDir, styleLayers, numSuiteRuns, omtUnoptimizedBenchFile);
runSuite(omtOptimizedPlainMltDir, omtOptimizedMvtDir, styleLayers, numSuiteRuns, omtOptimizedBenchFile);

/* Verify if the benchmarks are producing the same results --------------------------------------------------- */
verifyBenchmarks(omtUnoptimizedPlainMltDir, omtUnoptimizedMvtDir, styleLayers);
verifyBenchmarks(omtOptimizedPlainMltDir, omtOptimizedMvtDir, styleLayers);


function runSuite(mltDir, mvtDir, styleLayers, numSuiteRuns: number, benchFile: string){
    const { featureTables, layers } = getData(mltDir, mvtDir);

    const stats = new Map<string, [{ hz: number; count: number }]>();
    const suite = new Benchmark.Suite()
    .add("MLT filter", function () {
        let filteredFeaturesCounter = 0;
        for (const featureTable of featureTables) {
            for (const styleLayer of styleLayers) {
                if (featureTable.name != styleLayer.sourceLayer) {
                    continue;
                }

                const styleFilter = styleLayer.filter;
                const filteredFeatures = filter(featureTable, styleFilter.expression);
                filteredFeaturesCounter = filteredFeatures.limit;
            }
        }
        return filteredFeaturesCounter;
    })
    .add("MVT filter", function () {
        let filteredFeaturesCounter = 0;
        for (const sourceLayer of layers) {
            for (const styleLayer of styleLayers) {
                if (sourceLayer.name != styleLayer.sourceLayer) {
                    continue;
                }

                const filter = styleLayer.filter;
                const filteredFeatures = [];
                for (const feature of sourceLayer.features) {
                    if (filter(null, feature)) {
                        filteredFeatures.push(feature);
                    }
                }
                filteredFeaturesCounter += filteredFeatures.length;
            }
        }
        return filteredFeaturesCounter;
    })
    .on("cycle", (event: Benchmark.Event) => {
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

    const totalStats = new Map<string, { totalHz: number; totalCount }>();
    const runNames = Array.from(stats.keys());
    for (let i = 0; i < numSuiteRuns; i++) {
        fs.appendFileSync(benchFile, `Suite run ${i} -----------------------------------------------------${os.EOL}`);
        for (const runName of runNames) {
            const runStats = stats.get(runName)[i];
            fs.appendFileSync(benchFile, `${runName}: ${runStats.hz} (samples: ${runStats.count}) ${os.EOL}`);

            if (totalStats.has(runName)) {
                const run = totalStats.get(runName);
                run.totalHz += runStats.hz;
                run.totalCount += runStats.count;
            } else {
                totalStats.set(runName, { totalHz: runStats.hz, totalCount: runStats.count });
            }
        }
    }

    let log = "Average run statistics ----------------------------------------------------------";
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
    for (const [runName, runStats] of totalStats) {
        const avgHz = runStats.totalHz / numSuiteRuns;
        const avgCount = runStats.totalCount / numSuiteRuns;
        const log = `${runName}: average hz: ${avgHz}, average samples: ${avgCount}`;
        console.info(log);
        fs.appendFileSync(benchFile, log + os.EOL);
    }

    log = "Ratio ----------------------------------------------------------";
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
    const ratio = totalStats.get("MLT filter").totalHz / totalStats.get("MVT filter").totalHz
    log = `MLT to Mvt ratio: ${ratio}`;
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
}

function verifyBenchmarks(mltDir, mvtDir, styleLayers){
    const { featureTables, layers } = getData(mltDir, mvtDir);

    let mvtFilterdFeatures = 0;
    for (const sourceLayer of layers) {
        for (const styleLayer of styleLayers) {
            if (sourceLayer.name != styleLayer.sourceLayer) {
                continue;
            }

            const filter = styleLayer.filter;
            const filteredFeatures = [];
            for (const feature of sourceLayer.features) {
                if (filter(null, feature)) {
                    filteredFeatures.push(feature);
                }
            }

            mvtFilterdFeatures += filteredFeatures.length;
        }
    }

    let mltFilteredFeatures = 0;
    for (const featureTable of featureTables) {
        for (const styleLayer of styleLayers) {
            if (featureTable.name != styleLayer.sourceLayer) {
                continue;
            }

            const expression = styleLayer.expression;
            const filteredFeatures = filter(featureTable, expression);
            mltFilteredFeatures += filteredFeatures.limit;
        }
    }

    if(mltFilteredFeatures !== mvtFilterdFeatures){
        throw new Error("Verification of the produced results failed.");
    }

    console.info("Verification of the produced results successful.");
}

function getData(mltDir, mvtDir) {
    const mltFiles = getTiles(mltDir, mvtDir);
    const mvtFiles = mltFiles[2];
    const featureTables = getAllMltFeatureTables(mltFiles[0], mltFiles[1], false);
    const layers = getAllMvtLayers(mvtFiles, false);
    return { featureTables, layers };
}
