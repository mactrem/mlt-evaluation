// This file is generated. Edit build/generate-struct-arrays.ts, then run `npm run codegen`.

import {Struct, StructArray} from './struct_array';
import Point from './point';

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Int16[2]
 *
 */
class StructArrayLayout2i4 extends StructArray {
    uint8: Uint8Array;
    int16: Int16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1);
    }

    public emplace(i: number, v0: number, v1: number) {
        const o2 = i * 2;
        this.int16[o2 + 0] = v0;
        this.int16[o2 + 1] = v1;
        return i;
    }
}

StructArrayLayout2i4.prototype.bytesPerElement = 4;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Int16[3]
 *
 */
class StructArrayLayout3i6 extends StructArray {
    uint8: Uint8Array;
    int16: Int16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2);
    }

    public emplace(i: number, v0: number, v1: number, v2: number) {
        const o2 = i * 3;
        this.int16[o2 + 0] = v0;
        this.int16[o2 + 1] = v1;
        this.int16[o2 + 2] = v2;
        return i;
    }
}

StructArrayLayout3i6.prototype.bytesPerElement = 6;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Int16[4]
 *
 */
class StructArrayLayout4i8 extends StructArray {
    uint8: Uint8Array;
    int16: Int16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number) {
        const o2 = i * 4;
        this.int16[o2 + 0] = v0;
        this.int16[o2 + 1] = v1;
        this.int16[o2 + 2] = v2;
        this.int16[o2 + 3] = v3;
        return i;
    }
}

StructArrayLayout4i8.prototype.bytesPerElement = 8;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Int16[2]
 * [4] - Int16[4]
 *
 */
class StructArrayLayout2i4i12 extends StructArray {
    uint8: Uint8Array;
    int16: Int16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3, v4, v5);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number, v4: number, v5: number) {
        const o2 = i * 6;
        this.int16[o2 + 0] = v0;
        this.int16[o2 + 1] = v1;
        this.int16[o2 + 2] = v2;
        this.int16[o2 + 3] = v3;
        this.int16[o2 + 4] = v4;
        this.int16[o2 + 5] = v5;
        return i;
    }
}

StructArrayLayout2i4i12.prototype.bytesPerElement = 12;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Int16[2]
 * [4] - Uint8[4]
 *
 */
class StructArrayLayout2i4ub8 extends StructArray {
    uint8: Uint8Array;
    int16: Int16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3, v4, v5);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number, v4: number, v5: number) {
        const o2 = i * 4;
        const o1 = i * 8;
        this.int16[o2 + 0] = v0;
        this.int16[o2 + 1] = v1;
        this.uint8[o1 + 4] = v2;
        this.uint8[o1 + 5] = v3;
        this.uint8[o1 + 6] = v4;
        this.uint8[o1 + 7] = v5;
        return i;
    }
}

StructArrayLayout2i4ub8.prototype.bytesPerElement = 8;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Float32[2]
 *
 */
class StructArrayLayout2f8 extends StructArray {
    uint8: Uint8Array;
    float32: Float32Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.float32 = new Float32Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1);
    }

    public emplace(i: number, v0: number, v1: number) {
        const o4 = i * 2;
        this.float32[o4 + 0] = v0;
        this.float32[o4 + 1] = v1;
        return i;
    }
}

StructArrayLayout2f8.prototype.bytesPerElement = 8;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Uint16[10]
 *
 */
class StructArrayLayout10ui20 extends StructArray {
    uint8: Uint8Array;
    uint16: Uint16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.uint16 = new Uint16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number, v9: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3, v4, v5, v6, v7, v8, v9);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number, v9: number) {
        const o2 = i * 10;
        this.uint16[o2 + 0] = v0;
        this.uint16[o2 + 1] = v1;
        this.uint16[o2 + 2] = v2;
        this.uint16[o2 + 3] = v3;
        this.uint16[o2 + 4] = v4;
        this.uint16[o2 + 5] = v5;
        this.uint16[o2 + 6] = v6;
        this.uint16[o2 + 7] = v7;
        this.uint16[o2 + 8] = v8;
        this.uint16[o2 + 9] = v9;
        return i;
    }
}

StructArrayLayout10ui20.prototype.bytesPerElement = 20;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Int16[4]
 * [8] - Uint16[4]
 * [16] - Int16[4]
 *
 */
