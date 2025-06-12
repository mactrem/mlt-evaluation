import Benchmark from "benchmark";
import Path from "path";
import fs from "fs";
import {TileSetMetadata} from "../../../src/metadata/tileset/tilesetMetadata";
import decodeTile from "../../../src/mltDecoder";
import {VectorTile} from "@mapbox/vector-tile";
import Pbf from "pbf";


const suite = new Benchmark.Suite;

const tilesDir = "../test/fixtures";
//const pathname = "omt/4_8_10";
const pathname = "omt/11_1064_1367";
const fixtureDirname = Path.dirname(pathname);
//const mvtFilename = "4_8_10.mvt";
const mvtFilename = "11_1064_1367.mvt";
const mvtPath = Path.join(tilesDir, fixtureDirname, mvtFilename);
const expectedDir = tilesDir.replace('fixtures','expected');
const mltPath = Path.join(expectedDir, fixtureDirname, mvtFilename.replace(/\.(pbf|mvt)$/,'.mlt'));
const mltMetaPath = mltPath.replace('.advanced','') + '.meta.pbf';
const meta = fs.readFileSync(mltMetaPath);
const encodedMlt = fs.readFileSync(mltPath);
const metadata = TileSetMetadata.fromBinary(meta);
const encodedMvt = fs.readFileSync(mvtPath);

const bufFilter = new Pbf(encodedMvt)
const vtFilter = new VectorTile(bufFilter);
const filterLayerName = "transportation";
const filterPropertyName = "class";
const filterPredicate = "motorway_construction";
const filterPropertyName2 = "brunnel";
const filterPredicate2 = "tunnel";
const layerFilter = vtFilter.layers[filterLayerName];
const mltFilter = decodeTile(encodedMlt, metadata);
const featureTableFilter = mltFilter.filter(f => f.name === filterLayerName)[0];

const EXTENT = 8192;
const BITS = 15;
const MAX = Math.pow(2, BITS - 1) - 1;
const MIN = -MAX - 1;
/*const mvtGeometries = new Array(layerFilter.length);
for (let i = 0; i < layerFilter.length; i++) {
    const feature = layerFilter.feature(i);
    mvtGeometries[i] = feature.loadGeometry();
}*/


suite.
add("decode mlt", function () {
    const mlt = decodeTile(encodedMlt, metadata);
})/*.
add("decode mvt", function () {
    const buf = new Pbf(encodedMvt)
    const vt = new VectorTile(buf);
    for (const id in vt.layers) {
        const layer = vt.layers[id];
        for (let i = 0; i < layer.length; i++) {
            //const feature = layer.feature(i);
            //feature.loadGeometry();
            layer.feature(i);
        }
    }
}).*/
/*add("filter mvt", function () {
    const selectionVector = [];
    for (let i = 0; i < layerFilter.length; i++) {
        const feature = layerFilter.feature(i);
        if(feature.properties[filterPropertyName] === filterPredicate &&
            feature.properties[filterPropertyName2] === filterPredicate2){
            selectionVector.push(i);
        }
    }
    return selectionVector[0];
}).
add("filter mlt", function () {
    const vectorFilter = featureTableFilter.propertyVectors.filter(v => v.name === filterPropertyName)[0];
    const vectorFilter2 = featureTableFilter.propertyVectors.filter(v => v.name === filterPropertyName2)[0];
    const selectionVector = vectorFilter.filter(filterPredicate);
    const selectionVector2 = (vectorFilter2 as StringDictionaryVector).filterSelectedValues(filterPredicate2, selectionVector);
    return selectionVector2[0];
}).
add("filter mlt optimized", function () {
    const vectorFilter = featureTableFilter.propertyVectors.filter(v => v.name === filterPropertyName)[0] as StringDictionaryVector;
    const vectorFilter2 = featureTableFilter.propertyVectors.filter(v => v.name === filterPropertyName2)[0] as StringDictionaryVector;

    const selectionVector = vectorFilter.filterSelectedValues2(filterPredicate,
        vectorFilter2, filterPredicate2);
    return selectionVector[0];
}).*/
/*add("process geometry mvt", function () {
        const geometries = new Array(layerFilter.length);
        for (let i = 0; i < layerFilter.length; i++) {
            const feature = layerFilter.feature(i);
            geometries[i] = loadGeometry(feature);
        }
        return geometries[0];
}).
add("process geometry mvt fast", function () {
    loadGeometryFast(mvtGeometries, 4096);
    return mvtGeometries[0];
}).
add("process geometry mlt", function () {
    const vertexBuffer = featureTableFilter.geometryVector.vertexBuffer;
    loadGeometry2(vertexBuffer, 4096);
    return vertexBuffer[0];
}).*/
/*add("filter mlt", function () {
    const vectorFilter = featureTableFilter.propertyVectors.filter(v => v.name === filterPropertyName2)[0];
    const selectionVector = vectorFilter.filter(filterPredicate2);
    return selectionVector[0];
})*/.
on('cycle', (event: Benchmark.Event) => {
    console.log(String(event.target));
}).
on('complete', function() {
    console.log('Fastest is ' + suite.filter('fastest').map('name'));
}).run()

function loadGeometry(feature: any): Array<Array<any>> {
    const scale = EXTENT / feature.extent;
    const geometry = feature.loadGeometry();
    for (let r = 0; r < geometry.length; r++) {
        const ring = geometry[r];
        for (let p = 0; p < ring.length; p++) {
            const point = ring[p];
            const x = Math.round(point.x * scale);
            const y = Math.round(point.y * scale);
            point.x = clamp(x, MIN, MAX);
            point.y = clamp(y, MIN, MAX);
        }
    }
    return geometry;
}

function loadGeometryFast(geometries: any[], featureExtent: number){
    const scale = EXTENT / featureExtent;
    for(let i = 0; i < geometries.length; i++){
        const geometry = geometries[i];
        for (let r = 0; r < geometry.length; r++) {
            const ring = geometry[r];
            for (let p = 0; p < ring.length; p++) {
                const point = ring[p];
                point.x = clamp(Math.round(point.x * scale), MIN, MAX);
                point.y = clamp(Math.round(point.y * scale), MIN, MAX);
            }
        }
    }
}

function loadGeometry2(coordinates: Int32Array, featureTableExtent: number) {
    const scale = EXTENT / featureTableExtent

    for(let i = 0; i < coordinates.length; i+=2){
        coordinates[i] = clamp(Math.round(coordinates[i] * scale), MIN, MAX);
        coordinates[i+1] = clamp(Math.round(coordinates[i+1] * scale), MIN, MAX);
    }
}

function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
}



