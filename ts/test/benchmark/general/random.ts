import Benchmark from "benchmark";
import varint from "varint";
import {
    decodeVarintInt32, decodeZigZag,
    decodeZigZagDelta
} from "../../../src/encodings/integerDecodingUtils";
import IntWrapper from "../../../src/encodings/intWrapper";


const suite = new Benchmark.Suite;

//const numValues = 10_000 * 1024;
//const numValues = 1024;
const numValues = 1_000_000;
const rowOrientedValues = [];
const columnOrientedValues = {id1: new Uint32Array(numValues), id2: new Uint32Array(numValues),
    name: [], geometry: new Int32Array(numValues * 3)};
const columnOrientedValuesInterleaved = {id1And2: new Uint32Array(numValues * 2),
    name: [], geometry: new Int32Array(numValues * 3)};
const vectorValues = [];
let vectorCounter = 0;
for(let i = 0; i < numValues; i++) {
    const name = "TestTest";
    const id1 = Math.floor(Math.random() * 101);
    const id2 = Math.floor(Math.random() * 1001);
    const obj = {id: id1, id2: id2,
        name, x: 10, y: 20, z: 50 };
    /*const obj = {id: id1, id2};*/
    rowOrientedValues.push(obj);

    columnOrientedValues.id1[i] = id1;
    columnOrientedValues.id2[i] = id2;
    columnOrientedValues.name.push(name);
    columnOrientedValues.geometry[i*3] = 10;
    columnOrientedValues.geometry[i*3 + 1] = 20;
    columnOrientedValues.geometry[i*3 + 2] = 50;

    columnOrientedValuesInterleaved.id1And2 [i*2] = id1;
    columnOrientedValuesInterleaved.id1And2 [i*2 + 1] = id2;
    columnOrientedValuesInterleaved.name.push(name);
    columnOrientedValuesInterleaved.geometry[i*3] = 10;
    columnOrientedValuesInterleaved.geometry[i*3 + 1] = 20;
    columnOrientedValuesInterleaved.geometry[i*3 + 2] = 50;

    if(i%1024 === 0){
        vectorValues.push({id1: new Uint32Array(1024), id2: new Uint32Array(1024)});
        vectorCounter = 0;
    }

    const vectorIndex = Math.floor(i / 1024);
    vectorValues[vectorIndex].id1[vectorCounter] = id1;
    vectorValues[vectorIndex].id2[vectorCounter++] = id2;
}


const numValuesOptTest = 100_000
const randomValuesArray = new Int32Array(numValuesOptTest);
const deltaRandomValuesArray = new Int32Array(numValuesOptTest);
for(let i = 0; i < randomValuesArray.length; i++) {
    randomValuesArray[i] = Math.floor(Math.random() * 1000);
    if(i === 0){
        deltaRandomValuesArray[0] = randomValuesArray[0];
    }
    else{
        deltaRandomValuesArray[i] = randomValuesArray[i] - randomValuesArray[i-1];
    }
}
const deltaZigZagVarintEncodedRandomValues = deltaZigZagVarintEncode(Array.from(randomValuesArray));

class Point{
    constructor(public x: number, public y: number) {
    }

}