class StructArrayLayout4i4ui4i24 extends StructArray {
    uint8: Uint8Array;
    int16: Int16Array;
    uint16: Uint16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
        this.uint16 = new Uint16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number, v9: number, v10: number, v11: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number, v9: number, v10: number, v11: number) {
        const o2 = i * 12;
        this.int16[o2 + 0] = v0;
        this.int16[o2 + 1] = v1;
        this.int16[o2 + 2] = v2;
        this.int16[o2 + 3] = v3;
        this.uint16[o2 + 4] = v4;
        this.uint16[o2 + 5] = v5;
        this.uint16[o2 + 6] = v6;
        this.uint16[o2 + 7] = v7;
        this.int16[o2 + 8] = v8;
        this.int16[o2 + 9] = v9;
        this.int16[o2 + 10] = v10;
        this.int16[o2 + 11] = v11;
        return i;
    }
}

StructArrayLayout4i4ui4i24.prototype.bytesPerElement = 24;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Float32[3]
 *
 */
class StructArrayLayout3f12 extends StructArray {
    uint8: Uint8Array;
    float32: Float32Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.float32 = new Float32Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2);
    }

    public emplace(i: number, v0: number, v1: number, v2: number) {
        const o4 = i * 3;
        this.float32[o4 + 0] = v0;
        this.float32[o4 + 1] = v1;
        this.float32[o4 + 2] = v2;
        return i;
    }
}

StructArrayLayout3f12.prototype.bytesPerElement = 12;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Uint32[1]
 *
 */
class StructArrayLayout1ul4 extends StructArray {
    uint8: Uint8Array;
    uint32: Uint32Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.uint32 = new Uint32Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0);
    }

    public emplace(i: number, v0: number) {
        const o4 = i * 1;
        this.uint32[o4 + 0] = v0;
        return i;
    }
}

StructArrayLayout1ul4.prototype.bytesPerElement = 4;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Int16[6]
 * [12] - Uint32[1]
 * [16] - Uint16[2]
 *
 */
class StructArrayLayout6i1ul2ui20 extends StructArray {
    uint8: Uint8Array;
    int16: Int16Array;
    uint32: Uint32Array;
    uint16: Uint16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
        this.uint32 = new Uint32Array(this.arrayBuffer);
        this.uint16 = new Uint16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3, v4, v5, v6, v7, v8);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number) {
        const o2 = i * 10;
        const o4 = i * 5;
        this.int16[o2 + 0] = v0;
        this.int16[o2 + 1] = v1;
        this.int16[o2 + 2] = v2;
        this.int16[o2 + 3] = v3;
        this.int16[o2 + 4] = v4;
        this.int16[o2 + 5] = v5;
        this.uint32[o4 + 3] = v6;
        this.uint16[o2 + 8] = v7;
        this.uint16[o2 + 9] = v8;
        return i;
    }
}

StructArrayLayout6i1ul2ui20.prototype.bytesPerElement = 20;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Int16[2]
 * [4] - Int16[2]
 * [8] - Int16[2]
 *
 */
class StructArrayLayout2i2i2i12 extends StructArray {
    uint8: Uint8Array;
    int16: Int16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3, v4, v5);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number, v4: number, v5: number) {
        const o2 = i * 6;
        this.int16[o2 + 0] = v0;
        this.int16[o2 + 1] = v1;
        this.int16[o2 + 2] = v2;
        this.int16[o2 + 3] = v3;
        this.int16[o2 + 4] = v4;
        this.int16[o2 + 5] = v5;
        return i;
    }
}

StructArrayLayout2i2i2i12.prototype.bytesPerElement = 12;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Float32[2]
 * [8] - Float32[1]
 * [12] - Int16[2]
 *
 */
class StructArrayLayout2f1f2i16 extends StructArray {
    uint8: Uint8Array;
    float32: Float32Array;
    int16: Int16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.float32 = new Float32Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number, v4: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3, v4);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number, v4: number) {
        const o4 = i * 4;
        const o2 = i * 8;
        this.float32[o4 + 0] = v0;
        this.float32[o4 + 1] = v1;
        this.float32[o4 + 2] = v2;
        this.int16[o2 + 6] = v3;
        this.int16[o2 + 7] = v4;
        return i;
    }
}

