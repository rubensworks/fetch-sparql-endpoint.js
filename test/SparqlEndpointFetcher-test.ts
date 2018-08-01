import {blankNode, literal, namedNode} from "rdf-data-model";
import {Readable} from "stream";
import {SparqlEndpointFetcher} from "../lib/SparqlEndpointFetcher";

const stringifyStream = require('stream-to-string');
const streamifyString = require('streamify-string');

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
        const fetchCbThis = jest.fn((url) => Promise.resolve(new Response(streamifyString('dummy'))));
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        fetcherThis.fetchRawStream(endpoint, querySelect);
        const headers: Headers = new Headers();
        headers.append('Accept', 'application/sparql-results+json');
        return expect(fetchCbThis).toBeCalledWith(
          'https://dbpedia.org/sparql?query=SELECT%20*%20WHERE%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D', { headers });
      });

      it('should emit an error in the stream for an invalid server response', async () => {
        const readable = new Readable();
        const fetchCbThis = (url) => Promise.resolve(<Response> {
          body: <ReadableStream> <any> readable,
          ok: false,
          status: 500,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(stringifyStream(await fetcherThis.fetchRawStream(endpoint, querySelect)))
          .rejects.toEqual(new Error('Invalid SPARQL endpoint (https://dbpedia.org/sparql) response: 500'));
      });

      it('should fetch with a node stream', async () => {
        const fetchCbThis = (url) => Promise.resolve(<Response> {
          body: streamifyString(`abc`),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await stringifyStream(await fetcherThis.fetchRawStream(endpoint, querySelect)))
          .toEqual(`abc`);
      });

      it('should fetch with a web stream', async () => {
        const fetchCbThis = (url) => Promise.resolve(<Response> {
          body: require('node-web-streams').toWebReadableStream(streamifyString(`abc`)),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        return expect(await stringifyStream(await fetcherThis.fetchRawStream(endpoint, querySelect)))
          .toEqual(`abc`);
      });
    });
  });

});
