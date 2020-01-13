import { parseMultipartHttp } from './parseMultipartHttp';

export function PatchResolver({ onResponse }) {
    this.onResponse = onResponse;
    this.processedChunks = 0;
    this.chunkBuffer = '';
}

PatchResolver.prototype.handleChunk = function(data) {
    this.chunkBuffer += data;
    const { newBuffer, parts } = parseMultipartHttp(this.chunkBuffer);
    this.chunkBuffer = newBuffer;
    if (parts.length) {
        this.onResponse(parts);
    }
};
