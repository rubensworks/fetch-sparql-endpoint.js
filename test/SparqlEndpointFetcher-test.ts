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
  });

});
