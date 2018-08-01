import "isomorphic-fetch";
import * as RDF from "rdf-js";
import {Transform} from "stream";

/**
 * A SparqlEndpointFetcher can send queries to SPARQL endpoints,
 * and retrieve and parse the results.
 */
export class SparqlEndpointFetcher {

  public readonly fetchCb: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  public readonly dataFactory: RDF.DataFactory;

  constructor(args?: ISparqlEndpointFetcherArgs) {
    args = args || {};
    this.fetchCb = args.fetch || fetch;
    this.dataFactory = args.dataFactory || require('rdf-data-model');
  }

  /**
   * Convert a SPARQL JSON result binding to a bindings object.
   * @param rawBindings A SPARQL json result binding.
   * @return {Bindings} A bindings object.
   */
  public parseJsonBindings(rawBindings: any): IBindings {
    const bindings: IBindings = {};
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

  /**
   * Send a SELECT query to the given endpoint URL and return the resulting bindings stream.
   * @see IBindings
   * @param {string} endpoint A SPARQL endpoint URL. (without the `?query=` suffix).
   * @param {string} query    A SPARQL query string.
   * @return {Promise<NodeJS.ReadableStream>} A stream of {@link IBindings}.
   */
  public async fetchBindings(endpoint: string, query: string): Promise<NodeJS.ReadableStream> {
    const rawStream = await this.fetchRawStream(endpoint, query);
    return rawStream
      .pipe(require('JSONStream').parse('results.bindings.*'))
      .pipe(new Transform({
        objectMode: true,
        transform: (rawBinding, encoding, cb) => cb(null, this.parseJsonBindings(rawBinding)),
      }));
  }

  /**
   * Send a query to the given endpoint URL and return the resulting stream.
   *
   * This will only accept responses with the application/sparql-results+json content type.
   *
   * @param {string} endpoint A SPARQL endpoint URL. (without the `?query=` suffix).
   * @param {string} query    A SPARQL query string.
   * @return {Promise<NodeJS.ReadableStream>} The SPARQL endpoint response stream.
   */
  public async fetchRawStream(endpoint: string, query: string): Promise<NodeJS.ReadableStream> {
    const url: string = endpoint + '?query=' + encodeURIComponent(query);

    // Initiate request
    const headers: Headers = new Headers();
    headers.append('Accept', 'application/sparql-results+json');
    const httpResponse: Response = await this.fetchCb(url, { headers });

    // Wrap WhatWG readable stream into a Node.js readable stream
    // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
    const responseStream: NodeJS.ReadableStream = require('is-stream')(httpResponse.body)
      ? httpResponse.body : require('node-web-streams').toNodeReadable(httpResponse.body);

    // Emit an error if the server returned an invalid response
    if (!httpResponse.ok) {
      setImmediate(() => responseStream.emit('error',
        new Error('Invalid SPARQL endpoint (' + endpoint + ') response: ' + httpResponse.statusText)));
    }

    return responseStream;
  }

}

export interface ISparqlEndpointFetcherArgs {
  fetch?: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  dataFactory?: RDF.DataFactory;
}

export interface IBindings {
  [key: string]: RDF.Term;
}