StructArrayLayout2f1f2i16.prototype.bytesPerElement = 16;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Uint8[2]
 * [4] - Float32[2]
 * [12] - Int16[2]
 *
 */
class StructArrayLayout2ub2f2i16 extends StructArray {
    uint8: Uint8Array;
    float32: Float32Array;
    int16: Int16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.float32 = new Float32Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3, v4, v5);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number, v4: number, v5: number) {
        const o1 = i * 16;
        const o4 = i * 4;
        const o2 = i * 8;
        this.uint8[o1 + 0] = v0;
        this.uint8[o1 + 1] = v1;
        this.float32[o4 + 1] = v2;
        this.float32[o4 + 2] = v3;
        this.int16[o2 + 6] = v4;
        this.int16[o2 + 7] = v5;
        return i;
    }
}

StructArrayLayout2ub2f2i16.prototype.bytesPerElement = 16;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Uint16[3]
 *
 */
class StructArrayLayout3ui6 extends StructArray {
    uint8: Uint8Array;
    uint16: Uint16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.uint16 = new Uint16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2);
    }

    public emplace(i: number, v0: number, v1: number, v2: number) {
        const o2 = i * 3;
        this.uint16[o2 + 0] = v0;
        this.uint16[o2 + 1] = v1;
        this.uint16[o2 + 2] = v2;
        return i;
    }
}

StructArrayLayout3ui6.prototype.bytesPerElement = 6;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Int16[2]
 * [4] - Uint16[2]
 * [8] - Uint32[3]
 * [20] - Uint16[3]
 * [28] - Float32[2]
 * [36] - Uint8[3]
 * [40] - Uint32[1]
 * [44] - Int16[1]
 *
 */
class StructArrayLayout2i2ui3ul3ui2f3ub1ul1i48 extends StructArray {
    uint8: Uint8Array;
    int16: Int16Array;
    uint16: Uint16Array;
    uint32: Uint32Array;
    float32: Float32Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
        this.uint16 = new Uint16Array(this.arrayBuffer);
        this.uint32 = new Uint32Array(this.arrayBuffer);
        this.float32 = new Float32Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number, v9: number, v10: number, v11: number, v12: number, v13: number, v14: number, v15: number, v16: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, v16);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number, v9: number, v10: number, v11: number, v12: number, v13: number, v14: number, v15: number, v16: number) {
        const o2 = i * 24;
        const o4 = i * 12;
        const o1 = i * 48;
        this.int16[o2 + 0] = v0;
        this.int16[o2 + 1] = v1;
        this.uint16[o2 + 2] = v2;
        this.uint16[o2 + 3] = v3;
        this.uint32[o4 + 2] = v4;
        this.uint32[o4 + 3] = v5;
        this.uint32[o4 + 4] = v6;
        this.uint16[o2 + 10] = v7;
        this.uint16[o2 + 11] = v8;
        this.uint16[o2 + 12] = v9;
        this.float32[o4 + 7] = v10;
        this.float32[o4 + 8] = v11;
        this.uint8[o1 + 36] = v12;
        this.uint8[o1 + 37] = v13;
        this.uint8[o1 + 38] = v14;
        this.uint32[o4 + 10] = v15;
        this.int16[o2 + 22] = v16;
        return i;
    }
}

StructArrayLayout2i2ui3ul3ui2f3ub1ul1i48.prototype.bytesPerElement = 48;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Int16[8]
 * [16] - Uint16[15]
 * [48] - Uint32[1]
 * [52] - Float32[2]
 * [60] - Uint16[2]
 *
 */
