#!/usr/bin/env node

import { readFileSync } from 'fs';
import { StreamWriter } from 'n3';
import { termToString } from 'rdf-string';
import * as streamToString from 'stream-to-string';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { SparqlEndpointFetcher } from '..';

async function getQuery(stdin: boolean, query?: string, file?: string): Promise<string> {
  if (stdin) {
    return streamToString(process.stdin);
  }
  if (query) {
    return query;
  }
  if (file) {
    readFileSync(file, { encoding: 'utf-8' });
  }
  throw new Error('No query proviced');
}

function querySelect(endpoint: string, fetcher: SparqlEndpointFetcher, query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fetcher.fetchBindings(endpoint, query).then(bindingsStream => bindingsStream
      .on('data', bindings => {
        for (const variable of Object.keys(bindings)) {
          bindings[variable] = termToString(bindings[variable]);
        }
        process.stdout.write(`${JSON.stringify(bindings)}\n`);
      })
      .on('error', reject)
      .on('end', resolve)).catch(reject);
  });
}

function queryAsk(endpoint: string, fetcher: SparqlEndpointFetcher, query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fetcher.fetchAsk(endpoint, query)
      .then(answer => {
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
  const args = await yargs(hideBin(argv))
    .example(
      '$0 --endpoint https://dbpedia.org/sparql --query \'SELECT * WHERE { ?s ?p ?o } LIMIT 100\'',
      'Fetch 100 triples from the DBPedia SPARQL endpoint',
    )
    .example(
      '$0 --endpoint https://dbpedia.org/sparql --file query.rq',
      'Run the SPARQL query from query.rq against the DBPedia SPARQL endpoint',
    )
    .example(
      'cat query.rq | $0 --endpoint https://dbpedia.org/sparql --stdin',
      'Run the SPARQL query from query.rq against the DBPedia SPARQL endpoint',
    )
    .options({
      endpoint: { type: 'string', describe: 'Send the query to this SPARQL endpoint' },
      query: { type: 'string', describe: 'Evaluate the given SPARQL query string' },
      file: { type: 'string', describe: 'Evaluate the SPARQL query in the given file' },
      stdin: { type: 'boolean', describe: 'Read the query from stdin', default: false },
      get: { type: 'boolean', describe: 'Send query via HTTP GET instead of POST', default: false },
    })
    .demandOption('endpoint')
    .check(arg => {
      if ([ arg.query !== undefined, arg.file !== undefined, arg.stdin ].filter(ar => ar).length !== 1) {
        throw new Error('Exactly one of query, file, stdin required');
      }
      return true;
    })
    .help()
    .parse();
  const queryString = await getQuery(args.stdin, args.query, args.file);
  const fetcher = new SparqlEndpointFetcher({ method: args.get ? 'GET' : 'POST' });
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

run(process.argv).then().catch(error => process.stderr.write(`${error.toString()}\n`));
