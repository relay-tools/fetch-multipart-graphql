import { xhrImpl } from './xhr';
import { fetchImpl } from './fetch';

export function getTransport() {
    if (
        // supports fetch and ReadableStream on fetch response
        typeof Response !== 'undefined' &&
        Response.prototype.hasOwnProperty('body') &&
        typeof Headers === 'function'
    ) {
        return fetchImpl;
    }
    return xhrImpl;
}
