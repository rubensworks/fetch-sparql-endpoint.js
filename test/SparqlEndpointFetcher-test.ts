import 'jest-rdf';
import { ReadableWebToNodeStream } from '@smessie/readable-web-to-node-stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import { SparqlEndpointFetcher } from '../lib/SparqlEndpointFetcher';

const readableStreamNodeToWeb = require('readable-stream-node-to-web');
const streamifyString = require('streamify-string');

const DF = new DataFactory();

if (!globalThis.ReadableStream) {
  // TODO: Remove this workaround and ponyfill when Node 16 support is dropped
  globalThis.ReadableStream = require('web-streams-ponyfill').ReadableStream;
}

describe('SparqlEndpointFetcher', () => {
  describe('constructed without fetch callback', () => {
    it('should have an undefined fetch function', async() => {
      expect(new SparqlEndpointFetcher().fetchCb).toBeUndefined();
    });
  });

  describe('constructed with fetch callback', () => {
    const prefixes = 'PREFIX foaf: <http://xmlns.com/foaf/0.1/>\nPREFIX : <http://example.org/>\n';

    const endpoint = 'https://dbpedia.org/sparql';
    const querySelect = 'SELECT * WHERE { ?s ?p ?o }';
    const queryAsk = 'ASK WHERE { ?s ?p ?o }';
    const queryConstruct = 'CONSTRUCT WHERE { ?s ?p ?o }';
    const queryDescribe = 'DESCRIBE <http://ex.org>';
    const queryDelete = 'DELETE WHERE { ?s ?p ?o }';
    const queryDeleteStar = 'DELETE WHERE { << ?si ?pi ?oi >> ?p ?o }';
    const queryInsert = 'INSERT { ?s ?p ?o } WHERE {}';
    const queryInsertStar = 'INSERT { << ?si ?pi ?oi >> ?p ?o } WHERE {}';
    const updateDeleteData = `${prefixes}\nDELETE DATA { GRAPH <http://example.org/g1> { :a foaf:knows :b } }`;
    const updateDeleteDataStar = `${prefixes}\nDELETE DATA { GRAPH <http://example.org/g1> { :a foaf:knows << :b foaf:knows :c >> } }`;
    const updateDeleteData2 = `${prefixes}\nDELETE DATA { GRAPH <http://example.org/g1> { :b foaf:knows :c } }`;
    const updateDeleteData2Star = `${prefixes}\nDELETE DATA { GRAPH <http://example.org/g1> { :b foaf:knows << :c foaf:knows :d >> } }`;
    const updateInsertData = `${prefixes}\nINSERT DATA { GRAPH <http://example.org/g1> { :Alice foaf:knows :Bob } }`;
    const updateInsertDataStar = `${prefixes}\nINSERT DATA { GRAPH <http://example.org/g1> { :Alice foaf:knows << :Bob foaf:knows :Carrol >> } }`;
    const updateMove = `${prefixes}\nMOVE DEFAULT TO :g1`;
    const updateAdd = 'ADD SILENT GRAPH <http://www.example.com/g1> TO DEFAULT';

    let fetchCb: (input: Request | string, init?: RequestInit) => Promise<Response>;
    let fetcher: SparqlEndpointFetcher;

    beforeEach(() => {
      fetchCb = () => Promise.resolve(new Response('dummy'));
      fetcher = new SparqlEndpointFetcher({ fetch: fetchCb });
    });

    it('should have the default fetch function', async() => {
      expect(fetcher.fetchCb).toBe(fetchCb);
    });

    describe('getQueryType', () => {
      it('should detect a select query', () => {
        expect(fetcher.getQueryType(querySelect)).toBe('SELECT');
      });

      it('should detect an ask query', () => {
        expect(fetcher.getQueryType(queryAsk)).toBe('ASK');
      });

      it('should detect a construct query', () => {
        expect(fetcher.getQueryType(queryConstruct)).toBe('CONSTRUCT');
      });

      it('should detect a describe query as a construct query', () => {
        expect(fetcher.getQueryType(queryDescribe)).toBe('CONSTRUCT');
      });

      it('should detect an unknown insert query', () => {
        expect(fetcher.getQueryType(queryInsert)).toBe('UNKNOWN');
      });

      it('should detect an unknown delete query', () => {
        expect(fetcher.getQueryType(queryDelete)).toBe('UNKNOWN');
      });

      it('should throw an error on invalid queries', () => {
        expect(() => fetcher.getQueryType('{{{')).toThrow('Parse error on line 1');
      });
    });

    describe('getUpdateTypes', () => {
      it('should detect an unknown update (SELECT)', () => {
        expect(fetcher.getUpdateTypes(querySelect)).toBe('UNKNOWN');
      });

      it('should detect an unknown update (ASK)', () => {
        expect(fetcher.getUpdateTypes(queryAsk)).toBe('UNKNOWN');
      });

      it('should detect an unknown update (CONSTRUCT)', () => {
        expect(fetcher.getUpdateTypes(queryConstruct)).toBe('UNKNOWN');
      });

      it('should detect an unknown update (DESCRIBE)', () => {
        expect(fetcher.getUpdateTypes(queryDescribe)).toBe('UNKNOWN');
      });

      it('should throw an error on invalid queries', () => {
        expect(() => fetcher.getUpdateTypes('{{{')).toThrow('Parse error on line 1');
      });

      it('should detect an insertdelete query', () => {
        expect(fetcher.getUpdateTypes(queryInsert)).toEqual({
          insertdelete: true,
        });
      });

      it('should detect an insertdelete query with star', () => {
        expect(fetcher.getUpdateTypes(queryInsertStar)).toEqual({
          insertdelete: true,
        });
      });

      it('should detect a delete query', () => {
        expect(fetcher.getUpdateTypes(queryDelete)).toEqual({
          deletewhere: true,
        });
      });

      it('should detect a delete query with star', () => {
        expect(fetcher.getUpdateTypes(queryDeleteStar)).toEqual({
          deletewhere: true,
        });
      });

      it('should detect a delete data query', () => {
        expect(fetcher.getUpdateTypes(updateDeleteData)).toEqual({
          delete: true,
        });
      });

      it('should detect a delete data query with star', () => {
        expect(fetcher.getUpdateTypes(updateDeleteDataStar)).toEqual({
          delete: true,
        });
      });

      it('should detect a delete data query for 2 update operations', () => {
        expect(fetcher.getUpdateTypes(`${updateDeleteData};${updateDeleteData2}`)).toEqual({
          delete: true,
        });
      });

      it('should detect a delete data query for 2 update operations with star', () => {
        expect(fetcher.getUpdateTypes(`${updateDeleteDataStar};${updateDeleteData2Star}`)).toEqual({
          delete: true,
        });
      });

      it('should detect an insert data query', () => {
        expect(fetcher.getUpdateTypes(updateInsertData)).toEqual({
          insert: true,
        });
      });

      it('should detect an insert data query with star', () => {
        expect(fetcher.getUpdateTypes(updateInsertDataStar)).toEqual({
          insert: true,
        });
      });

      it('should detect a combined insert and delete data query', () => {
        expect(fetcher.getUpdateTypes(`${updateInsertData};${updateDeleteData}`)).toEqual({
          insert: true,
          delete: true,
        });
      });

      it('should detect a combined insert and delete data query with star', () => {
        expect(fetcher.getUpdateTypes(`${updateInsertDataStar};${updateDeleteDataStar}`)).toEqual({
          insert: true,
          delete: true,
        });
      });

      it('should detect a combined insert and delete data query (2 delete queries)', () => {
        expect(fetcher.getUpdateTypes(`${updateInsertData};${updateDeleteData};${updateDeleteData}`)).toEqual({
          insert: true,
          delete: true,
        });
      });

      it('should detect a combined insert and delete data query (2 delete queries) with star', () => {
        expect(fetcher.getUpdateTypes(`${updateInsertDataStar};${updateDeleteDataStar};${updateDeleteDataStar}`)).toEqual({
          insert: true,
          delete: true,
        });
      });

      it('should detect a move operation', () => {
        expect(fetcher.getUpdateTypes(updateMove)).toEqual({
          move: true,
        });
      });

      it('should detect a add operation', () => {
        expect(fetcher.getUpdateTypes(updateAdd)).toEqual({
          add: true,
        });
      });

      it('should detect a combined move and add operation', () => {
        expect(fetcher.getUpdateTypes(`${updateMove};${updateAdd}`)).toEqual({
          move: true,
          add: true,
        });
      });

      it('should detect a combined move, add, insert and delete operations', () => {
        expect(fetcher.getUpdateTypes(`${updateMove};${updateAdd};${updateInsertData};${updateDeleteData}`)).toEqual({
          move: true,
          add: true,
          insert: true,
          delete: true,
        });
      });
    });

    describe('fetchRawStream', () => {
      it('should pass the correct URL and HTTP headers', async() => {
        const fetchCbThis = jest.fn(() => Promise.resolve(new Response(streamifyString('dummy'))));
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader');
        const headers: Headers = new Headers();
        headers.append('Accept', 'myacceptheader');
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        headers.append('Content-Length', '43');
        const body = new URLSearchParams();
        body.set('query', querySelect);
        expect(fetchCbThis).toHaveBeenCalledWith(
          'https://dbpedia.org/sparql',
          expect.objectContaining({ headers, method: 'POST', body }),
        );
      });

      it('should pass the correct URL and HTTP headers with default headers', async() => {
        const fetchCbThis = jest.fn(() => Promise.resolve(new Response(streamifyString('dummy'))));
        const defaultHeaders: Headers = new Headers();
        defaultHeaders.append('Authorization', 'mytoken');
        defaultHeaders.append('Accept', 'mydefaultacceptheader');
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis, defaultHeaders });
        await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader');
        const headers: Headers = new Headers();
        headers.append('Accept', 'mydefaultacceptheader');
        headers.append('Accept', 'myacceptheader');
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        headers.append('Content-Length', '43');
        headers.append('Authorization', 'mytoken');
        const body = new URLSearchParams();
        body.set('query', querySelect);
        expect(fetchCbThis).toHaveBeenCalledWith(
          'https://dbpedia.org/sparql',
          { headers, method: 'POST', body },
        );
      });

      it('should pass the correct URL and HTTP headers with additional URL parameters', async() => {
        const fetchCbThis = jest.fn(() => Promise.resolve(new Response(streamifyString('dummy'))));
        const additionalUrlParams = new URLSearchParams({ infer: 'true', sameAs: 'false' });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis, additionalUrlParams });
        await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader');
        const headers: Headers = new Headers();
        headers.append('Accept', 'myacceptheader');
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        headers.append('Content-Length', '67');
        const body = new URLSearchParams();
        body.set('query', querySelect);
        // eslint-disable-next-line unicorn/no-array-for-each
        additionalUrlParams.forEach((value: string, key: string) => {
          body.set(key, String(value));
        });
        expect(fetchCbThis).toHaveBeenCalledWith(
          'https://dbpedia.org/sparql',
          expect.objectContaining({ headers, method: 'POST', body }),
        );
      });

      it('should pass the correct URL and HTTP headers when using HTTP GET', async() => {
        const fetchCbThis = jest.fn(() => Promise.resolve(new Response(streamifyString('dummy'))));
        const fetcherThis = new SparqlEndpointFetcher({ method: 'GET', fetch: fetchCbThis });
        await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader');
        const headers: Headers = new Headers();
        headers.append('Accept', 'myacceptheader');
        expect(fetchCbThis).toHaveBeenCalledWith(
          'https://dbpedia.org/sparql?query=SELECT%20*%20WHERE%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D',
          expect.objectContaining({ headers, method: 'GET' }),
        );
      });

      it('should pass the correct URL and HTTP headers when using HTTP GET with additional URL parameters', async() => {
        const fetchCbThis = jest.fn(() => Promise.resolve(new Response(streamifyString('dummy'))));
        const additionalUrlParams = new URLSearchParams({ infer: 'true', sameAs: 'false' });
        const fetcherThis = new SparqlEndpointFetcher({ method: 'GET', fetch: fetchCbThis, additionalUrlParams });
        await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader');
        const headers: Headers = new Headers();
        headers.append('Accept', 'myacceptheader');
        expect(fetchCbThis).toHaveBeenCalledWith(
          'https://dbpedia.org/sparql?query=SELECT%20*%20WHERE%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D&infer=true&sameAs=false',
          expect.objectContaining({ headers, method: 'GET' }),
        );
      });

      it('should reject for an invalid server response', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString('this is an invalid response'),
          headers: new Headers(),
          ok: false,
          status: 500,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader'))
          .rejects
          .toEqual(new Error('Invalid SPARQL endpoint response from https://dbpedia.org/sparql (HTTP status 500):\nthis is an invalid response'));
      });

      it('should reject when request takes longer than timeout', async() => {
        const fetchCbThis = (request: Request | string, init?: RequestInit) =>
          new Promise<Response>((resolve, reject) => {
            init!.signal!.addEventListener('abort', () => reject(new Error('Timeout')));
          });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis, timeout: 1_000 });
        const result = fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader');
        await expect(result).rejects.toEqual(new Error('Timeout'));
      });

      it('should fetch with a node stream', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(`abc`),
          headers: new Headers(),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader')).resolves.toEqual([
          '',
          streamifyString('abc'),
        ]);
      });

      it('should fetch with a web stream', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: readableStreamNodeToWeb(streamifyString('abc')),
          headers: new Headers(),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        const [ contentType, rawStream ] = await fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader');
        expect(contentType).toBe('');
        expect(rawStream).toBeInstanceOf(ReadableWebToNodeStream);
      });

      it('should throw with a missing stream', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: null,
          headers: new Headers(),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader'))
          .rejects
          .toEqual(new Error('Invalid SPARQL endpoint response from https://dbpedia.org/sparql (HTTP status 200):\nempty response'));
      });

      it('should fetch and get a dummy content type when none is provided', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString('abc'),
          headers: new Headers(),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader')).resolves.toEqual([
          '',
          streamifyString('abc'),
        ]);
      });

      it('should fetch and get the content type', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString('abc'),
          headers: new Headers({ 'Content-Type': 'abc' }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader')).resolves.toEqual([
          'abc',
          streamifyString('abc'),
        ]);
      });

      it('should fetch and get the content type that has a suffix', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString('abc'),
          headers: new Headers({ 'Content-Type': 'abc; bla' }),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchRawStream(endpoint, querySelect, 'myacceptheader')).resolves.toEqual([
          'abc',
          streamifyString('abc'),
        ]);
      });
    });

    describe('fetchUpdate', () => {
      it('should use POST and the correct content-type', async() => {
        const fetchCbThis: jest.Mock<Promise<Response>, any[]> = jest.fn(() => Promise.resolve(<Response> {
          body: {},
          headers: new Headers(),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        }));
        const defaultHeaders = new Headers({
          'Custom-Header': 'abc',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis, defaultHeaders });
        await expect(fetcherThis.fetchUpdate(endpoint, queryDelete)).resolves.toBeUndefined();
        expect(fetchCbThis.mock.calls[0][0]).toBe(endpoint);
        expect(fetchCbThis.mock.calls[0][1]).toMatchObject({
          method: 'POST',
          headers: {
            'custom-header': 'abc',
            'content-type': 'application/sparql-update',
          },
          body: queryDelete,
        });
      });

      it('should use POST without response body', async() => {
        const fetchCbThis: jest.Mock<Promise<Response>, any[]> = jest.fn(() => Promise.resolve(<Response> {
          headers: new Headers(),
          ok: true,
          status: 200,
          statusText: 'Ok!',
        }));
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchUpdate(endpoint, queryDelete)).resolves.toBeUndefined();
        expect(fetchCbThis.mock.calls[0][0]).toBe(endpoint);
        expect(fetchCbThis.mock.calls[0][1]).toMatchObject({
          method: 'POST',
          headers: {
            'content-type': 'application/sparql-update',
          },
          body: queryDelete,
        });
      });

      it('should reject for an invalid server response', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          headers: new Headers(),
          ok: false,
          status: 500,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchUpdate(endpoint, queryDelete))
          .rejects
          .toEqual(new Error('Invalid SPARQL endpoint response from https://dbpedia.org/sparql (HTTP status 500):\nempty response'));
      });
    });

    describe('fetchBindings', () => {
      it('should parse bindings', async() => {
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
        const bindings = await fetcherThis.fetchBindings(endpoint, querySelect);
        await expect(arrayifyStream(bindings)).resolves.toEqual([
          { p: DF.namedNode('p1') },
          { p: DF.namedNode('p2') },
          { p: DF.namedNode('p3') },
        ]);
      });

      it('should parse empty JSON bindings', async() => {
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
        const bindings = await fetcherThis.fetchBindings(endpoint, querySelect);
        await expect(arrayifyStream(bindings)).resolves.toEqual([]);
      });

      it('should parse empty XML bindings', async() => {
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
        const bindings = await fetcherThis.fetchBindings(endpoint, querySelect);
        await expect(arrayifyStream(bindings)).resolves.toEqual([]);
      });

      it('should parse no bindings', async() => {
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
        const bindings = await fetcherThis.fetchBindings(endpoint, querySelect);
        await expect(arrayifyStream(bindings)).resolves.toEqual([]);
      });

      it('should reject on a server error', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString('this is an invalid response'),
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: false,
          status: 500,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchBindings(endpoint, querySelect))
          .rejects
          .toEqual(new Error('Invalid SPARQL endpoint response from https://dbpedia.org/sparql (HTTP status 500):\nthis is an invalid response'));
      });

      it('should reject on an invalid content type', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(''),
          headers: new Headers({ 'Content-Type': 'bla' }),
          ok: true,
          status: 200,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchBindings(endpoint, querySelect))
          .rejects
          .toEqual(new Error('Unknown SPARQL results content type: bla'));
      });

      it('should emit the variables event', async() => {
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
        const results = await fetcherThis.fetchBindings(endpoint, querySelect);
        const p = new Promise(resolve => results.on('variables', resolve));
        await arrayifyStream(results);
        await expect(p).resolves.toEqual([ DF.variable('p') ]);
      });
    });

    describe('fetchAsk', () => {
      it('should parse true', async() => {
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
        await expect(fetcherThis.fetchAsk(endpoint, queryAsk)).resolves.toBe(true);
      });

      it('should parse false in JSON', async() => {
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
        await expect(fetcherThis.fetchAsk(endpoint, queryAsk)).resolves.toBe(false);
      });

      it('should parse false in XML', async() => {
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
        await expect(fetcherThis.fetchAsk(endpoint, queryAsk)).resolves.toBe(false);
      });

      it('should reject on an invalid response', async() => {
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
        await expect(fetcherThis.fetchAsk(endpoint, queryAsk))
          .rejects
          .toEqual(new Error('No valid ASK response was found.'));
      });

      it('should reject on a server error', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString('this is an invalid response'),
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: false,
          status: 500,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchAsk(endpoint, queryAsk))
          .rejects
          .toEqual(new Error('Invalid SPARQL endpoint response from https://dbpedia.org/sparql (HTTP status 500):\nthis is an invalid response'));
      });

      it('should reject on an invalid content type', async() => {
        const fetchCbThis = () => Promise.resolve(<Response> {
          body: streamifyString(''),
          headers: new Headers({ 'Content-Type': 'bla' }),
          ok: true,
          status: 200,
          statusText: 'Error!',
        });
        const fetcherThis = new SparqlEndpointFetcher({ fetch: fetchCbThis });
        await expect(fetcherThis.fetchAsk(endpoint, queryAsk))
          .rejects
          .toEqual(new Error('Unknown SPARQL results content type: bla'));
      });
    });

    describe('fetchTriples', () => {
      it('should parse triples', async() => {
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
        const tripleStream = await fetcherThis.fetchTriples(endpoint, queryConstruct);
        await expect(arrayifyStream(tripleStream))
          .resolves
          .toEqualRdfQuadArray([
            DF.quad(DF.namedNode('http://ex.org/s'), DF.namedNode('http://ex.org/p'), DF.namedNode('http://ex.org/o1')),
            DF.quad(DF.namedNode('http://ex.org/s'), DF.namedNode('http://ex.org/p'), DF.namedNode('http://ex.org/o2')),
          ]);
      });
    });

    describe('with a timeout', () => {
      beforeAll(() => jest.useFakeTimers());
      afterAll(() => jest.useRealTimers());

      it('should handle the timeout', async() => {
        const fetcherThis = new SparqlEndpointFetcher({ timeout: 5_000 });

        const result = fetcherThis.fetchRawStream(
          endpoint,
          querySelect,
          'myacceptheader',
        );

        jest.runAllTimers();

        await expect(result).rejects.toThrow('This operation was aborted');
      });
    });
  });
});
