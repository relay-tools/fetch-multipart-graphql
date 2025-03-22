import { PatchResolver } from '../PatchResolver';
import { TextEncoder, TextDecoder } from 'util';
// polyfill TextDecoder/Encoder for node
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

function getMultiPartResponse(data, boundary) {
    const json = JSON.stringify(data);

    return ['Content-Type: application/json', '', json, `--${boundary}\r\n`].join('\r\n');
}

function assertChunksRecieved(mockCall, chunks) {
    const nonIncrementalChunks = chunks.flatMap((chunk) =>
        chunk.incremental ? chunk.incremental : chunk
    );
    expect(mockCall).toEqual(nonIncrementalChunks);
}

describe('PathResolver', function () {
    for (const boundary of ['-', 'gc0p4Jq0M2Yt08jU534c0p']) {
        describe(`boundary ${boundary}`, () => {
            const chunk1Data = {
                data: {
                    viewer: {
                        currencies: null,
                        user: {
                            profile: null,
                            items: {
                                edges: [
                                    { node: { isFavorite: null } },
                                    { node: { isFavorite: null } },
                                ],
                            },
                        },
                    },
                },
            };
            const chunk1 = getMultiPartResponse(chunk1Data, boundary);

            const chunk2Data = {
                incremental: [
                    {
                        path: ['viewer', 'currencies'],
                        data: ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'CHF', '😂'], // test unicode
                        errors: [{ message: 'Not So Bad Error' }],
                    },
                ],
            };
            const chunk2 = getMultiPartResponse(chunk2Data, boundary);

            const chunk3Data = {
                incremental: [
                    {
                        path: ['viewer', 'user', 'profile'],
                        data: { displayName: 'Steven Seagal' },
                    },
                ],
            };
            const chunk3 = getMultiPartResponse(chunk3Data, boundary);

            const chunk4Data = {
                incremental: [
                    {
                        data: false,
                        path: ['viewer', 'user', 'items', 'edges', 1, 'node', 'isFavorite'],
                    },
                ],
            };
            const chunk4 = getMultiPartResponse(chunk4Data, boundary);
            const chunk5Data = {
                incremental: [
                    {
                        data: true,
                        path: ['viewer', 'user', 'items', 'edges', 2, 'node', 'isFavorite'],
                    },
                    {
                        data: false,
                        path: ['viewer', 'user', 'items', 'edges', 3, 'node', 'isFavorite'],
                    },
                ],
            };
            const chunk5 = getMultiPartResponse(chunk5Data, boundary);
            it('should work on each chunk', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                resolver.handleChunk(`\r\n--${boundary}\r\n`);

                expect(onResponse).not.toHaveBeenCalled();

                resolver.handleChunk(chunk1);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk1Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk2);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk2Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk3);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk3Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk4);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk4Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk5);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk5Data]);
            });

            it('should work when chunks are split', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                const chunk1a = chunk1.substr(0, 35);
                const chunk1b = chunk1.substr(35, 80);
                const chunk1c = chunk1.substr(35 + 80);

                resolver.handleChunk(`\r\n--${boundary}\r\n`);

                expect(onResponse).not.toHaveBeenCalled();

                resolver.handleChunk(chunk1a);
                expect(onResponse).not.toHaveBeenCalled();
                resolver.handleChunk(chunk1b);
                expect(onResponse).not.toHaveBeenCalled();
                resolver.handleChunk(chunk1c);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk1Data]);
                onResponse.mockClear();

                const chunk2a = chunk2.substr(0, 35);
                const chunk2b = chunk2.substr(35);

                resolver.handleChunk(chunk2a);
                expect(onResponse).not.toHaveBeenCalled();
                resolver.handleChunk(chunk2b);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk2Data]);
                onResponse.mockClear();

                const chunk3a = chunk3.substr(0, 10);
                const chunk3b = chunk3.substr(10, 20);
                const chunk3c = chunk3.substr(10 + 20);

                resolver.handleChunk(chunk3a);
                expect(onResponse).not.toHaveBeenCalled();
                resolver.handleChunk(chunk3b);
                expect(onResponse).not.toHaveBeenCalled();
                resolver.handleChunk(chunk3c);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk3Data]);
            });

            it('should work when chunks are combined', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                resolver.handleChunk(`\r\n--${boundary}\r\n`);

                expect(onResponse).not.toHaveBeenCalled();

                resolver.handleChunk(chunk1 + chunk2);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk1Data, chunk2Data]);
            });

            it('should work when chunks are combined and split', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                const boundaryChunk = `\r\n--${boundary}\r\n`;

                const chunk3a = chunk3.substr(0, 11);
                const chunk3b = chunk3.substr(11, 20);
                const chunk3c = chunk3.substr(11 + 20);

                const boundary1 = boundaryChunk.substr(0, 5);
                const boundary2 = boundaryChunk.substr(5, 7);
                const boundary3 = boundaryChunk.substr(5 + 7);

                resolver.handleChunk(boundary1);
                resolver.handleChunk(boundary2);
                resolver.handleChunk(boundary3);

                expect(onResponse).not.toHaveBeenCalled();

                resolver.handleChunk(chunk1 + chunk2 + chunk3a);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk1Data, chunk2Data]);
                onResponse.mockClear();

                resolver.handleChunk(chunk3b);
                expect(onResponse).not.toHaveBeenCalled();
                resolver.handleChunk(chunk3c);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk3Data]);
            });

            it('should work when chunks are combined across boundaries', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                resolver.handleChunk(`\r\n--${boundary}\r\n`);

                expect(onResponse).not.toHaveBeenCalled();

                const chunk2a = chunk2.substring(0, 35);
                const chunk2b = chunk2.substring(35);

                resolver.handleChunk(chunk1 + chunk2a);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk1Data]);
                onResponse.mockClear();
                resolver.handleChunk(chunk2b);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk2Data]);
            });
            it('should work when final chunk ends with terminating boundary', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                resolver.handleChunk(`\r\n--${boundary}\r\n`);

                expect(onResponse).not.toHaveBeenCalled();

                resolver.handleChunk(chunk1);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk1Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk2);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk2Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk3);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk3Data]);

                onResponse.mockClear();
                const chunk4FinalBoundary = getMultiPartResponse(chunk4Data, `${boundary}--`);
                resolver.handleChunk(chunk4FinalBoundary);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk4Data]);
            });

            it('should work with preamble', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                resolver.handleChunk(`This is some preamble data that should be ignored\r\n`);
                resolver.handleChunk(`\r\n--${boundary}\r\n`);

                expect(onResponse).not.toHaveBeenCalled();

                resolver.handleChunk(chunk1);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk1Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk2);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk2Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk3);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk3Data]);

                onResponse.mockClear();
                const chunk4FinalBoundary = getMultiPartResponse(chunk4Data, `${boundary}--`);
                resolver.handleChunk(chunk4FinalBoundary);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk4Data]);
            });
            it('should work with epilogue', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                resolver.handleChunk(`\r\n--${boundary}\r\n`);

                expect(onResponse).not.toHaveBeenCalled();

                resolver.handleChunk(chunk1);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk1Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk2);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk2Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk3);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk3Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk4);
                resolver.handleChunk(`This is some epilogue data that should be ignored\r\n`);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk4Data]);
            });
            it('should work with epilogue after chunk with terminating boundary', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                resolver.handleChunk(`\r\n--${boundary}\r\n`);

                expect(onResponse).not.toHaveBeenCalled();

                resolver.handleChunk(chunk1);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk1Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk2);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk2Data]);

                onResponse.mockClear();
                resolver.handleChunk(chunk3);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk3Data]);

                onResponse.mockClear();
                const chunk4FinalBoundary = getMultiPartResponse(chunk4Data, `${boundary}--`);
                resolver.handleChunk(chunk4FinalBoundary);
                resolver.handleChunk(`This is some epilogue data that should be ignored\r\n`);
                assertChunksRecieved(onResponse.mock.calls[0][0], [chunk4Data]);
            });
        });
    }
});
