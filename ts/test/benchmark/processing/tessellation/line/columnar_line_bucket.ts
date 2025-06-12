import {LineLayoutArray, LineExtLayoutArray} from './utils/array_types.g';
import {SegmentVector} from './utils/segment';
import {TriangleIndexArray} from './utils/index_array_type';
import {EXTENT} from './utils/extent';
import type Point from './utils/point';
import type {Segment} from './utils/segment';
import VectorUtils from "./vectorUtils";
import {FeatureTable, GeometryVector} from "../../../../../src";


// NOTE ON EXTRUDE SCALE:
// scale the extrusion vector so that the normal length is this value.
// contains the "texture" normals (-1..1). this is distinct from the extrude
// normals for line joins, because the x-value remains 0 for the texture
// normal array, while the extrude normal actually moves the vertex to create
// the acute/bevelled line join.
const EXTRUDE_SCALE = 63;

/*
 * Sharp corners cause dashed lines to tilt because the distance along the line
 * is the same at both the inner and outer corners. To improve the appearance of
 * dashed lines we add extra points near sharp corners so that a smaller part
 * of the line is tilted.
 *
 * COS_HALF_SHARP_CORNER controls how sharp a corner has to be for us to add an
 * extra vertex. The default is 75 degrees.
 *
 * The newly created vertices are placed SHARP_CORNER_OFFSET pixels from the corner.
 */
const COS_HALF_SHARP_CORNER = Math.cos(75 / 2 * (Math.PI / 180));
const SHARP_CORNER_OFFSET = 15;

// Angle per triangle for approximating round line joins.
const DEG_PER_TRIANGLE = 20;

// The number of bits that is used to store the line distance in the buffer.
const LINE_DISTANCE_BUFFER_BITS = 15;

// We don't have enough bits for the line distance as we'd like to have, so
// use this value to scale the line distance (in tile units) down to a smaller
// value. This lets us store longer distances while sacrificing precision.
const LINE_DISTANCE_SCALE = 1 / 2;

// The maximum line distance, in tile units, that fits in the buffer.
const MAX_LINE_DISTANCE = Math.pow(2, LINE_DISTANCE_BUFFER_BITS - 1) / LINE_DISTANCE_SCALE;



const BITS = 15;
const MAX = Math.pow(2, BITS - 1) - 1;
const MIN = -MAX - 1;

/**
 * @internal
 * Line bucket class
 */
export class ColumnarLineBucket {
    distance: number;
    totalDistance: number;
    scaledDistance: number;

    e1: number;
    e2: number;

    index: number;
    overscaling: number;
    layoutVertexArray: LineLayoutArray;
    layoutVertexArray2: LineExtLayoutArray;
    indexArray: TriangleIndexArray;
    segments: SegmentVector;
    miterLimit = 2;
    roundLimit= 1.05;

    constructor() {
        this.layoutVertexArray = new LineLayoutArray();
        this.layoutVertexArray2 = new LineExtLayoutArray();
        this.indexArray = new TriangleIndexArray();
        this.segments = new SegmentVector();
    }

    tessellateLine(featureTable: FeatureTable, join: string, cap: string) {
        const geometryVector = featureTable.geometryVector as GeometryVector;

        const topologyVector = geometryVector.topologyVector;
        if(geometryVector.containsSingleGeometryType() && topologyVector.partOffsets && !topologyVector.geometryOffsets){
            this.addLineStrings(featureTable, join, cap);
        }
        else if(topologyVector.geometryOffsets && topologyVector.partOffsets && !topologyVector.ringOffsets){
            this.addMultiLineStrings(featureTable, join, cap);
        }
        else if(!topologyVector.geometryOffsets && topologyVector.partOffsets && topologyVector.ringOffsets){
            this.addPolygon(featureTable, join, cap);
        }
        else if(topologyVector.geometryOffsets && topologyVector.partOffsets && topologyVector.ringOffsets){
            this.addMultiPolygon(featureTable, join, cap);
        }
        else{
            throw new Error("Point, MultiPoint or MultiPolygon geometries are not supported for a LineLayer.");
        }
    }

