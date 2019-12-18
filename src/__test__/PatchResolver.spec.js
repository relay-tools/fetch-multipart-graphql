import { PatchResolver } from '../PatchResolver';
import { TextEncoder, TextDecoder } from 'util';
// polyfill TextDecoder/Encoder for node
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const chunk1 = [
    '',
    '---',
    'Content-Type: application/json',
    'Content-Length: 142',
    '',
    '{"data":{"viewer":{"currencies":null,"user":{"profile":null,"items":{"edges":[{"node":{"isFavorite":null}},{"node":{"isFavorite":null}}]}}}}}\n',
].join('\r\n');

const chunk1error = [
    '',
    '---',
    'Content-Type: application/json',
    'Content-Length: 104',
    '',
    '{"data":{"viewer":{"currencies":null,"user":{"profile":null}}},"errors":[{"message":"Very Bad Error"}]}\n',
].join('\r\n');

const chunk2 = [
    '',
    '---',
    'Content-Type: application/json',
    'Content-Length: 85',
    '',
    '{"path":["viewer","currencies"],"data":["USD","GBP","EUR","CAD","AUD","CHF","😂"]}\n', // test unicode
].join('\r\n');

const chunk2error = [
    '',
    '---',
    'Content-Type: application/json',
    'Content-Length: 127',
    '',
    '{"path":["viewer","currencies"],"data":["USD","GBP","EUR","CAD","AUD","CHF","😂"],"errors":[{"message":"Not So Bad Error"}]}\n',
].join('\r\n');

const chunk3 = [
    '',
    '---',
    'Content-Type: application/json',
    'Content-Length: 76',
    '',
    '{"path":["viewer","user","profile"],"data":{"displayName":"Steven Seagal"}}\n',
].join('\r\n');

const chunk4 = [
    '',
    '---',
    'Content-Type: application/json',
    'Content-Length: 78',
    '',
    '{"data":false,"path":["viewer","user","items","edges",1,"node","isFavorite"]}\n',
    '',
    '-----\r\n',
].join('\r\n');

describe('PathResolver', function() {
    it('should work on each chunk', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        resolver.handleChunk(chunk1);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();

        onResponse.mockClear();
        resolver.handleChunk(chunk2);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();

        onResponse.mockClear();
        resolver.handleChunk(chunk3);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();

        onResponse.mockClear();
        resolver.handleChunk(chunk4);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
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
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
        onResponse.mockClear();

        const chunk2a = chunk2.substr(0, 35);
        const chunk2b = chunk2.substr(35);

        resolver.handleChunk(chunk2a);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk2b);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
        onResponse.mockClear();

        const chunk3a = chunk3.substr(0, 10);
        const chunk3b = chunk3.substr(11, 20);
        const chunk3c = chunk3.substr(11 + 20);

        resolver.handleChunk(chunk3a);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk3b);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk3c);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
    });

    it('should work when chunks are combined', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        resolver.handleChunk(chunk1 + chunk2);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
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
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
        onResponse.mockClear();

        resolver.handleChunk(chunk3b);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk3c);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
    });

    it('should work when chunks are combined across boundaries', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        const chunk2a = chunk2.substring(0, 35);
        const chunk2b = chunk2.substring(35);

        resolver.handleChunk(chunk1 + chunk2a);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
        onResponse.mockClear();
        resolver.handleChunk(chunk2b);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
    });

    it('should merge errors', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        resolver.handleChunk(chunk1error);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
        onResponse.mockClear();
        resolver.handleChunk(chunk2error);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
        onResponse.mockClear();
        resolver.handleChunk(chunk3);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
    });

    it('should work when not applying to previous', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
            applyToPrevious: false,
        });

        const chunk2a = chunk2.substring(0, 35);
        const chunk2b = chunk2.substring(35);

        resolver.handleChunk(chunk1 + chunk2a);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
        onResponse.mockClear();
        resolver.handleChunk(chunk2b);
        expect(onResponse.mock.calls[0][0]).toMatchSnapshot();
    });
});
