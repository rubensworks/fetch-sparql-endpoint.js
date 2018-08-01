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

  /**
   * Convert a SPARQL JSON result binding to a bindings object.
   * @param rawBindings A SPARQL json result binding.
   * @return {Bindings} A bindings object.
   */
  public parseJsonBindings(rawBindings: any): Bindings {
    const bindings: Bindings = {};
    for (const key in rawBindings) {
      const rawValue: any = rawBindings[key];
      let value: RDF.Term = null;
      switch (rawValue.type) {
      case 'bnode':
        value = this.dataFactory.blankNode(rawValue.value);
        break;
      case 'literal':
        if (rawValue['xml:lang']) {
          value = this.dataFactory.literal(rawValue.value, rawValue['xml:lang']);
        } else if (rawValue.datatype) {
          value = this.dataFactory.literal(rawValue.value, this.dataFactory.namedNode(rawValue.datatype));
        } else {
          value = this.dataFactory.literal(rawValue.value);
        }
        break;
      default:
        value = this.dataFactory.namedNode(rawValue.value);
        break;
      }
      bindings['?' + key] = value;
    }
    return bindings;
  }

}

export interface ISparqlEndpointFetcherArgs {
  fetch?: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  dataFactory?: RDF.DataFactory;
}

export type Bindings = {[key: string]: RDF.Term};
