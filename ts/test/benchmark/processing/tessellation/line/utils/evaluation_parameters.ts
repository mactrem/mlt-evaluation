import {ZoomHistory} from './zoom_history';
import {isStringInSupportedScript} from './script_detection';
import {rtlWorkerPlugin} from './rtl_text_plugin_worker';

import type {TransitionSpecification} from '@maplibre/maplibre-gl-style-spec';

export type CrossfadeParameters = {
    fromScale: number;
    toScale: number;
    t: number;
};

/**
 * @internal
 * A parameter that can be evaluated to a value
 */
export class EvaluationParameters {
    zoom: number;
    now: number;
    fadeDuration: number;
    zoomHistory: ZoomHistory;
    transition: TransitionSpecification;

    // "options" may also be another EvaluationParameters to copy, see CrossFadedProperty.possiblyEvaluate
    constructor(zoom: number, options?: any) {
        this.zoom = zoom;

        if (options) {
            this.now = options.now;
            this.fadeDuration = options.fadeDuration;
            this.zoomHistory = options.zoomHistory;
            this.transition = options.transition;
        } else {
            this.now = 0;
            this.fadeDuration = 0;
            this.zoomHistory = new ZoomHistory();
            this.transition = {};
        }
    }

    isSupportedScript(str: string): boolean {
        return isStringInSupportedScript(str, rtlWorkerPlugin.getRTLTextPluginStatus() === 'loaded');
    }

    crossFadingFactor() {
        if (this.fadeDuration === 0) {
            return 1;
        } else {
            return Math.min((this.now - this.zoomHistory.lastIntegerZoomTime) / this.fadeDuration, 1);
        }
    }

    getCrossfadeParameters(): CrossfadeParameters {
        const z = this.zoom;
        const fraction = z - Math.floor(z);
        const t = this.crossFadingFactor();

        return z > this.zoomHistory.lastIntegerZoom ?
            {fromScale: 2, toScale: 1, t: fraction + (1 - fraction) * t} :
            {fromScale: 0.5, toScale: 1, t: 1 - (1 - t) * fraction};
    }
}
