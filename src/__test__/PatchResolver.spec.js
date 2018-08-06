import { PatchResolver } from '../PatchResolver';

const chunk1 = [
    '',
    '---',
    'Content-Type: application/json',
    'Content-Length: 64',
    '',
    '{"data":{"viewer":{"currencies":null,"user":{"profile":null}}}}\n',
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
    'Content-Length: 84',
    '',
    '{"path":["viewer","currencies"],"data":["USD","GBP","EUR","CAD","AUD","CHF","MXN"]}\n',
].join('\r\n');

const chunk2error = [
    '',
    '---',
    'Content-Type: application/json',
    'Content-Length: 126',
    '',
    '{"path":["viewer","currencies"],"data":["USD","GBP","EUR","CAD","AUD","CHF","MXN"],"errors":[{"message":"Not So Bad Error"}]}\n',
].join('\r\n');

const chunk3 = [
    '',
    '---',
    'Content-Type: application/json',
    'Content-Length: 76',
    '',
    '{"path":["viewer","user","profile"],"data":{"displayName":"Steven Seagal"}}\n',
    '',
    '-----',
].join('\r\n');

describe('PathResolver', function() {
    it('should work on each chunk', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        resolver.handleChunk(chunk1);
        expect(onResponse).toHaveBeenCalledWith({
            data: { viewer: { currencies: null, user: { profile: null } } },
        });
        onResponse.mockClear();
        resolver.handleChunk(chunk2);
        expect(onResponse).toHaveBeenCalledWith({
            data: {
                viewer: {
                    currencies: ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'CHF', 'MXN'],
                    user: { profile: null },
                },
            },
        });
        onResponse.mockClear();
        resolver.handleChunk(chunk3);
        expect(onResponse).toHaveBeenCalledWith({
            data: {
                viewer: {
                    currencies: ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'CHF', 'MXN'],
                    user: { profile: { displayName: 'Steven Seagal' } },
                },
            },
        });
    });

    it('should work when chunks are split', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        const chunk1a = chunk1.substr(0, 35);
        const chunk1b = chunk1.substr(36);

        resolver.handleChunk(chunk1a);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk1b);
        expect(onResponse).toHaveBeenCalledWith({
            data: { viewer: { currencies: null, user: { profile: null } } },
        });
        onResponse.mockClear();

        const chunk2a = chunk2.substr(0, 35);
        const chunk2b = chunk2.substr(36);

        resolver.handleChunk(chunk2a);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk2b);
        expect(onResponse).toHaveBeenCalledWith({
            data: {
                viewer: {
                    currencies: ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'CHF', 'MXN'],
                    user: { profile: null },
                },
            },
        });
        onResponse.mockClear();

        const chunk3a = chunk3.substr(0, 10);
        const chunk3b = chunk3.substr(11, 20);
        const chunk3c = chunk3.substr(21);

        resolver.handleChunk(chunk3a);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk3b);
        expect(onResponse).not.toHaveBeenCalled();
        resolver.handleChunk(chunk3c);
        expect(onResponse).toHaveBeenCalledWith({
            data: {
                viewer: {
                    currencies: ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'CHF', 'MXN'],
                    user: { profile: { displayName: 'Steven Seagal' } },
                },
            },
        });
    });

    it.only('should merge errors', function() {
        const onResponse = jest.fn();
        const resolver = new PatchResolver({
            onResponse,
        });

        resolver.handleChunk(chunk1error);
        expect(onResponse).toHaveBeenCalledWith({
            data: { viewer: { currencies: null, user: { profile: null } } },
            errors: [{ message: 'Very Bad Error' }],
        });
        onResponse.mockClear();
        resolver.handleChunk(chunk2error);
        expect(onResponse).toHaveBeenCalledWith({
            data: {
                viewer: {
                    currencies: ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'CHF', 'MXN'],
                    user: { profile: null },
                },
            },
            errors: [{ message: 'Very Bad Error' }, { message: 'Not So Bad Error' }],
        });
        onResponse.mockClear();
        resolver.handleChunk(chunk3);
        expect(onResponse).toHaveBeenCalledWith({
            data: {
                viewer: {
                    currencies: ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'CHF', 'MXN'],
                    user: { profile: { displayName: 'Steven Seagal' } },
                },
            },
            errors: [{ message: 'Very Bad Error' }, { message: 'Not So Bad Error' }],
        });
    });
});
