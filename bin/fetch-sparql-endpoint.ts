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
  const args = await yargs(hideBin(argv))
    .example(
      '$0 https://dbpedia.org/sparql --query \'SELECT * WHERE { ?s ?p ?o } LIMIT 100\'',
      'Fetch 100 triples from the DBPedia SPARQL endpoint',
    )
    .example(
      '$0 https://dbpedia.org/sparql --file query.rq',
      'Run the SPARQL query from query.rq against the DBPedia SPARQL endpoint',
    )
    .example(
      'cat query.rq | $0 https://dbpedia.org/sparql',
      'Run the SPARQL query from query.rq against the DBPedia SPARQL endpoint',
    )
    .positional('endpoint', { type: 'string', describe: 'Send the query to this SPARQL endpoint', demandOption: true })
    .positional('query', { type: 'string', describe: 'The query to execute' })
    .options({
      query: { alias: 'q', type: 'string', describe: 'Evaluate the given SPARQL query string' },
      file: { alias: 'f', type: 'string', describe: 'Evaluate the SPARQL query in the given file' },
      get: { alias: 'g', type: 'boolean', describe: 'Send query via HTTP GET instead of POST', default: false },
    })
    .help()
    .parse();
  const endpoint = <string>args._[0];
  const queryString = await getQuery(args._.length > 1 ? <string>args._[1] : args.query, args.file);
  const fetcher = new SparqlEndpointFetcher({ method: args.get ? 'GET' : 'POST' });
  const queryType = fetcher.getQueryType(queryString);
  switch (queryType) {
    case 'SELECT':
      await querySelect(endpoint, fetcher, queryString);
      break;
    case 'ASK':
      await queryAsk(endpoint, fetcher, queryString);
      break;
    case 'CONSTRUCT':
      await queryConstruct(endpoint, fetcher, queryString);
      break;
    case 'UNKNOWN':
      if (fetcher.getUpdateTypes(queryString) !== 'UNKNOWN') {
        await update(endpoint, fetcher, queryString);
      }
      break;
  }
}

run(process.argv).then().catch(error => process.stderr.write(`${error.toString()}\n`));