suite
    /*.add("100k values array fill normal js array", function () {
        const arrSize = 100_000;
        const arr = [];
        for(let i = 0; i < arrSize; i++) {
            arr.push(i);
        }
        return arr;
    })
    .add("100k values array fill normal js array with pre-allocation", function () {
        const arrSize = 100_000;
        const arr = new Array(arrSize);
        for(let i = 0; i < arrSize; i++) {
            arr[i]= i;
        }
        return arr;
    })
    .add("100k values array fill ArrayBuffer", function () {
        const arrSize = 100_000;
        const arr = new Uint32Array(arrSize);
        for(let i = 0; i < arrSize; i++) {
            arr[i]= i;
        }
        return arr;
    })*/
    .add("1 million values array fill normal js array", function () {
        const arrSize = 5_000_000;
        const arr = [];
        for(let i = 0; i < arrSize; i++) {
            arr.push(i);
        }
        return arr;
    })
    .add("1 million values array fill normal js array with pre-allocation", function () {
        const arrSize = 5_000_000;
        const arr = new Array(arrSize);
        for(let i = 0; i < arrSize; i++) {
            arr[i]= i;
        }
        return arr;
    })
    .add("1 million values array fill ArrayBuffer", function () {
        const arrSize = 5_000_000;
        const arr = new Uint32Array(arrSize);
        for(let i = 0; i < arrSize; i++) {
            arr[i]= i;
        }
        return arr;
    })
    .add("100k values values ArrayBuffer", function () {
        const arrSize = 100_000;
        const arr = new Uint32Array(arrSize);
        for(let i = 0; i < arrSize; i++) {
            arr[i] = randomValuesArray[i];
        }
        return arr;
    })
    .add("100k values point creation", function () {
        const arrSize = 100_000;
        const points = [];
        for(let i = 0; i < arrSize; i+=2) {
            const point = new Point(randomValuesArray[i], randomValuesArray[i+1]);
            points.push(point);
        }
        return points;
    })
    .add("row-oriented computation", function () {
        const results = [];
        for(let i = 0; i < numValues; i++) {
            const result = rowOrientedValues[i].id1 + rowOrientedValues[i].id2;
            results.push(result);
        }
        return results;
    })
    .add("column-oriented computation", function () {
        const results = [];
        for(let i = 0; i < numValues; i++) {
            const result = columnOrientedValues.id1[i] + columnOrientedValues.id2[i]
            results.push(result);
        }
        return results;
    })
    .add("column-oriented interleaved computation", function () {
        const results = [];
        const nv = columnOrientedValuesInterleaved.id1And2.length;
        for(let i = 0; i < nv; i+=2) {
            const result = columnOrientedValuesInterleaved.id1And2[i]
                + columnOrientedValuesInterleaved.id1And2[i+1];
            results.push(result);
        }
        return results;
    })
    .add("column-oriented interleaved computation with pre-allocation", function () {
        const nv = columnOrientedValuesInterleaved.id1And2.length;
        const results = new Uint32Array(nv / 2);
        for(let i = 0; i < nv; i+=2) {
            const result = columnOrientedValuesInterleaved.id1And2[i]
                + columnOrientedValuesInterleaved.id1And2[i+1];
            results[i / 2] = result;
        }
        return results;
    })
    .add("column-oriented interleaved computation 2 with pre-allocation", function () {
        const nv = columnOrientedValuesInterleaved.id1And2.length;
        const results = new Uint32Array(nv / 2);
        let counter = 0;
        for(let i = 0; i < nv; i+=2) {
            const result = columnOrientedValuesInterleaved.id1And2[i]
                + columnOrientedValuesInterleaved.id1And2[i+1];
            results[counter++] = result;
        }
        return results;
    })
    .add("column-oriented filter", function () {
        const selectionVector = [];
        for(let i = 0; i < numValues; i++) {
            if(columnOrientedValues.id1[i] < 2 && columnOrientedValues.id2[i] < 10){
                selectionVector.push(i);
            }
        }

        return selectionVector
    })
    .add("row-oriented filter", function () {
        const selectionVector = [];
        for(let i = 0; i < numValues; i++) {
            if(rowOrientedValues[i].id < 2 && rowOrientedValues[i].id2 < 10) {
                selectionVector.push(i);
            }
        }
        return selectionVector;
    })

    /*.add("100k values zigZag Varint decoding Mapbox", function () {
        const decodedValues = new Int32Array(numValuesOptTest);
        const offset = new IntWrapper(0);
        for(let i = 0; i < numValuesOptTest; i++) {
            decodedValues[i] = readVarint(deltaZigZagVarintEncodedRandomValues,  true, offset);
        }
        return decodedValues;
    })
    .add("100k values zigZag Varint decoding", function () {
        const values = decodeZigZagVarintUnoptimized(deltaZigZagVarintEncodedRandomValues, numValuesOptTest);
        return values;
    })
    .add("100k values Varint decoding Mapbox", function () {
        const decodedValues = new Int32Array(numValuesOptTest);
        const offset = new IntWrapper(0);
        for(let i = 0; i < numValuesOptTest; i++) {
            decodedValues[i] = readVarint(deltaZigZagVarintEncodedRandomValues,  false, offset);
        }
        return decodedValues;
    })
    .add("100k values Varint decoding", function () {
        const values = decodeVarint(deltaZigZagVarintEncodedRandomValues, new IntWrapper(0), numValuesOptTest);
        return values;
    })
    .add("100k values zigZag, delta Varint decoding", function () {
    const values = decodeDeltaZigZagVarintUnoptimized(deltaZigZagVarintEncodedRandomValues, numValuesOptTest);
    return values;
})
    .add("100k values zigZag, delta Varint decoding optimized", function () {
        const values =  decodeDeltaZigZagVarint(deltaZigZagVarintEncodedRandomValues, new IntWrapper(0),
            numValuesOptTest);
        return values;
    })
    .add("100k loop iterations", function () {
        const numIterations = 100_000;
        let sum = 0;
        for(let i = 0; i < numIterations; i++) {
            sum += 1;
        }
        return sum;
    })
    .add("100k values array add", function () {
        const arrSize = 100_000;
        const arr = new Uint32Array(arrSize);
        for(let i = 0; i < arrSize; i++) {
            arr[i] = i;
        }
        return arr;
    })
    .add("100k values array add", function () {
        const arrSize = 100_000;
        const arr = new Uint32Array(arrSize);
        for(let i = 0; i < arrSize; i++) {
            arr[i] = i;
        }
        return arr;
    })
    .add("100k values delta decoding", function () {
        const arrSize = 100_000;
        const arr = new Int32Array(arrSize);
        arr[0] = deltaRandomValuesArray[0];
        for(let i = 1; i < arrSize; i++) {
            arr[i] = arr[i-1] + deltaRandomValuesArray[i];
        }
        return arr;
    })
    .add("100k values delta decoding with predictable branch", function () {
        const arrSize = 100_000;
        const arr = new Int32Array(arrSize);

        for(let i = 0; i < arrSize; i++) {
            if(i === 0){
                arr[i] = deltaRandomValuesArray[i];
            }
            else{
                arr[i] = arr[i-1] + deltaRandomValuesArray[i];
            }
        }
        return arr;
    })
    .add("250k values delta decoding", function () {
        const arrSize = 250_000;
        const arr = new Int32Array(arrSize);
        arr[0] = deltaRandomValuesArray[0];
        for(let i = 1; i < arrSize; i++) {
            arr[i] = arr[i-1] + deltaRandomValuesArray[i];
        }
        return arr;
    })
    .add("optimized", function () {
        const values = [];
        for(let i = 0; i < numValuesOptTest; i++) {
            const a = squareInt(i);
            values.push(a);
        }

        for(let i = 0; i < numValuesOptTest; i++) {
            const a = squareBigInt(BigInt(i));
            values.push(a);
        }

        /!*for(let i = 0; i < numValuesOptTest; i++) {
            const a = squareInt(i);
            values.push(a);
        }

        for(let i = 0; i < numValuesOptTest; i++) {
            const a = squareBigInt(BigInt(i));
            values.push(a);
        }*!/
    })
    .add("deoptimized", function () {
        const values = [];
        for(let i = 0; i < numValuesOptTest; i++) {
            const a = square(i);
            values.push(a);
        }

        for(let i = 0; i < numValuesOptTest; i++) {
            const a = square(BigInt(i));
            values.push(a);
        }

      /!*  for(let i = 0; i < numValuesOptTest; i++) {
            const a = square(i);
            values.push(a);
        }

        for(let i = 0; i < numValuesOptTest; i++) {
            const a = square(BigInt(i));
            values.push(a);
        }*!/
    })
    .add("optimized inlined", function () {
        const values = [];
        for(let i = 0; i < numValuesOptTest; i++) {
            const a = i * i;
            values.push(a);
        }

        for(let i = 0; i < numValuesOptTest; i++) {
            const n = BigInt(i);
            const a = n * n;
            values.push(a);
        }

        /!*for(let i = 0; i < numValuesOptTest; i++) {
            const a = squareInt(i);
            values.push(a);
        }

        for(let i = 0; i < numValuesOptTest; i++) {
            const a = squareBigInt(BigInt(i));
            values.push(a);
        }*!/
    })*/
    /*.add("column-oriented filter", function () {
        const selectionVector = [];
        for(let i = 0; i < numValues; i++) {
            if(columnOrientedValues.id1[i] < 2 && columnOrientedValues.id2[i] < 10){
                selectionVector.push(i);
            }
        }
    })
    .add("column-oriented optimized filter", function () {
        const selectionVector = [];
        for(let i = 0; i < numValues; i++) {
            if(columnOrientedValues.id1[i] < 2){
                selectionVector.push(i);
            }
        }

        const selectionVector2 = [];
        for(let i = 0; i < selectionVector.length; i++) {
            const index = selectionVector[i];
            if(columnOrientedValues.id2[index] < 10){
                selectionVector2.push(index);
            }
        }
    })
    .add("column-oriented optimized filter 2", function () {
        const selectionVector = [];
        for(let i = 0; i < numValues; i++) {
            if(columnOrientedValues.id1[i] < 2){
                selectionVector.push(i);
            }
        }

        const selectionVector2 = [];
        selectionVector.forEach((index) => {
            if(columnOrientedValues.id2[index] < 10){
                selectionVector2.push(index);
            }
        });
    })
    .add("column-oriented optimized filter 4", function () {
        const selectionVector = [];
        for(let i = 0; i < numValues; i++) {
            if(columnOrientedValues.id1[i] < 2){
                selectionVector.push(i);
            }
        }

        const selectionVector2 = selectionVector.filter((index) => columnOrientedValues.id2[index] < 10);
    })
    .add("row-oriented optimized filter", function() {
        const selectionVector = [];
        for(let i = 0; i < numValues; i++) {
            if(rowOrientedValues[i].id < 2 && rowOrientedValues[i].id2 < 10) {
                selectionVector.push(i);
            }
        }
    })
    .add("row-oriented filter", function() {
        const selectionVector = [];
        for(let i = 0; i < numValues; i++) {
            if(rowOrientedValues[i].id < 2 ) {
                selectionVector.push(i);
            }
        }

        const selectionVector2 = [];
        for(let i = 0; i < selectionVector.length; i++) {
            const index = selectionVector[i];
            if(rowOrientedValues[index].id2 < 10) {
                selectionVector2.push(i);
            }
        }
    })
    .add("vector column-oriented filter", function () {
        const selectionVector = [];
        for(let i = 0; i < vectorValues.length; i++) {
            const vectors = vectorValues[i];
            for(let j = 0; j < 1024; j++){
                if(vectors.id1[j] < 2 && vectors.id2[j] < 10){
                    selectionVector.push(i);
                }
            }
        }
    })
    .add("vector column-oriented filter 2", function () {
        const selectionVector = [];
        for(let i = 0; i < vectorValues.length; i++) {
            const vectors = vectorValues[i];
            for(let j = 0; j < 1024; j++){
                if(vectors.id1[j] < 2){
                    selectionVector.push(i);
                }
            }
        }

        const selectionVector2 = [];
        let indexCounter = 0;
        for(let i = 0; i < selectionVector.length; i++) {
            const vectors = vectorValues[i];
            for(let j = 0; j < 1024; j++){
                const index = selectionVector[indexCounter++];
                if(vectors.id2[index] < 10){
                    selectionVector2.push(i);
                }
            }
        }
    })*/
    .on('cycle', (event: Benchmark.Event) => {
        console.log(String(event.target));
    })
    .on('complete', function() {
        console.log('Fastest is ' + suite.filter('fastest').map('name'));
    })
    .run();

