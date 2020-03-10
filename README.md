# fetch-multipart-graphql

Cross-browser function to fetch and parse streaming multipart graphql responses.

This allows you to efficiently fetch streamed GraphQL responses that use the @defer directive as supported by [Apollo Server](https://blog.apollographql.com/introducing-defer-in-apollo-server-f6797c4e9d6e). It can be easily used in a Relay Modern network layer to support deferred queries.

## Usage

In a Relay Network Layer:

```javascript
import fetchMultipart from 'fetch-multipart-graphql';
import { Observable } from 'relay-runtime';

function fetchQuery(operation, variables) {
    return Observable.create(sink => {
        fetchMultipart('/graphql', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                query: operation.text,
                variables,
            }),
            credentials: 'same-origin',
            onNext: parts => sink.next(parts),
            onError: err => sink.error(err),
            onComplete: () => sink.complete(),
        });
    });
}
```

#### Handling cookies and other auth headers

The `credentials` param is passed to [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters). For XHR requests, [`XMLHttpRequest.withCredentials`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials) is mapped to true when `credentials: 'include'`.

## Browser Support

Tested in the latest Chrome, Firefox, Safari, Edge, and Internet Explorer 11. Requires a polyfill for TextEncoder/Decoder. Since only utf-8 encoding is required, it's recommended to use [text-encoding-utf-8](https://www.npmjs.com/package/text-encoding-utf-8) to minimize impact on bundle size.