    addLineStrings(featureTable: FeatureTable, join: string, cap: string){
        const geometryVector = featureTable.geometryVector as GeometryVector;
        const partOffsets = geometryVector.topologyVector.partOffsets;
        const numFeatures = featureTable.numFeatures;
        for(let i = 0; i < numFeatures; i++){
            const startOffset = partOffsets[i];
            const endOffset = partOffsets[i+1];
            this.addLine(geometryVector, startOffset,
                endOffset, false, join, cap, this.miterLimit, this.roundLimit);
        }
    }

    addMultiLineStrings(featureTable: FeatureTable, join: string, cap: string){
        const geometryVector = featureTable.geometryVector as GeometryVector
        const geometryOffsets = geometryVector.topologyVector.geometryOffsets;
        const lineStringOffsets = geometryVector.topologyVector.partOffsets;
        const numFeatures = featureTable.numFeatures;

        for(let i = 0; i < numFeatures; i++){
            const startLineStringOffset = geometryOffsets[i];
            const endLineStringOffset = geometryOffsets[i+1];
            for(let j = startLineStringOffset; j < endLineStringOffset; j++){
                this.addLine(geometryVector, lineStringOffsets[j], lineStringOffsets[j+1], false, join, cap,
                    this.miterLimit, this.roundLimit);
            }
        }
    }

    //TODO: implement generic solution and merge with addMultiLineString method -
    addPolygon(featureTable: FeatureTable, join: string, cap: string){
        const geometryVector = featureTable.geometryVector as GeometryVector;
        const ringOffsets = geometryVector.topologyVector.ringOffsets;
        const polygonOffsets = geometryVector.topologyVector.partOffsets;
        const numFeatures = featureTable.numFeatures;

        for(let i = 0; i < numFeatures; i++) {
            const geometryType = geometryVector.geometryType(i);
            const polygonOffsetStart = polygonOffsets[i];
            const polygonOffsetEnd = polygonOffsets[i + 1];
            for (let j = polygonOffsetStart; j < polygonOffsetEnd; j++) {
                this.addLine(geometryVector, ringOffsets[j], ringOffsets[j + 1], geometryType === 2, join, cap,
                    this.miterLimit, this.roundLimit);
            }
        }
    }

    addMultiPolygon(featureTable: FeatureTable, join: string, cap: string){
        const geometryVector = featureTable.geometryVector as GeometryVector;
        const geometryOffsets = geometryVector.topologyVector.geometryOffsets;
        const ringOffsets = geometryVector.topologyVector.ringOffsets;
        const polygonOffsets = geometryVector.topologyVector.partOffsets;
        const numFeatures = featureTable.numFeatures;
        for(let i = 0; i < numFeatures; i++){
            const geometryType = geometryVector.geometryType(i);
            const geometryOffsetStart = geometryOffsets[i];
            const geometryOffsetEnd = geometryOffsets[i+1];
            for(let j = geometryOffsetStart; j < geometryOffsetEnd; j++){
                const polygonOffsetStart = polygonOffsets[j];
                const polygonOffsetEnd = polygonOffsets[j+1];
                for(let k = polygonOffsetStart; k < polygonOffsetEnd; k++){
                    this.addLine(geometryVector, ringOffsets[k], ringOffsets[k+1],
                        geometryType === 2 || geometryType === 5, join, cap, this.miterLimit, this.roundLimit);
                }
            }
        }
    }

