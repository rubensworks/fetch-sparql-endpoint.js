import {SparqlEndpointFetcher} from "../lib/SparqlEndpointFetcher";

describe('SparqlEndpointFetcher', () => {

  describe('constructed without fetch callback', () => {
    it('should have the default fetch function', async () => {
      return expect(new SparqlEndpointFetcher().fetchCb).toBe(require('isomorphic-fetch'));
    });
  });

  describe('constructed with fetch callback', () => {

    let fetchCb;
    let fetcher;

    beforeEach(() => {
      fetchCb = (url) => Promise.resolve(new Response('dummy'));
      fetcher = new SparqlEndpointFetcher(fetchCb);
    });

    it('should have the default fetch function', async () => {
      return expect(fetcher.fetchCb).toBe(fetchCb);
    });
  });

});
