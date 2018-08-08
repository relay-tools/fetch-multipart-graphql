import { parseMultipartHttp } from './parseMultipartHttp';

function insertPatch(obj, path, data) {
    if (Array.isArray(obj) && typeof path === 'number') {
        return [].concat(obj.slice(0, path), [data], obj.slice(path + 1));
    } else {
        return {
            ...obj,
            [path]: data,
        };
    }
}

// recursive function to apply the patch to the previous response
function applyPatch(previousResponse, patchPath, patchData) {
    const [nextPath, ...rest] = patchPath;
    if (rest.length === 0) {
        return insertPatch(previousResponse, nextPath, patchData);
    }
    return insertPatch(
        previousResponse,
        nextPath,
        applyPatch(previousResponse[nextPath], rest, patchData)
    );
}

function mergeErrors(previousErrors, patchErrors) {
    if (previousErrors && patchErrors) {
        return [].concat(previousErrors, patchErrors);
    } else if (previousErrors) {
        return previousErrors;
    } else if (patchErrors) {
        return patchErrors;
    }
    return undefined;
}

export function PatchResolver({ onResponse }) {
    this.onResponse = onResponse;
    this.previousResponse = null;
    this.processedChunks = 0;
    this.chunkBuffer = '';
}

PatchResolver.prototype.handleChunk = function(data) {
    this.chunkBuffer += data;
    const { newBuffer, parts } = parseMultipartHttp(this.chunkBuffer);
    this.chunkBuffer = newBuffer;
    for (const part of parts) {
        if (this.processedChunks === 0) {
            this.previousResponse = part;
            this.onResponse(this.previousResponse);
        } else {
            if (!(Array.isArray(part.path) && typeof part.data !== 'undefined')) {
                throw new Error('invalid patch format ' + JSON.stringify(part, null, 2));
            }
            this.previousResponse = {
                ...this.previousResponse,
                data: applyPatch(this.previousResponse.data, part.path, part.data),
                errors: mergeErrors(this.previousResponse.errors, part.errors),
            };

            this.onResponse(this.previousResponse);
        }
        this.processedChunks += 1;
    }
};
