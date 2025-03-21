function getDelimiter(boundary) {
    return `\r\n--${boundary}\r\n`;
}

function getClosingDelimiter(boundary) {
    return `\r\n--${boundary}--`;
}

function splitWithRest(string, delim) {
    const index = string.indexOf(delim);
    if (index < 0) {
        return [undefined, string];
    }
    return [string.substring(0, index), string.substring(index + delim.length)];
}

export function parseMultipartHttp(buffer, boundary, previousParts = [], isPreamble = true) {
    const delimiter = getDelimiter(boundary);

    let [region, next] = splitWithRest(buffer, delimiter);

    if (region !== undefined && (region.length || region.trim() === '') && isPreamble) {
        if (next && next.length) {
            // if we have stuff after the boundary; and we're in preamble—we recurse
            return parseMultipartHttp(next, boundary, previousParts, false);
        } else {
            return { newBuffer: '', parts: previousParts, isPreamble: false };
        }
    }

    if (!region) {
        const closingDelimiter = getClosingDelimiter(boundary);
        [region, next] = splitWithRest(buffer, closingDelimiter);

        if (!region) {
            // we need more things
            return {
                newBuffer: buffer,
                parts: previousParts,
                isPreamble,
            };
        }
    }

    let [_headers, body] = splitWithRest(region, '\r\n\r\n');

    // remove trailing boundary things
    body = body.replace(delimiter + '\r\n', '').replace(delimiter + '--\r\n', '');

    const payload = JSON.parse(body);
    const parts = [...previousParts, payload];

    if (next && next.length) {
        // we have more parts
        return parseMultipartHttp(next, boundary, parts, isPreamble);
    }

    return { parts, newBuffer: '', isPreamble };
}
