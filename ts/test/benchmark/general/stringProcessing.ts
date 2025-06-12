import Benchmark from "benchmark";
import fs from "fs";
import path from "node:path";
import {VectorTile} from "@mapbox/vector-tile";
import Pbf from "pbf";
import {decodeString} from "../../../src/encodings/decodingUtils";

const optimizedOmtMvtDir = "./test/data/omt/optimized/mvt";
const tiles = fs.readdirSync(optimizedOmtMvtDir, { withFileTypes: true });

const layerNames = ["place"];
const nameLatinVector = [];
const nameLatinLengthVector = [];
const textEncoder = new TextEncoder();
for(const tile of tiles){
    const tileName = path.join(optimizedOmtMvtDir, tile.name);
    const encodedMvt = fs.readFileSync(tileName);
    const buf = new Pbf(encodedMvt)
    const decodedMvt = new VectorTile(buf);
    for(const layerName of layerNames){
        const layer = decodedMvt.layers[layerName];
        if(!layer){
            continue;
        }

        console.info(tile.name);

        for(let i = 0; i < layer.length; i++){
            const mvtFeature = layer.feature(i);
            const nameLatinProperty = mvtFeature.properties["name:latin"] as string;
            if(nameLatinProperty){
                const utf8Buffer = textEncoder.encode(nameLatinProperty);
                for(const u of utf8Buffer){
                    nameLatinVector.push(u);
                }

                nameLatinLengthVector.push(utf8Buffer.length);
            }
        }
    }
}

console.info("Number of strings", nameLatinLengthVector.length);
console.info("Number of chars", nameLatinVector.length);

/*const nameLatinSlice = nameLatinVector.slice(0, 1000);
const nameLatinLengthSlice = nameLatinLengthVector.slice(0, 1000);*/

const nameLatinBuffer = new Uint8Array(nameLatinVector);
const nameLatinLengthBuffer = new Uint8Array(nameLatinLengthVector);

const suite = new Benchmark.Suite;
suite
    .add("String materialization", function () {
        const decoder = new TextDecoder();
        const latinNames = [];
        let offset = 0;
        for(let i = 0; i < nameLatinLengthBuffer.length; i++){
            const length = nameLatinLengthBuffer[i];
            const name = nameLatinBuffer.subarray(offset, offset + length);
            const decodedName = decoder.decode(name);
            latinNames.push(decodedName);
            offset += length;
        }
        return latinNames
    })
    .add("String materialization fast", function () {
        const latinNames = [];
        let offset = 0;
        for(let i = 0; i < nameLatinLengthBuffer.length; i++){
            const length = nameLatinLengthBuffer[i];
            const decodedName = decodeString(nameLatinBuffer, offset, offset + length);
            latinNames.push(decodedName);
            offset += length;
        }
        return latinNames
    })
    .on('cycle', (event: Benchmark.Event) => {
        console.log(String(event.target));
    })
    .on('complete', function() {
        console.log('Fastest is ' + suite.filter('fastest').map('name'));
    })
    .run();