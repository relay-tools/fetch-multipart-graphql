import { parseMultipartHttp } from './parseMultipartHttp';

export function PatchResolver({ onResponse, boundary }) {
    this.boundary = boundary || '-';
    this.onResponse = onResponse;
    this.chunkBuffer = '';
    this.isPreamble = true;
}

PatchResolver.prototype.handleChunk = function (data) {
    this.chunkBuffer += data;
    const { newBuffer, parts, isPreamble } = parseMultipartHttp(this.chunkBuffer, this.boundary, [], this.isPreamble);
    this.isPreamble = isPreamble;
    this.chunkBuffer = newBuffer;
    if (parts.length) {
        this.onResponse(parts);
    }
};
