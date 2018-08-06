import { parseMultipartHTTP } from './parseMultipartHTTP';

// recursive function to apply the patch to the previous response
function applyPatch(previousResponse, patchPath, patchData) {
    const [nextPath, ...rest] = patchPath;
    if (rest.length === 0) {
        return {
            ...previousResponse,
            [nextPath]: patchData,
        };
    }
    return {
        ...previousResponse,
        [nextPath]: applyPatch(previousResponse[nextPath], rest, patchData),
    };
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
    this.chunkBuffer = '';
    this.processedChunks = 0;
}

PatchResolver.prototype.handleChunk = function(data) {
    const results = parseMultipartHTTP(this.chunkBuffer + data);
    if (results === null) {
        // The part is not complete yet, add it to the buffer
        // and wait for the next chunk to arrive
        this.chunkBuffer += data;
    } else {
        this.chunkBuffer = ''; // Reset
        for (const part of results) {
            if (this.processedChunks === 0) {
                this.previousResponse = part;
                this.onResponse(this.previousResponse);
            } else {
                if (!(part.path && part.data)) {
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
    }
};
