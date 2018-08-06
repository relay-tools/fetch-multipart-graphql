// borrowed mostly from apollo-link
export function parseMultipartHTTP(plaintext) {
    const results = [];
    // Split plaintext using encapsulation boundary
    const boundary = '\r\n---\r\n';
    const terminatingBoundary = '\r\n-----\r\n';
    const parts = plaintext.split(boundary);
    for (const part of parts) {
        // Split part into header and body
        if (part.length) {
            const partArr = part.split('\r\n\r\n');
            // Read the Content-Length header, which must be included in the response
            const headers = partArr[0];
            const headersArr = headers.split('\r\n');
            const contentLengthHeader = headersArr.find(
                headerLine => headerLine.toLowerCase().indexOf('content-length:') >= 0
            );
            if (contentLengthHeader === undefined) {
                return null;
            }
            const contentLengthArr = contentLengthHeader.split(':');
            let contentLength;
            if (contentLengthArr.length === 2 && !isNaN(parseInt(contentLengthArr[1]))) {
                contentLength = parseInt(contentLengthArr[1]);
            } else {
                return null;
            }
            let body = partArr[1];
            if (body && body.length) {
                // Strip out the terminating boundary
                body = body.replace(terminatingBoundary, '');
                // Check that length of body matches the Content-Length
                if (body.length !== contentLength) {
                    return null;
                }
                results.push(JSON.parse(body));
            } else {
                return null;
            }
        }
    }
    return results;
}