    addLine(geometryVector: GeometryVector, startOffset: number, endOffset: number,  isPolygon: boolean,
            join: string, cap: string, miterLimit: number, roundLimit: number) {
        this.distance = 0;
        this.scaledDistance = 0;
        this.totalDistance = 0;

        let len = endOffset - startOffset;

        // If the line has duplicate vertices at the ends, adjust start/length to remove them.
        while (len >= 2 && VectorUtils.equalsVertex(geometryVector, startOffset + len -1,
            startOffset + len -2)){
            len--;
        }
        let first = startOffset;
        while (first < len - 1 && VectorUtils.equalsVertex(geometryVector, first, first+1)) {
            first++;
        }

        // Ignore invalid geometry.
        if (len < (isPolygon ? 3 : 2)) return;

        if (join === 'bevel') miterLimit = 1.05;

        const sharpCornerOffset = this.overscaling <= 16 ?
            SHARP_CORNER_OFFSET * EXTENT / (512 * this.overscaling) :
            0;

        // we could be more precise, but it would only save a negligible amount of space
        const segment = this.segments.prepareSegment(len * 10, this.layoutVertexArray, this.indexArray);

        let currentVertexX: number = Number.MAX_SAFE_INTEGER;
        let currentVertexY: number;
        let prevVertexX: number = Number.MAX_SAFE_INTEGER;
        let prevVertexY: number;
        let nextVertexX: number = Number.MAX_SAFE_INTEGER;
        let nextVertexY: number;
        let prevNormal: Point;
        let nextNormal: Point;

        // the last two vertices added
        this.e1 = this.e2 = -1;

        if (isPolygon) {
            //const vertex = geometryVector.getVertex(startOffset + len - 2);
            const vertex = geometryVector.getSimpleEncodedVertex(startOffset + len - 1);
            currentVertexX = vertex[0];
            currentVertexY = vertex[1];
            const firstVertex =  geometryVector.getSimpleEncodedVertex(first);

            nextNormal = VectorUtils.sub(firstVertex[0], firstVertex[1], currentVertexX, currentVertexY)._unit()._perp();
        }

        const end = first + len;
        for (let i = first; i < end; i++) {
            if(i !== end - 1){
                const v = geometryVector.getSimpleEncodedVertex(i + 1);
                nextVertexX = v[0];
                nextVertexY = v[1];
            }
            else{
                if(!isPolygon){
                    nextVertexX = Number.MAX_SAFE_INTEGER;
                }
                else{
                    // if it's a polygon, treat the last vertex like the first
                    //const v = geometryVector.getVertex(first + 1);
                    const v = geometryVector.getSimpleEncodedVertex(first);
                    nextVertexX = v[0];
                    nextVertexY = v[1];
                }
            }

            // if two consecutive vertices exist, skip the current one
            const v = geometryVector.getSimpleEncodedVertex(i);
            if (nextVertexX !== Number.MAX_SAFE_INTEGER && VectorUtils.equals(v[0], v[1],
                nextVertexX, nextVertexY)) continue;

            if (nextNormal) prevNormal = nextNormal;
            if (currentVertexX !== Number.MAX_SAFE_INTEGER){
                prevVertexX = currentVertexX;
                prevVertexY = currentVertexY;
            }

            currentVertexX = v[0];
            currentVertexY = v[1];

            // Calculate the normal towards the next vertex in this line. In case
            // there is no next vertex, pretend that the line is continuing straight,
            // meaning that we are just using the previous normal.
            nextNormal = nextVertexX !== Number.MAX_SAFE_INTEGER ? VectorUtils.sub(nextVertexX, nextVertexY, currentVertexX, currentVertexY).
            _unit()._perp() : prevNormal;

            // If we still don't have a previous normal, this is the beginning of a
            // non-closed line, so we're doing a straight "join".
            prevNormal = prevNormal || nextNormal;

            // Determine the normal of the join extrusion. It is the angle bisector
            // of the segments between the previous line and the next line.
            // In the case of 180° angles, the prev and next normals cancel each other out:
            // prevNormal + nextNormal = (0, 0), its magnitude is 0, so the unit vector would be
            // undefined. In that case, we're keeping the joinNormal at (0, 0), so that the cosHalfAngle
            // below will also become 0 and miterLength will become Infinity.
            let joinNormal = prevNormal.add(nextNormal);
            if (joinNormal.x !== 0 || joinNormal.y !== 0) {
                joinNormal._unit();
            }
            /*  joinNormal     prevNormal
             *             ↖      ↑
             *                .________. prevVertex
             *                |
             * nextNormal  ←  |  currentVertex
             *                |
             *     nextVertex !
             *
             */

            // calculate cosines of the angle (and its half) using dot product
            const cosAngle = prevNormal.x * nextNormal.x + prevNormal.y * nextNormal.y;
            const cosHalfAngle = joinNormal.x * nextNormal.x + joinNormal.y * nextNormal.y;

            // Calculate the length of the miter (the ratio of the miter to the width)
            // as the inverse of cosine of the angle between next and join normals
            const miterLength = cosHalfAngle !== 0 ? 1 / cosHalfAngle : Infinity;

            // approximate angle from cosine
            const approxAngle = 2 * Math.sqrt(2 - 2 * cosHalfAngle);

            const isSharpCorner = cosHalfAngle < COS_HALF_SHARP_CORNER
                && prevVertexX !== Number.MAX_SAFE_INTEGER && nextVertexX !== Number.MAX_SAFE_INTEGER
            const lineTurnsLeft = prevNormal.x * nextNormal.y - prevNormal.y * nextNormal.x > 0;

            if (isSharpCorner && i > first) {
                const prevSegmentLength =  VectorUtils.dist(currentVertexX, currentVertexX, prevVertexX,
                    prevVertexY);
                if (prevSegmentLength > 2 * sharpCornerOffset) {
                    const newPrevVertex = VectorUtils.subPoint(currentVertexX, currentVertexY,
                        VectorUtils.sub(currentVertexX, currentVertexY, prevVertexX, prevVertexY).
                        _mult(sharpCornerOffset / prevSegmentLength)._round());

                    this.updateDistance(prevVertexX, prevVertexY, newPrevVertex.x, newPrevVertex.y);
                    this.addCurrentVertex(newPrevVertex.x, newPrevVertex.y, prevNormal, 0, 0, segment);
                    prevVertexX = newPrevVertex.x;
                    prevVertexY = newPrevVertex.y;
                }
            }

            // The join if a middle vertex, otherwise the cap.
            const middleVertex = prevVertexX !== Number.MAX_SAFE_INTEGER &&
                nextVertexX !== Number.MAX_SAFE_INTEGER;
            let currentJoin = middleVertex ? join : isPolygon ? 'butt' : cap;

            if (middleVertex && currentJoin === 'round') {
                if (miterLength < roundLimit) {
                    currentJoin = 'miter';
                } else if (miterLength <= 2) {
                    currentJoin = 'fakeround';
                }
            }

            if (currentJoin === 'miter' && miterLength > miterLimit) {
                currentJoin = 'bevel';
            }

            if (currentJoin === 'bevel') {
                // The maximum extrude length is 128 / 63 = 2 times the width of the line
                // so if miterLength >= 2 we need to draw a different type of bevel here.
                if (miterLength > 2) currentJoin = 'flipbevel';

                // If the miterLength is really small and the line bevel wouldn't be visible,
                // just draw a miter join to save a triangle.
                if (miterLength < miterLimit) currentJoin = 'miter';
            }

            // Calculate how far along the line the currentVertex is
            if (prevVertexX !== Number.MAX_SAFE_INTEGER) this.updateDistance(prevVertexX, prevVertexY,  currentVertexX, currentVertexY);

            if (currentJoin === 'miter') {
                joinNormal._mult(miterLength);
                this.addCurrentVertex(currentVertexX, currentVertexY, joinNormal, 0, 0, segment);

            } else if (currentJoin === 'flipbevel') {
                // miter is too big, flip the direction to make a beveled join

                if (miterLength > 100) {
                    // Almost parallel lines
                    joinNormal = nextNormal.mult(-1);

                } else {
                    const bevelLength = miterLength * prevNormal.add(nextNormal).mag() / prevNormal.sub(nextNormal).mag();
                    joinNormal._perp()._mult(bevelLength * (lineTurnsLeft ? -1 : 1));
                }
                this.addCurrentVertex(currentVertexX, currentVertexY, joinNormal, 0, 0, segment);
                this.addCurrentVertex(currentVertexX, currentVertexY, joinNormal.mult(-1), 0, 0, segment);

            } else if (currentJoin === 'bevel' || currentJoin === 'fakeround') {
                const offset = -Math.sqrt(miterLength * miterLength - 1);
                const offsetA = lineTurnsLeft ? offset : 0;
                const offsetB = lineTurnsLeft ? 0 : offset;

                // Close previous segment with a bevel
                if (prevVertexX !== Number.MAX_SAFE_INTEGER) {
                    this.addCurrentVertex(currentVertexX, currentVertexY, prevNormal, offsetA, offsetB, segment);
                }

                if (currentJoin === 'fakeround') {
                    // The join angle is sharp enough that a round join would be visible.
                    // Bevel joins fill the gap between segments with a single pie slice triangle.
                    // Create a round join by adding multiple pie slices. The join isn't actually round, but
                    // it looks like it is at the sizes we render lines at.

                    // pick the number of triangles for approximating round join by based on the angle between normals
                    const n = Math.round((approxAngle * 180 / Math.PI) / DEG_PER_TRIANGLE);

                    for (let m = 1; m < n; m++) {
                        let t = m / n;
                        if (t !== 0.5) {
                            // approximate spherical interpolation https://observablehq.com/@mourner/approximating-geometric-slerp
                            const t2 = t - 0.5;
                            const A = 1.0904 + cosAngle * (-3.2452 + cosAngle * (3.55645 - cosAngle * 1.43519));
                            const B = 0.848013 + cosAngle * (-1.06021 + cosAngle * 0.215638);
                            t = t + t * t2 * (t - 1) * (A * t2 * t2 + B);
                        }
                        const extrude = nextNormal.sub(prevNormal)._mult(t)._add(prevNormal)._unit()._mult(lineTurnsLeft ? -1 : 1);
                        this.addHalfVertex(currentVertexX, currentVertexY, extrude.x, extrude.y, false, lineTurnsLeft, 0, segment);
                    }
                }

                if (nextVertexX !== Number.MAX_SAFE_INTEGER) {
                    // Start next segment
                    this.addCurrentVertex(currentVertexX, currentVertexY, nextNormal, -offsetA, -offsetB, segment);
                }

            } else if (currentJoin === 'butt') {
                this.addCurrentVertex(currentVertexX, currentVertexY, joinNormal, 0, 0, segment); // butt cap

            } else if (currentJoin === 'square') {
                const offset = prevVertexX !== Number.MAX_SAFE_INTEGER ? 1 : -1; // closing or starting square cap
                this.addCurrentVertex(currentVertexX, currentVertexY, joinNormal, offset, offset, segment);

            } else if (currentJoin === 'round') {
                if (prevVertexX !== Number.MAX_SAFE_INTEGER) {
                    // Close previous segment with butt
                    this.addCurrentVertex(currentVertexX, currentVertexY, prevNormal, 0, 0, segment);

                    // Add round cap or linejoin at end of segment
                    this.addCurrentVertex(currentVertexX, currentVertexY, prevNormal, 1, 1, segment, true);
                }
                if (nextVertexX !== Number.MAX_SAFE_INTEGER) {
                    // Add round cap before first segment
                    this.addCurrentVertex(currentVertexX, currentVertexY, nextNormal, -1, -1, segment, true);

                    // Start next segment with a butt
                    this.addCurrentVertex(currentVertexX, currentVertexY, nextNormal, 0, 0, segment);
                }
            }

            if (isSharpCorner && i < end - 1) {
                const nextSegmentLength = VectorUtils.dist(currentVertexX, currentVertexY, nextVertexX,
                    nextVertexY);
                if (nextSegmentLength > 2 * sharpCornerOffset) {
                    const a = VectorUtils.sub(nextVertexX, nextVertexY, currentVertexX, currentVertexY).
                    _mult(sharpCornerOffset / nextSegmentLength)._round()
                    const newCurrentVertex = VectorUtils.add(currentVertexX, currentVertexY, a.x, a.y)

                    this.updateDistance(currentVertexX, currentVertexY, newCurrentVertex.x, newCurrentVertex.y);
                    this.addCurrentVertex(newCurrentVertex.x, newCurrentVertex.y , nextNormal, 0, 0, segment);
                    currentVertexX = newCurrentVertex.x;
                    currentVertexY = newCurrentVertex.y;
                }
            }
        }
    }

