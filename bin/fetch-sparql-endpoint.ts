#!/usr/bin/env node

import {readFileSync} from "fs";
import minimist = require("minimist");
import {quadToStringQuad, termToString} from "rdf-string";
import {SparqlEndpointFetcher} from "../index";

// tslint:disable-next-line:no-var-requires
const n3 = require('n3');

process.argv.splice(0, 2);
const args = minimist(process.argv);
if (args._.length === 0 || args._.length > 2 || args.h || args.help) {

  // Print command usage
  process.stderr.write(`fetch-sparql-endpoint Sends a query to a SPARQL endpoint

Usage:
  fetch-sparql-endpoint https://dbpedia.org/sparql [-q] 'SELECT * WHERE { ?s ?p ?o } 100'
  fetch-sparql-endpoint https://dbpedia.org/sparql -f query.sparql
  cat query.sparql | fetch-sparql-endpoint https://dbpedia.org/sparql

Options:
  -q            evaluate the given SPARQL query string
  -f            evaluate the SPARQL query in the given file
  -g            send query via HTTP GET instead of POST
  --help        print this help message
`);
  process.exit(1);
}

async function getQuery(): Promise<string> {
  if (args._.length > 1) {
    return args._[1];
  } else if (args.q) {
    return args.q;
  } else if (args.f) {
    return readFileSync(args.f, { encoding: 'utf8' });
  } else {
    // tslint:disable-next-line:no-var-requires
    return await require('stream-to-string')(process.stdin);
  }
}

const endpoint = args._[0];

getQuery().then((query) => {
  const fetcher = new SparqlEndpointFetcher({
    method: args.g ? 'GET' : 'POST',
  });
  const queryType = fetcher.getQueryType(query);
  switch (queryType) {
  case 'SELECT':
    querySelect(fetcher, query);
    break;
  case 'ASK':
    queryAsk(fetcher, query);
    break;
  case 'CONSTRUCT':
    queryConstruct(fetcher, query);
    break;
  case 'UNKNOWN':
    if (fetcher.getUpdateTypes(query) !== 'UNKNOWN') {
      update(fetcher, query);
    }
    break;
  }
});

function querySelect(fetcher: SparqlEndpointFetcher, query: string) {
  fetcher.fetchBindings(endpoint, query)
    .then((bindingsStream) => {
      bindingsStream.on('data', (bindings) => {
        for (const variable of Object.keys(bindings)) {
          bindings[variable] = termToString(bindings[variable]);
        }
        process.stdout.write(JSON.stringify(bindings) + '\n');
      });
    })
    .catch((error) => {
      process.stderr.write(error.message + '\n');
      process.exit(1);
    });
}

function queryAsk(fetcher: SparqlEndpointFetcher, query: string) {
  fetcher.fetchAsk(endpoint, query)
    .then((answer) => {
      process.stdout.write(answer + '\n');
    })
    .catch((error) => {
      process.stderr.write(error.message + '\n');
      process.exit(1);
    });
}

function queryConstruct(fetcher: SparqlEndpointFetcher, query: string) {
  fetcher.fetchTriples(endpoint, query)
    .then((tripleStream) => {
      (<any> tripleStream)
        .pipe(new n3.StreamWriter(SparqlEndpointFetcher.CONTENTTYPE_TURTLE))
        .pipe(process.stdout);
    })
    .catch((error) => {
      process.stderr.write(error.message + '\n');
      process.exit(1);
    });
}

function update(fetcher: SparqlEndpointFetcher, query: string) {
  fetcher.fetchUpdate(endpoint, query)
    .then(() => {
      process.stdout.write('OK\n');
    })
    .catch((error) => {
      process.stderr.write(error.message + '\n');
      process.exit(1);
    });
}
