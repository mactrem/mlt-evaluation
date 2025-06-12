import fs from "fs";
import Pbf from "pbf";
import path from "node:path";
import Path from "path";
import zlib from "zlib";
import {decodeTile, FeatureTable, TileSetMetadata} from "../../src";
import OptimizedVectorTile from "./optimized-vector-tile/vectortile";
import Point from "./point";

type Feature = {
    id: number;
    type: 0 | 1 | 2 | 3;
    geometry: Array<Array<Point>>;
    properties: any;
};

type MvtLayer = {
    version: number;
    name: string;
    extent: number;
    features: Feature[];
};

export function getTiles(
    mltDirectory: string,
    mvtDirectory?: string,
): [TileSetMetadata, Buffer[], Buffer[], Buffer, Buffer[]] {
    const mvtFiles = [];
    const compressedMvtFiles = [];
    const mltFiles = fs
        .readdirSync(mltDirectory)
        .filter((file) => path.parse(file).ext === ".mlt")
        .map((file) => path.parse(file).name)
        .map((fileName) => {
            const mltFileName = `${fileName}.mlt`;
            const mltPath = Path.join(mltDirectory, mltFileName);
            const mlt = fs.readFileSync(mltPath);

            if (mvtDirectory) {
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

export function getAllMvtLayers(mvts: Buffer[], sort = false): MvtLayer[] {
    const tiles = [];

    for (const encodedMvt of mvts) {
        const buf = new Pbf(encodedMvt);
        const vt = new OptimizedVectorTile(buf);
        const layers = [];
        for (const id in vt.layers) {
            const features = [];
            const mvtLayer = vt.layers[id];
            for (let i = 0; i < mvtLayer.length; i++) {
                const feature = mvtLayer.feature(i);
                features.push({
                    id: feature.id,
                    type: feature.type,
                    //geometry: feature.geometry,
                    /* Transform the points into lightweight objects for fair benchmarking */
                    geometry: transformGeometry(feature.geometry),
                    properties: feature.properties,
                });
            }
            const layer = {version: mvtLayer.version, name: mvtLayer.name, extent: mvtLayer.extent, features};
            layers.push(layer);
        }
        tiles.push(...layers);
    }

    return sort? tiles.sort((a, b) => a.name.localeCompare(b.name)) : tiles;
}

/* Transform the points into lightweight objects for fair benchmarking */
function transformGeometry(geometry: Array<Array<Point>>){
    const transformedGeometry = [];
    for(const line of geometry){
        const transformedLine = [];
        for (const vertex of line) {
            const x = vertex.x;
            const y = vertex.y;
            const p = {x, y};
            transformedLine.push(p);
        }
        transformedGeometry.push(transformedLine);
    }
    return transformedGeometry;
}

export function getAllMltFeatureTables(metadata: TileSetMetadata, mltFiles: Buffer[], sort = false): FeatureTable[] {
    const decodeTiles = [];
    for (const mlt of mltFiles) {
        const decodedMlt = decodeTile(mlt, metadata, undefined, undefined, true);
        decodeTiles.push(...decodedMlt);
    }
    return sort? decodeTiles.sort((a, b) => a.name.localeCompare(b.name)) : decodeTiles;
}