class StructArrayLayout8i15ui1ul2f2ui64 extends StructArray {
    uint8: Uint8Array;
    int16: Int16Array;
    uint16: Uint16Array;
    uint32: Uint32Array;
    float32: Float32Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.int16 = new Int16Array(this.arrayBuffer);
        this.uint16 = new Uint16Array(this.arrayBuffer);
        this.uint32 = new Uint32Array(this.arrayBuffer);
        this.float32 = new Float32Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number, v9: number, v10: number, v11: number, v12: number, v13: number, v14: number, v15: number, v16: number, v17: number, v18: number, v19: number, v20: number, v21: number, v22: number, v23: number, v24: number, v25: number, v26: number, v27: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, v16, v17, v18, v19, v20, v21, v22, v23, v24, v25, v26, v27);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number, v9: number, v10: number, v11: number, v12: number, v13: number, v14: number, v15: number, v16: number, v17: number, v18: number, v19: number, v20: number, v21: number, v22: number, v23: number, v24: number, v25: number, v26: number, v27: number) {
        const o2 = i * 32;
        const o4 = i * 16;
        this.int16[o2 + 0] = v0;
        this.int16[o2 + 1] = v1;
        this.int16[o2 + 2] = v2;
        this.int16[o2 + 3] = v3;
        this.int16[o2 + 4] = v4;
        this.int16[o2 + 5] = v5;
        this.int16[o2 + 6] = v6;
        this.int16[o2 + 7] = v7;
        this.uint16[o2 + 8] = v8;
        this.uint16[o2 + 9] = v9;
        this.uint16[o2 + 10] = v10;
        this.uint16[o2 + 11] = v11;
        this.uint16[o2 + 12] = v12;
        this.uint16[o2 + 13] = v13;
        this.uint16[o2 + 14] = v14;
        this.uint16[o2 + 15] = v15;
        this.uint16[o2 + 16] = v16;
        this.uint16[o2 + 17] = v17;
        this.uint16[o2 + 18] = v18;
        this.uint16[o2 + 19] = v19;
        this.uint16[o2 + 20] = v20;
        this.uint16[o2 + 21] = v21;
        this.uint16[o2 + 22] = v22;
        this.uint32[o4 + 12] = v23;
        this.float32[o4 + 13] = v24;
        this.float32[o4 + 14] = v25;
        this.uint16[o2 + 30] = v26;
        this.uint16[o2 + 31] = v27;
        return i;
    }
}

StructArrayLayout8i15ui1ul2f2ui64.prototype.bytesPerElement = 64;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Float32[1]
 *
 */
class StructArrayLayout1f4 extends StructArray {
    uint8: Uint8Array;
    float32: Float32Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.float32 = new Float32Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0);
    }

    public emplace(i: number, v0: number) {
        const o4 = i * 1;
        this.float32[o4 + 0] = v0;
        return i;
    }
}

StructArrayLayout1f4.prototype.bytesPerElement = 4;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Uint16[1]
 * [4] - Float32[2]
 *
 */
class StructArrayLayout1ui2f12 extends StructArray {
    uint8: Uint8Array;
    uint16: Uint16Array;
    float32: Float32Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.uint16 = new Uint16Array(this.arrayBuffer);
        this.float32 = new Float32Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2);
    }

    public emplace(i: number, v0: number, v1: number, v2: number) {
        const o2 = i * 6;
        const o4 = i * 3;
        this.uint16[o2 + 0] = v0;
        this.float32[o4 + 1] = v1;
        this.float32[o4 + 2] = v2;
        return i;
    }
}

StructArrayLayout1ui2f12.prototype.bytesPerElement = 12;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Uint32[1]
 * [4] - Uint16[2]
 *
 */
class StructArrayLayout1ul2ui8 extends StructArray {
    uint8: Uint8Array;
    uint32: Uint32Array;
    uint16: Uint16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.uint32 = new Uint32Array(this.arrayBuffer);
        this.uint16 = new Uint16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2);
    }

    public emplace(i: number, v0: number, v1: number, v2: number) {
        const o4 = i * 2;
        const o2 = i * 4;
        this.uint32[o4 + 0] = v0;
        this.uint16[o2 + 2] = v1;
        this.uint16[o2 + 3] = v2;
        return i;
    }
}

StructArrayLayout1ul2ui8.prototype.bytesPerElement = 8;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Uint16[2]
 *
 */
class StructArrayLayout2ui4 extends StructArray {
    uint8: Uint8Array;
    uint16: Uint16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.uint16 = new Uint16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1);
    }

    public emplace(i: number, v0: number, v1: number) {
        const o2 = i * 2;
        this.uint16[o2 + 0] = v0;
        this.uint16[o2 + 1] = v1;
        return i;
    }
}

StructArrayLayout2ui4.prototype.bytesPerElement = 4;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Uint16[1]
 *
 */
class StructArrayLayout1ui2 extends StructArray {
    uint8: Uint8Array;
    uint16: Uint16Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.uint16 = new Uint16Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0);
    }

    public emplace(i: number, v0: number) {
        const o2 = i * 1;
        this.uint16[o2 + 0] = v0;
        return i;
    }
}

