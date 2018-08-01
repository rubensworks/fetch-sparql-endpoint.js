import "jest-rdf";
import {blankNode, literal, namedNode, triple} from "rdf-data-model";
import {Readable} from "stream";
import {SparqlEndpointFetcher} from "../lib/SparqlEndpointFetcher";

const stringifyStream = require('stream-to-string');
const streamifyString = require('streamify-string');
const arrayifyStream = require('arrayify-stream');

// tslint:disable:no-trailing-whitespace

describe('SparqlEndpointFetcher', () => {

  describe('constructed without fetch callback and data factory', () => {
    it('should have the default fetch function', async () => {
      return expect(new SparqlEndpointFetcher().fetchCb).toBe(require('isomorphic-fetch'));
    });

    it('should have the default data factory', async () => {
      return expect(new SparqlEndpointFetcher().dataFactory).toBe(require('rdf-data-model'));
    });
  });

  describe('constructed without fetch callback and with data factory', () => {
    it('should have the default fetch function', async () => {
      return expect(new SparqlEndpointFetcher().fetchCb).toBe(require('isomorphic-fetch'));
    });

    it('should have the given data factory', async () => {
      return expect(new SparqlEndpointFetcher({ dataFactory: <any> 'abc' }).dataFactory).toEqual('abc');
    });
  });

  describe('constructed with fetch callback', () => {

    const endpoint = 'https://dbpedia.org/sparql';
    const querySelect = 'SELECT * WHERE { ?s ?p ?o }';
    const queryAsk = 'ASK WHERE { ?s ?p ?o }';

    let fetchCb;
    let fetcher;

    beforeEach(() => {
      fetchCb = (url) => Promise.resolve(new Response('dummy'));
      fetcher = new SparqlEndpointFetcher({ fetch: fetchCb });
    });

    it('should have the default fetch function', async () => {
      return expect(fetcher.fetchCb).toBe(fetchCb);
    });

    describe('#parseJsonBindings', () => {
      it('should convert bindings with named nodes', () => {
        return expect(fetcher.parseJsonBindings({
          book: { type: 'uri', value: 'http://example.org/book/book6' },
        })).toEqual({ '?book': namedNode('http://example.org/book/book6') });
      });

      it('should convert bindings with blank nodes', () => {
        return expect(fetcher.parseJsonBindings({
          book: { type: 'bnode', value: 'abc' },
        })).toEqual({ '?book': blankNode('abc') });
      });

      it('should convert bindings with literals', () => {
        return expect(fetcher.parseJsonBindings({
          book: { type: 'literal', value: 'abc' },
        })).toEqual({ '?book': literal('abc') });
      });

      it('should convert bindings with languaged literals', () => {
        return expect(fetcher.parseJsonBindings({
          book: { 'type': 'literal', 'value': 'abc', 'xml:lang': 'en-us' },
        })).toEqual({ '?book': literal('abc', 'en-us') });
      });

      it('should convert bindings with datatyped literals', () => {
        return expect(fetcher.parseJsonBindings({
          book: { type: 'literal', value: 'abc', datatype: 'http://ex' },
        })).toEqual({ '?book': literal('abc', namedNode('http://ex')) });
      });

      it('should convert mixed bindings', () => {
        return expect(fetcher.parseJsonBindings({
          book1: { type: 'uri', value: 'http://example.org/book/book6' },
          book2: { type: 'bnode', value: 'abc' },
          book3: { type: 'literal', value: 'abc' },
          book4: { 'type': 'literal', 'value': 'abc', 'xml:lang': 'en-us' },
          book5: { type: 'literal', value: 'abc', datatype: 'http://ex' },
        })).toEqual({
          '?book1': namedNode('http://example.org/book/book6'),
          '?book2': blankNode('abc'),
          '?book3': literal('abc'),
          '?book4': literal('abc', 'en-us'),
          '?book5': literal('abc', namedNode('http://ex')),
        });
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
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: <ReadableStream> <any> readable,
          ok: false,
          status: 500,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(stringifyStream(await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader')))
          .rejects.toEqual(new Error('Invalid SPARQL endpoint (https://dbpedia.org/sparql) response: 500'));
      });

      it('should fetch with a node stream', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`abc`),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await stringifyStream(await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader')))
          .toEqual(`abc`);
      });

      it('should fetch with a web stream', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: require('node-web-streams').toWebReadableStream(streamifyString(`abc`)),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await stringifyStream(await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader')))
          .toEqual(`abc`);
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
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await arrayifyStream(await fetcherThis.fetchBindings(endpoint, querySelect)))
          .toEqual([
            { '?p': namedNode('p1') },
            { '?p': namedNode('p2') },
            { '?p': namedNode('p3') },
          ]);
      });

      it('should parse empty bindings', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`{
  "head": { "vars": [ "p" ] },
  "results": {
    "bindings": []
  }
}`),
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
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await arrayifyStream(await fetcherThis.fetchBindings(endpoint, querySelect)))
          .toEqual([]);
      });
    });

    describe('#fetchAsk', () => {
      it('should parse true', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`{
  "head": { },
  "boolean": true
}`),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await fetcherThis.fetchAsk(endpoint, queryAsk)).toEqual(true);
      });

      it('should parse false', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`{
  "head": { },
  "boolean": false
}`),
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
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(fetcherThis.fetchAsk(endpoint, queryAsk)).rejects
          .toEqual(new Error('No valid ASK response was found.'));
      });
    });

    describe('#fetchTriples', () => {
      it('should parse triples', async () => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`
<http://ex.org/s> <http://ex.org/p> <http://ex.org/o1>, <http://ex.org/o2>.
`),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await arrayifyStream(await fetcherThis.fetchTriples(endpoint, querySelect)))
          .toEqualRdfQuadArray([
            triple(namedNode('http://ex.org/s'), namedNode('http://ex.org/p'), namedNode('http://ex.org/o1')),
            triple(namedNode('http://ex.org/s'), namedNode('http://ex.org/p'), namedNode('http://ex.org/o2')),
          ]);
      });
    });
  });

});
