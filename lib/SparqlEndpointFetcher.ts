import "cross-fetch/polyfill";
import * as RDF from "rdf-js";
import {InsertDeleteOperation, ManagementOperation, Parser as SparqlParser} from "sparqljs";
import {ISettings, SparqlJsonParser} from "sparqljson-parse";
import {SparqlXmlParser} from "sparqlxml-parse";
import {Readable} from "stream";

// tslint:disable:no-var-requires
const n3 = require('n3');
const isStream = require('is-stream');
const toNodeReadable = require('web-streams-node').toNodeReadable;

/**
 * A SparqlEndpointFetcher can send queries to SPARQL endpoints,
 * and retrieve and parse the results.
 */
export class SparqlEndpointFetcher {

  public static CONTENTTYPE_SPARQL_JSON: string = 'application/sparql-results+json';
  public static CONTENTTYPE_SPARQL_XML: string = 'application/sparql-results+xml';
  public static CONTENTTYPE_SPARQL: string =
    `${SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON};q=1.0,${SparqlEndpointFetcher.CONTENTTYPE_SPARQL_XML};q=0.7`;
  public static CONTENTTYPE_TURTLE: string = 'text/turtle';

  public readonly method: 'POST' | 'GET';
  public readonly fetchCb?: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  public readonly sparqlParsers: {[contentType: string]: ISparqlResultsParser};
  public readonly sparqlJsonParser: SparqlJsonParser;
  public readonly sparqlXmlParser: SparqlXmlParser;

  constructor(args?: ISparqlEndpointFetcherArgs) {
    args = args || {};
    this.method = args.method || 'POST';
    this.fetchCb = args.fetch;
    this.sparqlJsonParser = new SparqlJsonParser(args);
    this.sparqlXmlParser = new SparqlXmlParser(args);
    this.sparqlParsers = {
      [SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON]: {
        parseBooleanStream: (sparqlResponseStream) =>
          this.sparqlJsonParser.parseJsonBooleanStream(sparqlResponseStream),
        parseResultsStream: (sparqlResponseStream) =>
          this.sparqlJsonParser.parseJsonResultsStream(sparqlResponseStream),
      },
      [SparqlEndpointFetcher.CONTENTTYPE_SPARQL_XML]: {
        parseBooleanStream: (sparqlResponseStream) =>
          this.sparqlXmlParser.parseXmlBooleanStream(sparqlResponseStream),
        parseResultsStream: (sparqlResponseStream) =>
          this.sparqlXmlParser.parseXmlResultsStream(sparqlResponseStream),
      },
    };
  }

  /**
   * Get the query type of the given query.
   *
   * This will parse the query and thrown an exception on syntax errors.
   *
   * @param {string} query A query.
   * @return {"SELECT" | "ASK" | "CONSTRUCT" | "UNKNOWN"} The query type.
   */
  public getQueryType(query: string): "SELECT" | "ASK" | "CONSTRUCT" | "UNKNOWN" {
    const parsedQuery = new SparqlParser().parse(query);
    return parsedQuery.type === 'query'
      ? (parsedQuery.queryType === 'DESCRIBE' ? 'CONSTRUCT' : parsedQuery.queryType) : "UNKNOWN";
  }

  /**
   * Get the query type of the given update query.
   *
   * This will parse the update query and thrown an exception on syntax errors.
   *
   * @param {string} query An update query.
   * @return {'UNKNOWN' | UpdateTypes} The included update operations.
   */
  public getUpdateTypes(query: string): 'UNKNOWN' | IUpdateTypes {
    const parsedQuery = new SparqlParser().parse(query);

    if (parsedQuery.type === 'update') {
      const operations: IUpdateTypes = {};

      for (const update of parsedQuery.updates) {
        if ('type' in update) {
          operations[update.type] = true;
        } else {
          operations[update.updateType] = true;
        }
      }

      return operations;

    } else {
      return "UNKNOWN"
    };
  };

  /**
   * Send a SELECT query to the given endpoint URL and return the resulting bindings stream.
   * @see IBindings
   * @param {string} endpoint A SPARQL endpoint URL. (without the `?query=` suffix).
   * @param {string} query    A SPARQL query string.
   * @return {Promise<NodeJS.ReadableStream>} A stream of {@link IBindings}.
   */
  public async fetchBindings(endpoint: string, query: string): Promise<NodeJS.ReadableStream> {
    const [contentType, responseStream]: [string, NodeJS.ReadableStream] = await this
      .fetchRawStream(endpoint, query, SparqlEndpointFetcher.CONTENTTYPE_SPARQL);
    const parser: ISparqlResultsParser = this.sparqlParsers[contentType];
    if (!parser) {
      throw new Error('Unknown SPARQL results content type: ' + contentType);
    }
    return parser.parseResultsStream(responseStream);
  }