StructArrayLayout1ui2.prototype.bytesPerElement = 2;

/**
 * @internal
 * Implementation of the StructArray layout:
 * [0] - Float32[4]
 *
 */
class StructArrayLayout4f16 extends StructArray {
    uint8: Uint8Array;
    float32: Float32Array;

    _refreshViews() {
        this.uint8 = new Uint8Array(this.arrayBuffer);
        this.float32 = new Float32Array(this.arrayBuffer);
    }

    public emplaceBack(v0: number, v1: number, v2: number, v3: number) {
        const i = this.length;
        this.resize(i + 1);
        return this.emplace(i, v0, v1, v2, v3);
    }

    public emplace(i: number, v0: number, v1: number, v2: number, v3: number) {
        const o4 = i * 4;
        this.float32[o4 + 0] = v0;
        this.float32[o4 + 1] = v1;
        this.float32[o4 + 2] = v2;
        this.float32[o4 + 3] = v3;
        return i;
    }
}

StructArrayLayout4f16.prototype.bytesPerElement = 16;

/** @internal */
class CollisionBoxStruct extends Struct {
    _structArray: CollisionBoxArray;
    get anchorPointX() { return this._structArray.int16[this._pos2 + 0]; }
    get anchorPointY() { return this._structArray.int16[this._pos2 + 1]; }
    get x1() { return this._structArray.int16[this._pos2 + 2]; }
    get y1() { return this._structArray.int16[this._pos2 + 3]; }
    get x2() { return this._structArray.int16[this._pos2 + 4]; }
    get y2() { return this._structArray.int16[this._pos2 + 5]; }
    get featureIndex() { return this._structArray.uint32[this._pos4 + 3]; }
    get sourceLayerIndex() { return this._structArray.uint16[this._pos2 + 8]; }
    get bucketIndex() { return this._structArray.uint16[this._pos2 + 9]; }
    get anchorPoint() { return new Point(this.anchorPointX, this.anchorPointY); }
}

CollisionBoxStruct.prototype.size = 20;

export type CollisionBox = CollisionBoxStruct;

/** @internal */
export class CollisionBoxArray extends StructArrayLayout6i1ul2ui20 {
    /**
     * Return the CollisionBoxStruct at the given location in the array.
     * @param index The index of the element.
     */
    get(index: number): CollisionBoxStruct {
        return new CollisionBoxStruct(this, index);
    }
}


/** @internal */
class PlacedSymbolStruct extends Struct {
    _structArray: PlacedSymbolArray;
    get anchorX() { return this._structArray.int16[this._pos2 + 0]; }
    get anchorY() { return this._structArray.int16[this._pos2 + 1]; }
    get glyphStartIndex() { return this._structArray.uint16[this._pos2 + 2]; }
    get numGlyphs() { return this._structArray.uint16[this._pos2 + 3]; }
    get vertexStartIndex() { return this._structArray.uint32[this._pos4 + 2]; }
    get lineStartIndex() { return this._structArray.uint32[this._pos4 + 3]; }
    get lineLength() { return this._structArray.uint32[this._pos4 + 4]; }
    get segment() { return this._structArray.uint16[this._pos2 + 10]; }
    get lowerSize() { return this._structArray.uint16[this._pos2 + 11]; }
    get upperSize() { return this._structArray.uint16[this._pos2 + 12]; }
    get lineOffsetX() { return this._structArray.float32[this._pos4 + 7]; }
    get lineOffsetY() { return this._structArray.float32[this._pos4 + 8]; }
    get writingMode() { return this._structArray.uint8[this._pos1 + 36]; }
    get placedOrientation() { return this._structArray.uint8[this._pos1 + 37]; }
    set placedOrientation(x: number) { this._structArray.uint8[this._pos1 + 37] = x; }
    get hidden() { return this._structArray.uint8[this._pos1 + 38]; }
    set hidden(x: number) { this._structArray.uint8[this._pos1 + 38] = x; }
    get crossTileID() { return this._structArray.uint32[this._pos4 + 10]; }
    set crossTileID(x: number) { this._structArray.uint32[this._pos4 + 10] = x; }
    get associatedIconIndex() { return this._structArray.int16[this._pos2 + 22]; }
}

