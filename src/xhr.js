import { getBoundary } from './getBoundary';
import { PatchResolver } from './PatchResolver';

function supportsXhrResponseType(type) {
    try {
        const tmpXhr = new XMLHttpRequest();
        tmpXhr.responseType = type;
        return tmpXhr.responseType === type;
    } catch (e) {
        /* IE throws on setting responseType to an unsupported value */
    }
    return false;
}

export function xhrImpl(url, { method, headers, credentials, body, onNext, onError, onComplete }) {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = credentials === 'include'; // follow behavior of fetch credentials param https://github.com/github/fetch#sending-cookies
    let index = 0;
    let isDeferred = false;
    let boundary;
    let patchResolver;

    function onReadyStateChange() {
        // The request failed, do nothing and let the error event fire
        if (this.readyState === this.DONE && this.status === 0) {
            return;
        }

        if (this.readyState === this.HEADERS_RECEIVED) {
            const contentType = xhr.getResponseHeader('Content-Type');
            if (contentType.indexOf('multipart/mixed') >= 0) {
                isDeferred = true;
                boundary = getBoundary(contentType);
                patchResolver = new PatchResolver({ onResponse: (r) => onNext(r), boundary });
            }
        } else if (
            (this.readyState === this.LOADING || this.readyState === this.DONE) &&
            isDeferred
        ) {
            const chunk = xhr.response.substr(index);
            patchResolver.handleChunk(chunk);
            index = xhr.responseText.length;
        } else if (this.readyState === this.DONE && !isDeferred) {
            onNext([JSON.parse(xhr.response)]);
            onComplete();
        }
    }

    function onLoadEvent() {
        onComplete();
    }

    function onErrorEvent(err) {
        onError(err);
    }

    xhr.open(method, url);

    for (const [header, value] of Object.entries(headers)) {
        if (header !== 'referer') {
            xhr.setRequestHeader(header, value);
        }
    }

    if (supportsXhrResponseType('moz-chunked-text')) {
        xhr.responseType = 'moz-chunked-text';
    }

    xhr.addEventListener('readystatechange', onReadyStateChange);
    xhr.addEventListener('loaded', onLoadEvent);
    xhr.addEventListener('error', onErrorEvent);
    xhr.send(body);
}