  /**
   * Send an ASK query to the given endpoint URL and return a promise resolving to the boolean answer.
   * @param {string} endpoint A SPARQL endpoint URL. (without the `?query=` suffix).
   * @param {string} query    A SPARQL query string.
   * @return {Promise<boolean>} A boolean resolving to the answer.
   */
  public async fetchAsk(endpoint: string, query: string): Promise<boolean> {
    const [contentType, responseStream]: [string, NodeJS.ReadableStream] = await this
      .fetchRawStream(endpoint, query, SparqlEndpointFetcher.CONTENTTYPE_SPARQL);
    const parser: ISparqlResultsParser = this.sparqlParsers[contentType];
    if (!parser) {
      throw new Error('Unknown SPARQL results content type: ' + contentType);
    }
    return parser.parseBooleanStream(responseStream);
  }

  /**
   * Send a CONSTRUCT/DESCRIBE query to the given endpoint URL and return the resulting triple stream.
   * @param {string} endpoint A SPARQL endpoint URL. (without the `?query=` suffix).
   * @param {string} query    A SPARQL query string.
   * @return {Promise<Stream>} A stream of triples.
   */
  public async fetchTriples(endpoint: string, query: string): Promise<Readable & RDF.Stream> {
    const rawStream = (await this.fetchRawStream(endpoint, query, SparqlEndpointFetcher.CONTENTTYPE_TURTLE))[1];
    return rawStream.pipe(new n3.StreamParser({ format: SparqlEndpointFetcher.CONTENTTYPE_TURTLE }));
  }

  /**
   * Send an update query to the given endpoint URL using POST.
   *
   * @param {string} endpoint     A SPARQL endpoint URL. (without the `?query=` suffix).
   * @param {string} query        A SPARQL query string.
   */
  public async fetchUpdate(endpoint: string, query: string): Promise<void> {
    const init = {
      method: 'POST',
      headers: {
        'content-type': 'application/sparql-update',
      },
      body: query,
    }

    await this.handleFetchCall(endpoint, init, { killBody: true });
  }

  /**
   * Send a query to the given endpoint URL and return the resulting stream.
   *
   * This will only accept responses with the application/sparql-results+json content type.
   *
   * @param {string} endpoint     A SPARQL endpoint URL. (without the `?query=` suffix).
   * @param {string} query        A SPARQL query string.
   * @param {string} acceptHeader The HTTP accept to use.
   * @return {Promise<[string, NodeJS.ReadableStream]>} The content type and SPARQL endpoint response stream.
   */
  public async fetchRawStream(endpoint: string, query: string, acceptHeader: string)
    : Promise<[string, NodeJS.ReadableStream]> {
    const url: string = this.method === 'POST' ? endpoint : endpoint + '?query=' + encodeURIComponent(query);

    // Initiate request
    const headers: Headers = new Headers();
    let body: BodyInit | undefined;
    headers.append('Accept', acceptHeader);
    if (this.method === 'POST') {
      headers.append('Content-Type', 'application/x-www-form-urlencoded');
      body = new URLSearchParams();
      body.set('query', query);
    }

    return this.handleFetchCall(url, { headers, method: this.method, body });
  }

  /**
   * Helper function to generalize internal fetch calls.
   *
   * @param {string}      url     The URL to call.
   * @param {RequestInit} init    Options to pass along to the fetch call.
   * @param {any}         options Other specific fetch options.
   * @return {Promise<[string, NodeJS.ReadableStream]>} The content type and SPARQL endpoint response stream.
   */
  private async handleFetchCall(
    url: string,
    init: RequestInit,
    options: { killBody?: boolean } = {},
  ): Promise<[string, NodeJS.ReadableStream]> {
    const httpResponse: Response = await (this.fetchCb || fetch)(url, init);

    let responseStream: NodeJS.ReadableStream | undefined;
    // Handle response body
    if (options.killBody) {
      await httpResponse.body?.cancel();
    } else {
      // Wrap WhatWG readable stream into a Node.js readable stream
      // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
      responseStream = isStream(httpResponse.body)
        ? httpResponse.body : toNodeReadable(httpResponse.body);
    }

    // Determine the content type and emit it to the stream
    let contentType = httpResponse.headers.get('Content-Type') || '';
    if (contentType.indexOf(';') > 0) {
      contentType = contentType.substr(0, contentType.indexOf(';'));
    }

    // Emit an error if the server returned an invalid response
    if (!httpResponse.ok) {
      const simpleUrl = /^[^?]*/u.exec(url)![0];
      throw new Error('Invalid SPARQL endpoint (' + simpleUrl + ') response: ' + httpResponse.statusText);
    }

    return [ contentType, <any> responseStream ];
  }
}

export interface ISparqlEndpointFetcherArgs extends ISettings {
  /**
   * A custom HTTP method for issuing (non-update) queries, defaults to POST.
   * Update queries are always issued via POST.
   */
  method?: 'POST' | 'GET';
  /**
   * A custom fetch function.
   */
  fetch?: (input?: Request | string, init?: RequestInit) => Promise<Response>;
}

export interface IBindings {
  [key: string]: RDF.Term;
}

export interface ISparqlResultsParser {
  parseResultsStream(sparqlResponseStream: NodeJS.ReadableStream): NodeJS.ReadableStream;
  parseBooleanStream(sparqlResponseStream: NodeJS.ReadableStream): Promise<boolean>;
}

export type IUpdateTypes = {
  [K in ManagementOperation['type'] | InsertDeleteOperation['updateType']]?: boolean;
};
