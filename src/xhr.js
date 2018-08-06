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

const supportsMozChunked = supportsXhrResponseType('moz-chunked-text');

export function xhrImpl(url, { method, headers, body, onNext, onError, onComplete }) {
    const xhr = new XMLHttpRequest();
    let index = 0;

    const patchResolver = new PatchResolver({ onResponse: r => onNext(r) });

    function onProgressEvent() {
        const chunk = xhr.response.substr(index);
        patchResolver.handleChunk(chunk);
        index = xhr.responseText.length;
    }

    function onLoadEvent() {
        onComplete();
    }

    function onErrorEvent(err) {
        onError(err);
    }

    xhr.open(method, url);

    for (const [header, value] of Object.entries(headers)) {
        xhr.setRequestHeader(header, value);
    }

    if (supportsMozChunked) {
        xhr.responseType = 'moz-chunked-text';
    }

    xhr.addEventListener('progress', onProgressEvent);
    xhr.addEventListener('loaded', onLoadEvent);
    xhr.addEventListener('error', onErrorEvent);
    xhr.send(body);
}
