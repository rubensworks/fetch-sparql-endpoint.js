import {namedNode, triple} from "@rdfjs/data-model";
import "jest-rdf";
import {Readable} from "stream";
import {SparqlEndpointFetcher} from "../lib/SparqlEndpointFetcher";

const stringifyStream = require('stream-to-string');
const streamifyString = require('streamify-string');
const arrayifyStream = require('arrayify-stream');

// tslint:disable:no-trailing-whitespace

describe('SparqlEndpointFetcher', () => {

  describe('constructed without fetch callback', () => {
    it('should have the default fetch function', async () => {
      return expect(new SparqlEndpointFetcher().fetchCb).toBe(require('isomorphic-fetch'));
    });
  });

  describe('constructed with fetch callback', () => {

    const endpoint = 'https://dbpedia.org/sparql';
    const querySelect = 'SELECT * WHERE { ?s ?p ?o }';
    const queryAsk = 'ASK WHERE { ?s ?p ?o }';
    const queryConstruct = 'CONSTRUCT WHERE { ?s ?p ?o }';
    const queryDescribe = 'DESCRIBE <http://ex.org>';

    let fetchCb;
    let fetcher;

    beforeEach(() => {
      fetchCb = (url) => Promise.resolve(new Response('dummy'));
      fetcher = new SparqlEndpointFetcher({ fetch: fetchCb });
    });

    it('should have the default fetch function', async () => {
      return expect(fetcher.fetchCb).toBe(fetchCb);
    });

    describe('#getQueryType', () => {
      it('should detect a select query', () => {
        return expect(fetcher.getQueryType(querySelect)).toEqual('SELECT');
      });

      it('should detect an ask query', () => {
        return expect(fetcher.getQueryType(queryAsk)).toEqual('ASK');
      });

      it('should detect a construct query', () => {
        return expect(fetcher.getQueryType(queryConstruct)).toEqual('CONSTRUCT');
      });

      it('should detect a describe query as a construct query', () => {
        return expect(fetcher.getQueryType(queryDescribe)).toEqual('CONSTRUCT');
      });

      it('should detect an unknown query', () => {
        return expect(fetcher.getQueryType('INSERT { ?s ?p ?o } WHERE {}')).toEqual('UNKNOWN');
      });

      it('should throw an error on invalid queries', () => {
        return expect(() => fetcher.getQueryType('{{{')).toThrow();
      });
    });

    describe('#fetchRawStream', () => {
      it('should pass the correct URL and HTTP headers', () => {
        const fetchCbThis = jest.fn(() => Promise.resolve(new Response(streamifyString('dummy'))));
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader');
        const headers: Headers = new Headers();
        headers.append('Accept', 'myacceptheader');
        return expect(fetchCbThis).toBeCalledWith(
          'https://dbpedia.org/sparql?query=SELECT%20*%20WHERE%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D', { headers });
      });

      it('should emit an error in the stream for an invalid server response', async () => {
        const readable = new Readable();
        readable._read = () => { return; };
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: <ReadableStream> <any> readable,
          headers: new Headers(),
          ok: false,
          status: 500,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(stringifyStream((await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader'))[1]))
          .rejects.toEqual(new Error('Invalid SPARQL endpoint (https://dbpedia.org/sparql) response: Error!'));
      });

      it('should fetch with a node stream', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`abc`),
          headers: new Headers(),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await stringifyStream((
          await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader'))[1])).toEqual(`abc`);
      });

      it('should fetch with a web stream', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: require('web-streams-node').toWebReadableStream(streamifyString(`abc`)),
          headers: new Headers(),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await stringifyStream((
          await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader'))[1])).toEqual(`abc`);
      });

      it('should fetch and get a dummy content type when none is provided', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`abc`),
          headers: new Headers(),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect((await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader'))[0])
          .toEqual('');
      });

      it('should fetch and get the content type', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`abc`),
          headers: new Headers({ 'Content-Type': 'abc' }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect((await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader'))[0])
          .toEqual('abc');
      });

      it('should fetch and get the content type that has a suffix', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`abc`),
          headers: new Headers({ 'Content-Type': 'abc; bla' }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect((await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader'))[0])
          .toEqual('abc');
      });
    });

    describe('#fetchBindings', () => {
      it('should parse bindings', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`{
  "head": { "vars": [ "p" ] },
  "results": {
    "bindings": [
      {
        "p": { "type": "uri" , "value": "p1" }
      },
      {
        "p": { "type": "uri" , "value": "p2" }
      },
      {
        "p": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}`),
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await arrayifyStream(await fetcherThis.fetchBindings(endpoint, querySelect)))
          .toEqual([
            { p: namedNode('p1') },
            { p: namedNode('p2') },
            { p: namedNode('p3') },
          ]);
      });

      it('should parse empty JSON bindings', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`{
  "head": { "vars": [ "p" ] },
  "results": {
    "bindings": []
  }
}`),
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await arrayifyStream(await fetcherThis.fetchBindings(endpoint, querySelect)))
          .toEqual([]);
      });

      it('should parse empty XML bindings', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`<?xml version="1.0"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <head>
  </head>
  <results>
  </results>
</sparql>`),
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_XML }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await arrayifyStream(await fetcherThis.fetchBindings(endpoint, querySelect)))
          .toEqual([]);
      });

      it('should parse no bindings', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`{
  "head": { "vars": [ "p" ] },
  "results": {}
}`),
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await arrayifyStream(await fetcherThis.fetchBindings(endpoint, querySelect)))
          .toEqual([]);
      });

      it('should parse no results', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`{
  "head": { "vars": [ "p" ] }
}`),
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await arrayifyStream(await fetcherThis.fetchBindings(endpoint, querySelect)))
          .toEqual([]);
      });

      it('should emit an error on a server error', async () => {
        const body = <any> new Readable();
        body._read = () => { return; };
        const fetchCbThis = () => Promise.resolve(<Response> {
          body,
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: false,
          status: 500,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(arrayifyStream(await fetcherThis.fetchBindings(endpoint, querySelect)))
          .rejects.toBeTruthy();
      });

      it('should reject on an invalid content type', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(''),
          headers: new Headers({ 'Content-Type': 'bla' }),
          ok: true,
          status: 200,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(fetcherThis.fetchBindings(endpoint, querySelect)).rejects
          .toEqual(new Error('Unknown SPARQL results content type: bla'));
      });
    });

    describe('#fetchAsk', () => {
      it('should parse true', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`{
  "head": { },
  "boolean": true
}`),
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await fetcherThis.fetchAsk(endpoint, queryAsk)).toEqual(true);
      });

      it('should parse false in JSON', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`{
  "head": { },
  "boolean": false
}`),
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await fetcherThis.fetchAsk(endpoint, queryAsk)).toEqual(false);
      });

      it('should parse false in XML', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`<?xml version="1.0"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <boolean>false</boolean>
</sparql>`),
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_XML }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await fetcherThis.fetchAsk(endpoint, queryAsk)).toEqual(false);
      });

      it('should reject on an invalid response', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`{
  "head": { }
}`),
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(fetcherThis.fetchAsk(endpoint, queryAsk)).rejects
          .toEqual(new Error('No valid ASK response was found.'));
      });

      it('should reject on a server error', async () => {
        const body = <any> new Readable();
        body._read = () => { return; };
        const fetchCbThis = () => Promise.resolve(<Response> {
          body,
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: false,
          status: 500,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(fetcherThis.fetchAsk(endpoint, queryAsk)).rejects
          .toEqual(new Error('Invalid SPARQL endpoint (https://dbpedia.org/sparql) response: Error!'));
      });

      it('should reject on an invalid content type', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(''),
          headers: new Headers({ 'Content-Type': 'bla' }),
          ok: true,
          status: 200,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(fetcherThis.fetchAsk(endpoint, queryAsk)).rejects
          .toEqual(new Error('Unknown SPARQL results content type: bla'));
      });
    });

    describe('#fetchTriples', () => {
      it('should parse triples', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`
<http://ex.org/s> <http://ex.org/p> <http://ex.org/o1>, <http://ex.org/o2>.
`),
          headers: new Headers(),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await arrayifyStream(await fetcherThis.fetchTriples(endpoint, queryConstruct)))
          .toEqualRdfQuadArray([
            triple(namedNode('http://ex.org/s'), namedNode('http://ex.org/p'), namedNode('http://ex.org/o1')),
            triple(namedNode('http://ex.org/s'), namedNode('http://ex.org/p'), namedNode('http://ex.org/o2')),
          ]);
      });
    });
  });

});