function square(n : any){
    return n * n;
}

function squareInt(n : number){
    return n * n;
}

function squareBigInt(n : bigint){
    return n * n;
}

function deltaZigZagVarintEncode(values: number[]){
    const deltas = [];
    const varintEncodedDeltas = [];
    for(let i = 0; i < values.length; i++){
        const delta = i === 0? values[0] : values[i] - values[i-1];
        deltas.push(delta);
        const zigZagDelta = (delta >> 31) ^ (delta << 1)
        const varintEncodedZigZagDelta = varint.encode(zigZagDelta);
        varintEncodedDeltas.push(...varintEncodedZigZagDelta);
    }

    return new Uint8Array(varintEncodedDeltas);
}

function decodeDeltaZigZagVarintUnoptimized(buffer: Uint8Array, numValues: number){
    const values = decodeVarintInt32(buffer, new IntWrapper(0), numValues);
    decodeZigZagDelta(values);
    return values;
}

function decodeZigZagVarintUnoptimized(buffer: Uint8Array, numValues: number){
    const values = decodeVarintInt32(buffer, new IntWrapper(0), numValues);
    decodeZigZag(values);
    return values;
}


function readVarintArrayPbfBased(src: Uint8Array, numValues: number, offset: IntWrapper){
    const dst = new Array(numValues);
    for (let i = 0; i < dst.length; i++) {
        dst[i] = readVarint(src, false, offset);
    }
    return dst;
}


