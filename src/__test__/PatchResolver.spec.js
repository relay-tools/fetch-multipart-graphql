import { PatchResolver } from '../PatchResolver';
import { TextEncoder, TextDecoder } from 'util';
// polyfill TextDecoder/Encoder for node
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

function getMultiPartResponse(data) {
    const json = JSON.stringify(data);
    const chunk = Buffer.from(json, 'utf8');

    return [
        '',
        '---',
        'Content-Type: application/json',
        `Content-Length: ${String(chunk.length)}`,
        '',
        json,
        '',
    ].join('\r\n');
}

const chunk1Data = {
    data: {
        viewer: {
            currencies: null,
            user: {
                profile: null,
                items: { edges: [{ node: { isFavorite: null } }, { node: { isFavorite: null } }] },
            },
        },
    },
};
const chunk1 = getMultiPartResponse(chunk1Data);

const chunk2Data = {
    path: ['viewer', 'currencies'],
    data: ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'CHF', '😂'], // test unicode
    errors: [{ message: 'Not So Bad Error' }],
};
const chunk2 = getMultiPartResponse(chunk2Data);

const chunk3Data = { path: ['viewer', 'user', 'profile'], data: { displayName: 'Steven Seagal' } };
const chunk3 = getMultiPartResponse(chunk3Data);

const chunk4Data = {
    data: false,
    path: ['viewer', 'user', 'items', 'edges', 1, 'node', 'isFavorite'],
};
const chunk4 = getMultiPartResponse(chunk4Data);

describe('PathResolver', function() {
    it('should work on each chunk', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        resolver.handleChunk(chunk1);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk1Data]);

        onResponse.mockClear();
        resolver.handleChunk(chunk2);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk2Data]);

        onResponse.mockClear();
        resolver.handleChunk(chunk3);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk3Data]);

        onResponse.mockClear();
        resolver.handleChunk(chunk4);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk4Data]);
    });

    it('should work when chunks are split', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        const chunk1a = chunk1.substr(0, 35);
        const chunk1b = chunk1.substr(35, 80);
        const chunk1c = chunk1.substr(35 + 80);

        resolver.handleChunk(chunk1a);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk1b);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk1c);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk1Data]);
        onResponse.mockClear();

        const chunk2a = chunk2.substr(0, 35);
        const chunk2b = chunk2.substr(35);

        resolver.handleChunk(chunk2a);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk2b);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk2Data]);
        onResponse.mockClear();

        const chunk3a = chunk3.substr(0, 10);
        const chunk3b = chunk3.substr(11, 20);
        const chunk3c = chunk3.substr(11 + 20);

        resolver.handleChunk(chunk3a);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk3b);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk3c);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk3Data]);
    });

    it('should work when chunks are combined', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        resolver.handleChunk(chunk1 + chunk2);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk1Data, chunk2Data]);
    });

    it('should work when chunks are combined and split', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        const chunk3a = chunk3.substr(0, 10);
        const chunk3b = chunk3.substr(11, 20);
        const chunk3c = chunk3.substr(11 + 20);

        resolver.handleChunk(chunk1 + chunk2 + chunk3a);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk1Data, chunk2Data]);
        onResponse.mockClear();

        resolver.handleChunk(chunk3b);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk3c);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk3Data]);
    });

    it('should work when chunks are combined across boundaries', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        const chunk2a = chunk2.substring(0, 35);
        const chunk2b = chunk2.substring(35);

        resolver.handleChunk(chunk1 + chunk2a);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk1Data]);
        onResponse.mockClear();
        resolver.handleChunk(chunk2b);
        expect(onResponse.mock.calls[0][0]).toEqual([chunk2Data]);
    });
});
