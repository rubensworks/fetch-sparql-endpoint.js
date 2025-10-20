import type * as RDF from '@rdfjs/types';
import { Parser as SparqlParser } from '@traqula/parser-sparql-1-2';
import type { UpdateOperation } from '@traqula/rules-sparql-1-2';
import * as isStream from 'is-stream';
import { StreamParser } from 'n3';
import { readableFromWeb } from 'readable-from-web';
import type { Readable } from 'readable-stream';
import { type ISettings as ISparqlJsonParserArgs, SparqlJsonParser } from 'sparqljson-parse';
import { type ISettings as ISparqlXmlParserArgs, SparqlXmlParser } from 'sparqlxml-parse';
import * as stringifyStream from 'stream-to-string';

/**
 * A SparqlEndpointFetcher can send queries to SPARQL endpoints,
 * and retrieve and parse the results.
 */
export class SparqlEndpointFetcher {
  public static readonly CONTENTTYPE_SPARQL_JSON = 'application/sparql-results+json';
  public static readonly CONTENTTYPE_SPARQL_XML = 'application/sparql-results+xml';
  public static readonly CONTENTTYPE_TURTLE = 'text/turtle';
  public static readonly CONTENTTYPE_SPARQL = `${SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON};q=1.0,${SparqlEndpointFetcher.CONTENTTYPE_SPARQL_XML};q=0.7`;

  protected readonly method: 'GET' | 'POST';
  protected readonly timeout?: number;
  protected readonly forceGetIfUrlLengthBelow: number;
  protected readonly directPost: boolean;
  public additionalUrlParams: URLSearchParams;
  protected readonly defaultHeaders: Headers;
  public readonly fetchCb?: (input: Request | string, init?: RequestInit) => Promise<Response>;

  protected readonly sparqlQueryParser: SparqlParser;
  protected readonly sparqlParsers: Record<string, ISparqlResultsParser>;
  protected readonly sparqlJsonParser: SparqlJsonParser;
  protected readonly sparqlXmlParser: SparqlXmlParser;