function readVarint(buf: Uint8Array, isSigned: boolean, offset: IntWrapper) {
    let val, b;
    b = buf[offset.get()]; offset.increment(); val  =  b & 0x7f;        if (b < 0x80) return val;
    b = buf[offset.get()]; offset.increment(); val |= (b & 0x7f) << 7;  if (b < 0x80) return val;
    b = buf[offset.get()]; offset.increment(); val |= (b & 0x7f) << 14; if (b < 0x80) return val;
    b = buf[offset.get()]; offset.increment(); val |= (b & 0x7f) << 21; if (b < 0x80) return val;
    b = buf[offset.get()];   val |= (b & 0x0f) << 28;

    return readVarintRemainder(val, isSigned, buf, offset);
}

function readVarintRemainder(l, s, buf, offset) {
    let h, b;

    b = buf[offset.get()]; offset.increment(); h  = (b & 0x70) >> 4;  if (b < 0x80) return toNum(l, h, s);
    b = buf[offset.get()];  offset.increment();h |= (b & 0x7f) << 3;  if (b < 0x80) return toNum(l, h, s);
    b = buf[offset.get()];  offset.increment();h |= (b & 0x7f) << 10; if (b < 0x80) return toNum(l, h, s);
    b = buf[offset.get()];  offset.increment();h |= (b & 0x7f) << 17; if (b < 0x80) return toNum(l, h, s);
    b = buf[offset.get()];  offset.increment();h |= (b & 0x7f) << 24; if (b < 0x80) return toNum(l, h, s);
    b = buf[offset.get()];  offset.increment();h |= (b & 0x01) << 31; if (b < 0x80) return toNum(l, h, s);


    throw new Error('Expected varint not more than 10 bytes');
}


function toNum(low, high, isSigned) {
    return isSigned ? high * 0x100000000 + (low >>> 0) : ((high >>> 0) * 0x100000000) + (low >>> 0);
}