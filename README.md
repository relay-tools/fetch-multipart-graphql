# fetch-multipart-graphql
Cross-browser function to fetch and parse streaming multipart graphql responses.

This allows you to efficiently fetch streamed GraphQL responses that use the @defer directive as supported by (Apollo Server)[https://blog.apollographql.com/introducing-defer-in-apollo-server-f6797c4e9d6e]. It can be easily used in a Relay Modern network layer to support deferred queries.

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
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                query: operation.text,
                variables,
            }),
            onNext: json => sink.next(json),
            onError: err => sink.error(err),
            onComplete: () => sink.complete(),
        });
    });
}

```

## Browser Support

Tested in the latest Chrome, Firefox, Safari, Edge, and Internet Explorer 11.
