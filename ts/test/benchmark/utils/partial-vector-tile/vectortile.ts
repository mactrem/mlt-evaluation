'use strict';

import VectorTileLayerPartial from "./vectortilelayer";

export default function VectorTilePartial(pbf, layerNames, end?) {
    pbf.layerNames = layerNames;
    this.layers = pbf.readFields(readTilePartial, {}, end);
}

function readTilePartial(tag, layers, pbf) {
    if (tag === 3) {
        var layer = new VectorTileLayerPartial(pbf, pbf.readVarint() + pbf.pos);
        if (layer.length) layers[layer.name] = layer;
    }
}

