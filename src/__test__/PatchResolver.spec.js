import { PatchResolver } from '../PatchResolver';
import { TextEncoder, TextDecoder } from 'util';
// polyfill TextDecoder/Encoder for node
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

function getMultiPartResponse(data, boundary) {
    const json = JSON.stringify(data);

    return [
        'Content-Type: application/json',
        '',
        json,
        `--${boundary}\r\n`,
    ].join('\r\n');
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
                path: ['viewer', 'currencies'],
                data: ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'CHF', '😂'], // test unicode
                errors: [{ message: 'Not So Bad Error' }],
            };
            const chunk2 = getMultiPartResponse(chunk2Data, boundary);

            const chunk3Data = {
                path: ['viewer', 'user', 'profile'],
                data: { displayName: 'Steven Seagal' },
            };
            const chunk3 = getMultiPartResponse(chunk3Data, boundary);

            const chunk4Data = {
                data: false,
                path: ['viewer', 'user', 'items', 'edges', 1, 'node', 'isFavorite'],
            };
            const chunk4 = getMultiPartResponse(chunk4Data, boundary);
            it('should work on each chunk', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                resolver.handleChunk(`\r\n--${boundary}\r\n`);

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
                const chunk3b = chunk3.substr(10, 20);
                const chunk3c = chunk3.substr(10 + 20);

                resolver.handleChunk(chunk3a);
                expect(onResponse).not.toHaveBeenCalled();
                resolver.handleChunk(chunk3b);
                expect(onResponse).not.toHaveBeenCalled();
                resolver.handleChunk(chunk3c);
                expect(onResponse.mock.calls[0][0]).toEqual([chunk3Data]);
            });

            it('should work when chunks are combined', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                resolver.handleChunk(`\r\n--${boundary}\r\n`);

                resolver.handleChunk(chunk1 + chunk2);
                expect(onResponse.mock.calls[0][0]).toEqual([chunk1Data, chunk2Data]);
            });

            it('should work when chunks are combined and split', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                const chunk3a = chunk3.substr(0, 11);
                const chunk3b = chunk3.substr(11, 20);
                const chunk3c = chunk3.substr(11 + 20);

                resolver.handleChunk(`\r\n--${boundary}\r\n`);

                resolver.handleChunk(chunk1 + chunk2 + chunk3a);
                expect(onResponse.mock.calls[0][0]).toEqual([chunk1Data, chunk2Data]);
                onResponse.mockClear();

                resolver.handleChunk(chunk3b);
                expect(onResponse).not.toHaveBeenCalled();
                resolver.handleChunk(chunk3c);
                expect(onResponse.mock.calls[0][0]).toEqual([chunk3Data]);
            });

            it('should work when chunks are combined across boundaries', function () {
                const onResponse = jest.fn();
                const resolver = new PatchResolver({
                    onResponse,
                    boundary,
                });

                resolver.handleChunk(`\r\n--${boundary}\r\n`);

                const chunk2a = chunk2.substring(0, 35);
                const chunk2b = chunk2.substring(35);

                resolver.handleChunk(chunk1 + chunk2a);
                expect(onResponse.mock.calls[0][0]).toEqual([chunk1Data]);
                onResponse.mockClear();
                resolver.handleChunk(chunk2b);
                expect(onResponse.mock.calls[0][0]).toEqual([chunk2Data]);
            });
        });
    }
});