PlacedSymbolStruct.prototype.size = 48;

export type PlacedSymbol = PlacedSymbolStruct;

/** @internal */
export class PlacedSymbolArray extends StructArrayLayout2i2ui3ul3ui2f3ub1ul1i48 {
    /**
     * Return the PlacedSymbolStruct at the given location in the array.
     * @param index The index of the element.
     */
    get(index: number): PlacedSymbolStruct {
        return new PlacedSymbolStruct(this, index);
    }
}


/** @internal */
class SymbolInstanceStruct extends Struct {
    _structArray: SymbolInstanceArray;
    get anchorX() { return this._structArray.int16[this._pos2 + 0]; }
    get anchorY() { return this._structArray.int16[this._pos2 + 1]; }
    get rightJustifiedTextSymbolIndex() { return this._structArray.int16[this._pos2 + 2]; }
    get centerJustifiedTextSymbolIndex() { return this._structArray.int16[this._pos2 + 3]; }
    get leftJustifiedTextSymbolIndex() { return this._structArray.int16[this._pos2 + 4]; }
    get verticalPlacedTextSymbolIndex() { return this._structArray.int16[this._pos2 + 5]; }
    get placedIconSymbolIndex() { return this._structArray.int16[this._pos2 + 6]; }
    get verticalPlacedIconSymbolIndex() { return this._structArray.int16[this._pos2 + 7]; }
    get key() { return this._structArray.uint16[this._pos2 + 8]; }
    get textBoxStartIndex() { return this._structArray.uint16[this._pos2 + 9]; }
    get textBoxEndIndex() { return this._structArray.uint16[this._pos2 + 10]; }
    get verticalTextBoxStartIndex() { return this._structArray.uint16[this._pos2 + 11]; }
    get verticalTextBoxEndIndex() { return this._structArray.uint16[this._pos2 + 12]; }
    get iconBoxStartIndex() { return this._structArray.uint16[this._pos2 + 13]; }
    get iconBoxEndIndex() { return this._structArray.uint16[this._pos2 + 14]; }
    get verticalIconBoxStartIndex() { return this._structArray.uint16[this._pos2 + 15]; }
    get verticalIconBoxEndIndex() { return this._structArray.uint16[this._pos2 + 16]; }
    get featureIndex() { return this._structArray.uint16[this._pos2 + 17]; }
    get numHorizontalGlyphVertices() { return this._structArray.uint16[this._pos2 + 18]; }
    get numVerticalGlyphVertices() { return this._structArray.uint16[this._pos2 + 19]; }
    get numIconVertices() { return this._structArray.uint16[this._pos2 + 20]; }
    get numVerticalIconVertices() { return this._structArray.uint16[this._pos2 + 21]; }
    get useRuntimeCollisionCircles() { return this._structArray.uint16[this._pos2 + 22]; }
    get crossTileID() { return this._structArray.uint32[this._pos4 + 12]; }
    set crossTileID(x: number) { this._structArray.uint32[this._pos4 + 12] = x; }
    get textBoxScale() { return this._structArray.float32[this._pos4 + 13]; }
    get collisionCircleDiameter() { return this._structArray.float32[this._pos4 + 14]; }
    get textAnchorOffsetStartIndex() { return this._structArray.uint16[this._pos2 + 30]; }
    get textAnchorOffsetEndIndex() { return this._structArray.uint16[this._pos2 + 31]; }
}

SymbolInstanceStruct.prototype.size = 64;

export type SymbolInstance = SymbolInstanceStruct;

/** @internal */
export class SymbolInstanceArray extends StructArrayLayout8i15ui1ul2f2ui64 {
    /**
     * Return the SymbolInstanceStruct at the given location in the array.
     * @param index The index of the element.
     */
    get(index: number): SymbolInstanceStruct {
        return new SymbolInstanceStruct(this, index);
    }
}


/** @internal */
export class GlyphOffsetArray extends StructArrayLayout1f4 {
    getoffsetX(index: number) { return this.float32[index * 1 + 0]; }
}


/** @internal */
export class SymbolLineVertexArray extends StructArrayLayout3i6 {
    getx(index: number) { return this.int16[index * 3 + 0]; }
    gety(index: number) { return this.int16[index * 3 + 1]; }
    gettileUnitDistanceFromAnchor(index: number) { return this.int16[index * 3 + 2]; }
}


