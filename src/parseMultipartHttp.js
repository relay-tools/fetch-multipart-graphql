function getDelimiter(boundary) {
    return `\r\n--${boundary}\r\n`;
}

function getFinalDelimiter(boundary) {
    return `\r\n--${boundary}--\r\n`;
}

function splitWithRest(string, delim) {
    const index = string.indexOf(delim);
    if (index < 0) {
        return [string];
    }
    return [string.substring(0, index), string.substring(index + delim.length)];
}

export function parseMultipartHttp(buffer, boundary, previousParts = []) {
    const delimeter = getDelimiter(boundary);
    let [, rest] = splitWithRest(buffer, delimeter);
    if (!(rest && rest.length)) {
        // we did not finish receiving the initial delimeter
        return {
            newBuffer: buffer,
            parts: previousParts,
        };
    }
    const parts = splitWithRest(rest, '\r\n\r\n');
    const headers = parts[0];
    rest = parts[1];

    if (!(rest && rest.length)) {
        // we did not finish receiving the headers
        return {
            newBuffer: buffer,
            parts: previousParts,
        };
    }

    const headersArr = headers.split('\r\n');
    const contentLengthHeader = headersArr.find(
        (headerLine) => headerLine.toLowerCase().indexOf('content-length:') >= 0
    );
    if (contentLengthHeader === undefined) {
        throw new Error('Invalid MultiPart Response, no content-length header');
    }
    const contentLengthArr = contentLengthHeader.split(':');
    let contentLength;
    if (contentLengthArr.length === 2 && !isNaN(parseInt(contentLengthArr[1]))) {
        contentLength = parseInt(contentLengthArr[1]);
    } else {
        throw new Error('Invalid MultiPart Response, could not parse content-length');
    }

    // Strip out the final delimiter
    const finalDelimeter = getFinalDelimiter(boundary);
    rest = rest.replace(finalDelimeter, '');
    const uint = new TextEncoder().encode(rest);

    if (uint.length < contentLength) {
        // still waiting for more body to be sent;
        return {
            newBuffer: buffer,
            parts: previousParts,
        };
    }

    const body = new TextDecoder().decode(uint.subarray(0, contentLength));
    const nextBuffer = new TextDecoder().decode(uint.subarray(contentLength));
    const part = JSON.parse(body);
    const newParts = [...previousParts, part];

    if (nextBuffer.length) {
        return parseMultipartHttp(nextBuffer, boundary, newParts);
    }
    return { parts: newParts, newBuffer: '' };
}
