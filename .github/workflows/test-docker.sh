#!/bin/bash

# Insert data
node bin/fetch-sparql-endpoint.js --endpoint http://localhost:4000/mydataset/update --query 'insert data { <ex:s> <ex:p> <ex:o> }' > out.txt
cat out.txt
cat out.txt | grep 'OK' &> /dev/null && echo "OK" || (echo "Update failed" && exit 1)

# Test data existence
node bin/fetch-sparql-endpoint.js --endpoint http://localhost:4000/mydataset/sparql --query 'select * where { ?s ?p ?o }' > out.txt
cat out.txt
cat out.txt | grep '{"s":"ex:s","p":"ex:p","o":"ex:o"}' &> /dev/null && echo "OK" || (echo "Query failed" && exit 1)
