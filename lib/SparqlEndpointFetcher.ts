import * as RDF from "rdf-js";

/**
 * A SparqlEndpointFetcher can send queries to SPARQL endpoints,
 * and retrieve and parse the results.
 */
export class SparqlEndpointFetcher {

  public readonly fetchCb: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  public readonly dataFactory: RDF.DataFactory;

  constructor(args?: ISparqlEndpointFetcherArgs) {
    args = args || {};
    this.fetchCb = args.fetch || require('isomorphic-fetch');
    this.dataFactory = args.dataFactory || require('rdf-data-model');
  }

}

export interface ISparqlEndpointFetcherArgs {
  fetch?: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  dataFactory?: RDF.DataFactory;
}