  public constructor(args?: ISparqlEndpointFetcherArgs) {
    this.method = args?.method ?? 'POST';
    this.timeout = args?.timeout;
    this.forceGetIfUrlLengthBelow = args?.forceGetIfUrlLengthBelow ?? 0;
    this.directPost = args?.directPost ?? false;
    this.additionalUrlParams = args?.additionalUrlParams ?? new URLSearchParams();
    this.defaultHeaders = args?.defaultHeaders ?? new Headers();
    this.fetchCb = args?.fetch;
    this.sparqlQueryParser = new SparqlParser({
      lexerConfig: {
        positionTracking: 'onlyOffset',
      },
    });
    this.sparqlJsonParser = new SparqlJsonParser(args);
    this.sparqlXmlParser = new SparqlXmlParser(args);
    this.sparqlParsers = {
      [SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON]: {
        parseBooleanStream: sparqlResponseStream =>
          this.sparqlJsonParser.parseJsonBooleanStream(sparqlResponseStream),
        parseResultsStream: sparqlResponseStream =>
          this.sparqlJsonParser.parseJsonResultsStream(sparqlResponseStream),
      },
      [SparqlEndpointFetcher.CONTENTTYPE_SPARQL_XML]: {
        parseBooleanStream: sparqlResponseStream =>
          this.sparqlXmlParser.parseXmlBooleanStream(sparqlResponseStream),
        parseResultsStream: sparqlResponseStream =>
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
   * @return {'SELECT' | 'ASK' | 'CONSTRUCT' | 'UNKNOWN'} The query type.
   */
  public getQueryType(query: string): 'SELECT' | 'ASK' | 'CONSTRUCT' | 'UNKNOWN' {
    const parsedQuery = this.sparqlQueryParser.parse(query);
    if (parsedQuery.type === 'query') {
      return parsedQuery.subType === 'describe' ?
        'CONSTRUCT' :
        <Uppercase<typeof parsedQuery.subType>>parsedQuery.subType.toUpperCase();
    }
    return 'UNKNOWN';
  }

  /**
   * Get the query type of the given update query.
   *
   * This will parse the update query and thrown an exception on syntax errors.
   *
   * @param {string} query An update query.
   * @return {'UNKNOWN' | IUpdateTypes} The included update operations.
   */
  public getUpdateTypes(query: string): 'UNKNOWN' | IUpdateTypes {
    const parsedQuery = this.sparqlQueryParser.parse(query);
    if (parsedQuery.type === 'update') {
      const operations: IUpdateTypes = {};
      for (const update of parsedQuery.updates) {
        if (update.operation) {
          operations[update.operation.subType] = true;
        }
      }
      return operations;
    }
    return 'UNKNOWN';
  }

  /**
   * Send a SELECT query to the given endpoint URL and return the resulting bindings stream.
   * @see IBindings
   * @param {string} endpoint A SPARQL endpoint URL. (without the `?query=` suffix).
   * @param {string} query    A SPARQL query string.
   * @return {Promise<NodeJS.ReadableStream>} A stream of {@link IBindings}.
   */
  public async fetchBindings(endpoint: string, query: string): Promise<NodeJS.ReadableStream> {
    const [ contentType, responseStream ] = await this.fetchRawStream(
      endpoint,
      query,
      SparqlEndpointFetcher.CONTENTTYPE_SPARQL,
    );
    const parser: ISparqlResultsParser | undefined = this.sparqlParsers[contentType];
    if (!parser) {
      throw new Error(`Unknown SPARQL results content type: ${contentType}`);
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
    const [ contentType, responseStream ] = await this.fetchRawStream(
      endpoint,
      query,
      SparqlEndpointFetcher.CONTENTTYPE_SPARQL,
    );
    const parser: ISparqlResultsParser | undefined = this.sparqlParsers[contentType];
    if (!parser) {
      throw new Error(`Unknown SPARQL results content type: ${contentType}`);
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
    const [ contentType, responseStream ] = await this.fetchRawStream(
      endpoint,
      query,
      SparqlEndpointFetcher.CONTENTTYPE_TURTLE,
    );
    return <Readable> <unknown> responseStream.pipe(new StreamParser({ format: contentType }));
  }

  /**
   * Send an update query to the given endpoint URL using POST.
   *
   * @param {string} endpoint     A SPARQL endpoint URL. (without the `?query=` suffix).
   * @param {string} query        A SPARQL query string.
   */
  public async fetchUpdate(endpoint: string, query: string): Promise<void> {
    const abortController = new AbortController();
    const defaultHeadersRaw: Record<string, string> = {};

    // Headers object does not have other means to iterate it according to the typings
    // eslint-disable-next-line unicorn/no-array-for-each
    this.defaultHeaders.forEach((value, key) => {
      defaultHeadersRaw[key] = value;
    });

    const init: RequestInit = {
      method: 'POST',
      headers: {
        ...defaultHeadersRaw,
        'content-type': 'application/sparql-update',
      },
      body: query,
      signal: abortController.signal,
    };

    await this.handleFetchCall(endpoint, init, { ignoreBody: true });
    abortController.abort();
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
  public async fetchRawStream(
    endpoint: string,
    query: string,
    acceptHeader: string,
  ): Promise<[ string, NodeJS.ReadableStream ]> {
    let method: 'GET' | 'POST';
    let url: string;

    if (this.method === 'POST' && this.forceGetIfUrlLengthBelow <= endpoint.length) {
      method = this.method;
      url = endpoint;
    } else {
      const getEndpoint = `${endpoint}?query=${encodeURIComponent(query)}`;
      method = this.method === 'GET' || getEndpoint.length < this.forceGetIfUrlLengthBelow ? 'GET' : 'POST';
      url = method === 'POST' ? endpoint : getEndpoint;
    }

    // Initiate request
    let body: URLSearchParams | string | undefined;
    const headers: Headers = new Headers(this.defaultHeaders);
    headers.append('Accept', acceptHeader);

    if (method === 'POST') {
      if (this.directPost) {
        headers.append('Content-Type', 'application/sparql-query');
        body = query;
        if (this.additionalUrlParams.toString().length > 0) {
          url += `?${this.additionalUrlParams.toString()}`;
        }
      } else {
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        body = new URLSearchParams();
        body.set('query', query);
        for (const [ key, value ] of this.additionalUrlParams.entries()) {
          body.set(key, value);
        }
      }
      headers.append('Content-Length', body.toString().length.toString());
    } else if (this.additionalUrlParams.toString().length > 0) {
      url += `&${this.additionalUrlParams.toString()}`;
    }

    return this.handleFetchCall(url, { headers, method, body });
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
    options?: { ignoreBody: boolean },
  ): Promise<[ string, NodeJS.ReadableStream ]> {
    let timeout;
    let responseStream: NodeJS.ReadableStream | undefined;

    if (this.timeout) {
      const controller = new AbortController();
      init.signal = controller.signal;
      timeout = setTimeout(() => controller.abort(), this.timeout);
    }

    const httpResponse: Response = await (this.fetchCb ?? fetch)(url, init);

    clearTimeout(timeout);

    // Handle response body
    if (!options?.ignoreBody && httpResponse.body) {
      // Wrap WhatWG readable stream into a Node.js readable stream
      // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
      responseStream = <NodeJS.ReadableStream> (
        isStream(httpResponse.body) ? httpResponse.body : readableFromWeb(httpResponse.body)
      );
    }

    // Emit an error if the server returned an invalid response
    if (!httpResponse.ok || (!responseStream && !options?.ignoreBody)) {
      const simpleUrl = url.split('?').at(0);
      const bodyString = responseStream ? await stringifyStream(responseStream) : 'empty response';
      throw new Error(`Invalid SPARQL endpoint response from ${simpleUrl} (HTTP status ${httpResponse.status}):\n${bodyString}`);
    }

    // Determine the content type
    const contentType = httpResponse.headers.get('Content-Type')?.split(';').at(0) ?? '';

    return [ contentType, responseStream! ];
  }
}

export interface ISparqlEndpointFetcherArgs extends ISparqlJsonParserArgs, ISparqlXmlParserArgs {
  /**
   * A custom HTTP method for issuing (non-update) queries, defaults to POST.
   * Update queries are always issued via POST.
   */
  method?: 'POST' | 'GET';
  additionalUrlParams?: URLSearchParams;
  timeout?: number;
  forceGetIfUrlLengthBelow?: number;
  directPost?: boolean;
  defaultHeaders?: Headers;
  /**
   * A custom fetch function.
   */
  fetch?: (input: Request | string, init?: RequestInit) => Promise<Response>;
}

export interface ISparqlResultsParser {
  parseResultsStream: (sparqlResponseStream: NodeJS.ReadableStream) => NodeJS.ReadableStream;
  parseBooleanStream: (sparqlResponseStream: NodeJS.ReadableStream) => Promise<boolean>;
}

export type IBindings = Record<string, RDF.Term>;

export type IUpdateTypes = {
  [K in UpdateOperation['subType']]?: boolean;
};
