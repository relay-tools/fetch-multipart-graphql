import { PatchResolver } from './PatchResolver';
import { getBoundary } from './getBoundary';

export function fetchImpl(url, { onNext, onComplete, onError, ...fetchOptions }) {
    return fetch(url, fetchOptions)
        .then((response) => {
            const contentType = (!!response.headers && response.headers.get('Content-Type')) || '';
            // @defer uses multipart responses to stream patches over HTTP
            if (response.status < 300 && contentType.indexOf('multipart/mixed') >= 0) {
                const boundary = getBoundary(contentType);

                // For the majority of browsers with support for ReadableStream and TextDecoder
                const reader = response.body.getReader();
                const textDecoder = new TextDecoder();
                const patchResolver = new PatchResolver({
                    onResponse: (r) => onNext(r, { responseHeaders: response.headers }),
                    boundary,
                });
                return reader.read().then(function sendNext({ value, done }) {
                    if (!done) {
                        let plaintext;
                        try {
                            plaintext = textDecoder.decode(value);
                            // Read the header to get the Content-Length
                            patchResolver.handleChunk(plaintext);
                        } catch (err) {
                            const parseError = err;
                            parseError.response = response;
                            parseError.statusCode = response.status;
                            parseError.bodyText = plaintext;
                            onError(parseError);
                        }
                        reader.read().then(sendNext);
                    } else {
                        onComplete();
                    }
                });
            } else {
                return response.json().then((json) => {
                    onNext([json]);
                    onComplete();
                });
            }
        })
        .catch(onError);
}
