import {blankNode, literal, namedNode} from "rdf-data-model";
import {SparqlEndpointFetcher} from "../lib/SparqlEndpointFetcher";

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
  });

});
