/**
 * A SparqlEndpointFetcher can send queries to SPARQL endpoints,
 * and retrieve and parse the results.
 */
export class SparqlEndpointFetcher {

  public readonly fetchCb?: (input?: Request | string, init?: RequestInit) => Promise<Response>;

  constructor(fetchCb?: (input?: Request | string, init?: RequestInit) => Promise<Response>) {
    this.fetchCb = fetchCb || require('isomorphic-fetch');
  }

}