/** @internal */
class TextAnchorOffsetStruct extends Struct {
    _structArray: TextAnchorOffsetArray;
    get textAnchor() { return this._structArray.uint16[this._pos2 + 0]; }
    get textOffset0() { return this._structArray.float32[this._pos4 + 1]; }
    get textOffset1() { return this._structArray.float32[this._pos4 + 2]; }
}

TextAnchorOffsetStruct.prototype.size = 12;

export type TextAnchorOffset = TextAnchorOffsetStruct;

/** @internal */
export class TextAnchorOffsetArray extends StructArrayLayout1ui2f12 {
    /**
     * Return the TextAnchorOffsetStruct at the given location in the array.
     * @param index The index of the element.
     */
    get(index: number): TextAnchorOffsetStruct {
        return new TextAnchorOffsetStruct(this, index);
    }
}


/** @internal */
class FeatureIndexStruct extends Struct {
    _structArray: FeatureIndexArray;
    get featureIndex() { return this._structArray.uint32[this._pos4 + 0]; }
    get sourceLayerIndex() { return this._structArray.uint16[this._pos2 + 2]; }
    get bucketIndex() { return this._structArray.uint16[this._pos2 + 3]; }
}

FeatureIndexStruct.prototype.size = 8;

export type FeatureIndex = FeatureIndexStruct;

/** @internal */
export class FeatureIndexArray extends StructArrayLayout1ul2ui8 {
    /**
     * Return the FeatureIndexStruct at the given location in the array.
     * @param index The index of the element.
     */
    get(index: number): FeatureIndexStruct {
        return new FeatureIndexStruct(this, index);
    }
}


export class PosArray extends StructArrayLayout2i4 {}
export class Pos3dArray extends StructArrayLayout3i6 {}
export class RasterBoundsArray extends StructArrayLayout4i8 {}
export class CircleLayoutArray extends StructArrayLayout2i4 {}
export class FillLayoutArray extends StructArrayLayout2i4 {}
export class FillExtrusionLayoutArray extends StructArrayLayout2i4i12 {}
export class HeatmapLayoutArray extends StructArrayLayout2i4 {}
export class LineLayoutArray extends StructArrayLayout2i4ub8 {}
export class LineExtLayoutArray extends StructArrayLayout2f8 {}
export class PatternLayoutArray extends StructArrayLayout10ui20 {}
export class SymbolLayoutArray extends StructArrayLayout4i4ui4i24 {}
export class SymbolDynamicLayoutArray extends StructArrayLayout3f12 {}
export class SymbolOpacityArray extends StructArrayLayout1ul4 {}
export class CollisionBoxLayoutArray extends StructArrayLayout2i2i2i12 {}
export class CollisionCircleLayoutArray extends StructArrayLayout2f1f2i16 {}
export class CollisionVertexArray extends StructArrayLayout2ub2f2i16 {}
export class QuadTriangleArray extends StructArrayLayout3ui6 {}
export class TriangleIndexArray extends StructArrayLayout3ui6 {}
export class LineIndexArray extends StructArrayLayout2ui4 {}
export class LineStripIndexArray extends StructArrayLayout1ui2 {}
export {
    StructArrayLayout2i4,
    StructArrayLayout3i6,
    StructArrayLayout4i8,
    StructArrayLayout2i4i12,
    StructArrayLayout2i4ub8,
    StructArrayLayout2f8,
    StructArrayLayout10ui20,
    StructArrayLayout4i4ui4i24,
    StructArrayLayout3f12,
    StructArrayLayout1ul4,
    StructArrayLayout6i1ul2ui20,
    StructArrayLayout2i2i2i12,
    StructArrayLayout2f1f2i16,
    StructArrayLayout2ub2f2i16,
    StructArrayLayout3ui6,
    StructArrayLayout2i2ui3ul3ui2f3ub1ul1i48,
    StructArrayLayout8i15ui1ul2f2ui64,
    StructArrayLayout1f4,
    StructArrayLayout1ui2f12,
    StructArrayLayout1ul2ui8,
    StructArrayLayout2ui4,
    StructArrayLayout1ui2,
    StructArrayLayout4f16
};
