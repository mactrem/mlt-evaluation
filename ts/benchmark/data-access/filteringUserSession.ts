import fs from "fs";
import Benchmark from "benchmark";
import os from "os";
import {getAllMltFeatureTables, getAllMvtLayers, getTiles} from "../../test/benchmark/utils/vectorTilesProvider";
import {filter} from "../../src";
import Path from "path";
const ff = require("@maplibre/maplibre-gl-style-spec").featureFilter;

/**
 * Benchmarks for random data access (point lookups) based on a real-world filtering example with an OMT basic style.
 * The OMT basic style is slightly modified since all layer which have not a geometry filter predicate are removed
 * (35 of 47 layer are in use). This is done to ensure a fair comparison since if no geometry predicate is present
 * in the filter also no geometry is loaded. In this benchmark we preload the geometries so that this overhead
 * is not part of the benchmark.
 */

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
const omtOptimizedPlainMltDir = "./test/data/omt/optimized_user_session/mlt/plain";
const omtOptimizedMvtDir = "./test/data/omt/optimized_user_session/mvt";

const numSuiteRuns = 10;
const benchFile = Path.join("dist", "filtering_benchmarks.txt");
runSuite(omtUnoptimizedPlainMltDir, omtUnoptimizedMvtDir, styleLayers, numSuiteRuns, "OMT Unoptimized");
runSuite(omtOptimizedPlainMltDir, omtOptimizedMvtDir, styleLayers, numSuiteRuns, "OMT Optimized");

/* Verify if the benchmarks are producing the same results */
verifyBenchmarks(omtUnoptimizedPlainMltDir, omtUnoptimizedMvtDir, styleLayers);
verifyBenchmarks(omtOptimizedPlainMltDir, omtOptimizedMvtDir, styleLayers);


function runSuite(mltDir, mvtDir, styleLayers, numSuiteRuns: number, tilesetName: string) {
    const { featureTables, layers } = getData(mltDir, mvtDir);

    const stats = new Map<string, [{ hz: number }]>();
    const suite = new Benchmark.Suite()
    .add("MLT Filtering", function () {
        let filteredFeaturesCounter = 0;
        for (const featureTable of featureTables) {
            for (const styleLayer of styleLayers) {
                if (featureTable.name != styleLayer.sourceLayer) {
                    continue;
                }

                const expression = styleLayer.expression;
                const filteredFeatures = filter(featureTable, expression);
                filteredFeaturesCounter = filteredFeatures.limit;
            }
        }
        return filteredFeaturesCounter;
    })
    /* Simulating the filtering workflow as used in MapLibre GL JS*/
    .add("MVT Filtering", function () {
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
        const runStats = { hz: target.hz };
        stats.has(name) ? stats.get(name).push(runStats) : stats.set(target.name, [runStats]);
        console.log(String(event.target));
    });

    for (let i = 0; i < numSuiteRuns; i++) {
        console.info(`${tilesetName} Suite Run ${i} -----------------------------------------------------------`);
        suite.run({ initCount: 100, minSamples: 100 });
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

    let log = `Filtering Performance MLT to MVT on ${tilesetName} Tileset ------------------------------------`;
    console.info(log);
    fs.appendFileSync(benchFile, log + os.EOL);
    const mltAvgFilteringTime = 1 / (totalStats.get("MLT Filtering").totalHz / numSuiteRuns) * 1000
    const mvtAvgFilteringTime = 1 / (totalStats.get("MVT Filtering").totalHz / numSuiteRuns) * 1000
    const ratio = totalStats.get("MLT Filtering").totalHz / totalStats.get("MVT Filtering").totalHz;
    log = `MLT to Mvt ratio: ${ratio}, MLT time (milliseconds): ${mltAvgFilteringTime}, MVT time: ${mvtAvgFilteringTime}`;
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
