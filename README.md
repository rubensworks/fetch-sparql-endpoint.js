# Fetch SPARQL Endpoint

[![Build status](https://github.com/rubensworks/fetch-sparql-endpoint.js/workflows/CI/badge.svg)](https://github.com/rubensworks/fetch-sparql-endpoint.js/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/rubensworks/fetch-sparql-endpoint.js/badge.svg?branch=master)](https://coveralls.io/github/rubensworks/fetch-sparql-endpoint.js?branch=master)
[![npm version](https://badge.fury.io/js/fetch-sparql-endpoint.svg)](https://www.npmjs.com/package/fetch-sparql-endpoint)

A simple, lightweight module to send queries to [_SPARQL endpoints_](https://www.w3.org/TR/sparql11-protocol/) and retrieve their results in a _streaming_ fashion.

All results are compatible with the [RDFJS specification](http://rdf.js.org/).

All SPARQL queries are supported, such as `SELECT`, `ASK`, `CONSTRUCT` `DESCRIBE`, `INSERT`, `DELETE`, ...

Internally, this library supports SPARQL results in
[SPARQL JSON](https://www.w3.org/TR/sparql11-results-json/),
[SPARQL XML](https://www.w3.org/TR/rdf-sparql-XMLres/),
and [Turtle](https://www.w3.org/TR/turtle/).

## Install

This package can be installed via [npm](https://www.npmjs.com/package/jsonld-context-parser).

```bash
$ npm install fetch-sparql-endpoint
```

This package also works out-of-the-box in browsers via tools such as [webpack](https://webpack.js.org/) and [browserify](http://browserify.org/).

## Usage

### API

#### Create a new fetcher

```js
import {SparqlEndpointFetcher} from "fetch-sparql-endpoint";

const myFetcher = new SparqlEndpointFetcher();
```

Optionally, you can pass an options object with the following optional entries:
```js
const myFetcher = new SparqlEndpointFetcher({
  method: 'POST',                           // A custom HTTP method for issuing (non-update) queries, defaults to POST. Update queries are always issued via POST.
  additionalUrlParams: new URLSearchParams({'infer': 'true', 'sameAs': 'false'});  // A set of additional parameters that well be added to fetchAsk, fetchBindings & fetchTriples requests
  fetch: fetch,                             // A custom fetch-API-supporting function
  dataFactory: DataFactory,                 // A custom RDFJS data factory
  prefixVariableQuestionMark: false,        // If variable names in bindings should be prefixed with '?', defaults to false
  timeout: 5000                             // Timeout for setting up server connection (Once a connection has been made, and the response is being parsed, the timeout does not apply anymore).
});
```

### Fetch bindings

[SPARQL SELECT](https://www.w3.org/TR/rdf-sparql-query/#select) queries returns a (promise to a) stream of bindings.

```js
const bindingsStream = await fetcher.fetchBindings('https://dbpedia.org/sparql', 'SELECT * WHERE { ?s ?p ?o } LIMIT 100');
bindingsStream.on('data', (bindings) => console.log(bindings));
```

This will output bindings in the following form,
where keys correspond to variables in the queries,
and values and [RDFJS terms](http://rdf.js.org/#term-interface):
```
{ s: namedNode('s1'), p: namedNode('p1'), o: namedNode('o1') }
{ s: namedNode('s2'), p: namedNode('p2'), o: namedNode('o2') }
{ s: namedNode('s3'), p: namedNode('p3'), o: namedNode('o3') }
...
```

Optionally, you can obtain a list of variables by listening to the `'variables'` event:
```js
const bindingsStream = await fetcher.fetchBindings('https://dbpedia.org/sparql', 'SELECT * WHERE { ?s ?p ?o } LIMIT 100');
bindingsStream.on('data', (bindings) => console.log(bindings));
// Will print [ variable('s'), variable('p'), variable('o') ]
bindingsStream.on('variables', (variables) => console.log(variables));
```

### Fetch ask

[SPARQL ASK](https://www.w3.org/TR/rdf-sparql-query/#ask) queries answer with a (promise to a) boolean value.

```js
const answer = await fetcher.fetchAsk('https://dbpedia.org/sparql', 'ASK WHERE { ?s ?p ?o }');
```

This will output `true` or `false`.

### Fetch triples

[SPARQL CONSTRUCT](https://www.w3.org/TR/rdf-sparql-query/#construct) and [SPARQL DESCRIBE](https://www.w3.org/TR/rdf-sparql-query/#describe)
queries returns a (promise to a) stream of triples.

```js
const tripleStream = await fetcher.fetchTriples('https://dbpedia.org/sparql', 'CONSTRUCT { ?s ?p ?o } LIMIT 100');
tripleStream.on('data', (triple) => console.log(triple));
```

This will output [RDFJS triples](http://rdf.js.org/#triple-interface) as follows:
```
triple(namedNode('s1'), namedNode('p1'), namedNode('o1'))
triple(namedNode('s2'), namedNode('p2'), namedNode('o2'))
triple(namedNode('s3'), namedNode('p3'), namedNode('o3'))
...
```

### Fetch update

[SPARQL Update](https://www.w3.org/TR/sparql11-update/) queries answer with a void promise.

```js
await fetcher.fetchUpdate('https://dbpedia.org/sparql', 'INSERT DATA { <ex:s> <ex:p> <ex:o> }');
```

The `await` will throw an error if the update has failed.

### Detect query type

If you want to know the query type
in order to determine which of the above fetch methods to call,
then you can use the `getQueryType` method as follows:

```
fetcher.getQueryType('SELECT * WHERE { ?s ?p ?o } LIMIT 100'); // Outputs 'SELECT'
fetcher.getQueryType('ASK WHERE { ?s ?p ?o }');                // Outputs 'ASK'
fetcher.getQueryType('CONSTRUCT { ?s ?p ?o } LIMIT 100');      // Outputs 'CONSTRUCT'
```

This method will also throw an error if the query contains a syntax error.

### Command-line

A command-line tool is provided to quickly query or update any SPARQL endpoint:

Usage:
```
fetch-sparql-endpoint Sends a query to a SPARQL endpoint

Usage:
  fetch-sparql-endpoint https://dbpedia.org/sparql [-q] 'SELECT * WHERE { ?s ?p ?o } 100'
  fetch-sparql-endpoint https://dbpedia.org/sparql -f query.sparql
  cat query.sparql | fetch-sparql-endpoint https://dbpedia.org/sparql

Options:
  -q            evaluate the given SPARQL query string
  -f            evaluate the SPARQL query in the given file
  -g            send query via HTTP GET instead of POST
  --help        print this help message
```

## License
This software is written by [Ruben Taelman](http://rubensworks.net/).

This code is released under the [MIT license](http://opensource.org/licenses/MIT).
