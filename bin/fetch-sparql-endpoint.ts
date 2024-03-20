#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { StreamWriter } from 'n3';
import { termToString } from 'rdf-string';
import * as streamToString from 'stream-to-string';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { SparqlEndpointFetcher, type IBindings } from '..';

async function getQuery(query?: string, file?: string): Promise<string> {
  if (query) {
    return query;
  }
  if (file) {
    readFileSync(file, { encoding: 'utf-8' });
  }
  return streamToString(process.stdin);
}

function querySelect(endpoint: string, fetcher: SparqlEndpointFetcher, query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fetcher.fetchBindings(endpoint, query).then(bindingsStream => bindingsStream
      .on('data', (bindings: IBindings) => {
        process.stdout.write(`${JSON.stringify(Object.fromEntries(Object.entries(bindings).map(([ key, value ]) => [
          key,
          termToString(value),
        ])))}\n`);
      })
      .on('error', reject)
      .on('end', resolve)).catch(reject);
  });
}

function queryAsk(endpoint: string, fetcher: SparqlEndpointFetcher, query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fetcher.fetchAsk(endpoint, query)
      .then((answer) => {
        process.stdout.write(`${answer}\n`);
        resolve();
      })
      .catch(reject);
  });
}

function queryConstruct(endpoint: string, fetcher: SparqlEndpointFetcher, query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fetcher.fetchTriples(endpoint, query)
      .then(tripleStream => tripleStream
        .on('error', reject)
        .pipe(new StreamWriter(SparqlEndpointFetcher.CONTENTTYPE_TURTLE))
        .pipe(process.stdout)
        .on('end', resolve)).catch(reject);
  });
}

function update(endpoint: string, fetcher: SparqlEndpointFetcher, query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fetcher.fetchUpdate(endpoint, query).then(() => {
      process.stdout.write('OK\n');
      resolve();
    }).catch(reject);
  });
}

async function run(argv: string[]): Promise<void> {
  const args = await yargs(hideBin(argv), 'Sends a query to a SPARQL endpoint')
    .example(
      '$0 --endpoint https://dbpedia.org/sparql --query \'SELECT * WHERE { ?s ?p ?o } LIMIT 100\'',
      'Fetch 100 triples from the DBPedia SPARQL endpoint',
    )
    .example(
      '$0 --endpoint https://dbpedia.org/sparql --file query.rq',
      'Run the SPARQL query from query.rq against the DBPedia SPARQL endpoint',
    )
    .example(
      'cat query.rq | $0 --endpoint https://dbpedia.org/sparql',
      'Run the SPARQL query from query.rq against the DBPedia SPARQL endpoint',
    )
    .options({
      endpoint: { type: 'string', describe: 'Send the query to this SPARQL endpoint', demandOption: true },
      query: { type: 'string', describe: 'Evaluate the given SPARQL query string' },
      file: { type: 'string', describe: 'Evaluate the SPARQL query in the given file' },
      get: { type: 'boolean', describe: 'Send query via HTTP GET instead of POST', default: false },
      timeout: { type: 'number', describe: 'The timeout value in seconds to finish the query' },
      auth: { choices: [ 'basic' ], describe: 'The type of authentication to use' },
    })
    .check((arg) => {
      if (arg.auth === 'basic' && (!process.env.SPARQL_USERNAME || !process.env.SPARQL_PASSWORD)) {
        throw new Error('Basic authentication requires the SPARQL_USERNAME and SPARQL_PASSWORD environment variables.');
      }
      return true;
    })
    .version()
    .help('help')
    .parse();
  const queryString = await getQuery(args.query, args.file);
  let defaultHeaders: Headers | undefined;
  if (args.auth === 'basic') {
    defaultHeaders = new Headers({
      authorization: `Basic ${Buffer.from(`${process.env.SPARQL_USERNAME}:${process.env.SPARQL_PASSWORD}`, 'binary').toString('base64')}`,
    });
  }
  const fetcher = new SparqlEndpointFetcher({
    method: args.get ? 'GET' : 'POST',
    timeout: args.timeout ? args.timeout * 1_000 : undefined,
    defaultHeaders,
  });
  const queryType = fetcher.getQueryType(queryString);
  switch (queryType) {
    case 'SELECT':
      await querySelect(args.endpoint, fetcher, queryString);
      break;
    case 'ASK':
      await queryAsk(args.endpoint, fetcher, queryString);
      break;
    case 'CONSTRUCT':
      await queryConstruct(args.endpoint, fetcher, queryString);
      break;
    case 'UNKNOWN':
      if (fetcher.getUpdateTypes(queryString) !== 'UNKNOWN') {
        await update(args.endpoint, fetcher, queryString);
      }
      break;
  }
}

run(process.argv).then().catch((error: Error) => process.stderr.write(`${error.name}: ${error.message}\n${error.stack}`));