    addCurrentVertex(x: number, y: number, normal: Point, endLeft: number, endRight: number, segment: Segment, round: boolean = false) {
        // left and right extrude vectors, perpendicularly shifted by endLeft/endRight
        const leftX = normal.x + normal.y * endLeft;
        const leftY = normal.y - normal.x * endLeft;
        const rightX = -normal.x + normal.y * endRight;
        const rightY = -normal.y - normal.x * endRight;

        this.addHalfVertex(x, y, leftX, leftY, round, false, endLeft, segment);
        this.addHalfVertex(x ,y, rightX, rightY, round, true, -endRight, segment);

        // There is a maximum "distance along the line" that we can store in the buffers.
        // When we get close to the distance, reset it to zero and add the vertex again with
        // a distance of zero. The max distance is determined by the number of bits we allocate
        // to `linesofar`.
        if (this.distance > MAX_LINE_DISTANCE / 2 && this.totalDistance === 0) {
            this.distance = 0;
            this.updateScaledDistance();
            this.addCurrentVertex(x, y, normal, endLeft, endRight, segment, round);
        }
    }

    addHalfVertex(x: number, y: number, extrudeX: number, extrudeY: number, round: boolean, up: boolean, dir: number, segment: Segment) {
        const totalDistance = this.scaledDistance;
        // scale down so that we can store longer distances while sacrificing precision.
        const linesofarScaled = totalDistance * LINE_DISTANCE_SCALE;
        this.layoutVertexArray.emplaceBack(
            // a_pos_normal
            // Encode round/up the least significant bits
            (x << 1) + (round ? 1 : 0),
            (y << 1) + (up ? 1 : 0),
            // a_data
            // add 128 to store a byte in an unsigned byte
            Math.round(EXTRUDE_SCALE * extrudeX) + 128,
            Math.round(EXTRUDE_SCALE * extrudeY) + 128,
            // Encode the -1/0/1 direction value into the first two bits of .z of a_data.
            // Combine it with the lower 6 bits of `linesofarScaled` (shifted by 2 bits to make
            // room for the direction value). The upper 8 bits of `linesofarScaled` are placed in
            // the `w` component.
            ((dir === 0 ? 0 : (dir < 0 ? -1 : 1)) + 1) | ((linesofarScaled & 0x3F) << 2),
            linesofarScaled >> 6
        );

        const e = segment.vertexLength++;
        if (this.e1 >= 0 && this.e2 >= 0) {
            this.indexArray.emplaceBack(this.e1, this.e2, e);
            segment.primitiveLength++;
        }
        if (up) {
            this.e2 = e;
        } else {
            this.e1 = e;
        }
    }

    updateScaledDistance() {
        // Knowing the ratio of the full linestring covered by this tiled feature, as well
        // as the total distance (in tile units) of this tiled feature, and the distance
        // (in tile units) of the current vertex, we can determine the relative distance
        // of this vertex along the full linestring feature and scale it to [0, 2^15)
        this.scaledDistance = this.distance;
    }

    updateDistance(x: number, y: number, x2: number, y2: number) {
        this.distance += VectorUtils.dist(x, y, x2, y2);
        this.updateScaledDistance();
    }
}

