#!/bin/bash

jena_port=4000
jena_name=endpoint
jena_image=stain/jena-fuseki:4.8.0
jena_dataset=mydataset
jena_password=pw
jena_username=admin
cli_timeout=10

if [ "$1" = "start" ]; then
  echo "Starting Jena container with name $jena_name using $jena_image"
  docker pull "$jena_image"
  docker container create \
    --name "$jena_name" \
    --publish "$jena_port":3030 \
    --env FUSEKI_DATASET_1="$jena_dataset" \
    --env ADMIN_PASSWORD="$jena_password" \
    "$jena_image"
  docker start "$jena_name"

elif [ "$1" = "stop" ]; then
  echo "Stopping Jena container with name $jena_name"
  docker stop "$jena_name"
  docker container remove "$jena_name"

elif [ "$1" = "test" ]; then
  echo "Testing the command line tool against the Jena SPARQL endpoint with basic auth..."

  result=$( \
    SPARQL_USERNAME="$jena_username" SPARQL_PASSWORD="$jena_password" node bin/fetch-sparql-endpoint.js \
      --endpoint "http://localhost:$jena_port/$jena_dataset/update" \
      --query 'insert data { <ex:s> <ex:p> <ex:o> }' \
      --auth basic \
      --timeout "$cli_timeout" \
  )
  echo "$result" | grep 'OK' &> /dev/null && echo "SPARQL UPDATE OK" || (echo "SPARQL UPDATE failed: $result" && exit 1)

  result=$( \
    SPARQL_USERNAME="$jena_username" SPARQL_PASSWORD="$jena_password" node bin/fetch-sparql-endpoint.js \
      --endpoint "http://localhost:$jena_port/$jena_dataset/sparql" \
      --query 'ask where { <ex:s> <ex:p> <ex:o> }' \
      --auth basic \
      --timeout "$cli_timeout" \
  )
  echo "$result" | grep 'true' &> /dev/null && echo "SPARQL ASK OK" || (echo "SPARQL ASK failed: $result" && exit 1)

  result=$( \
    SPARQL_USERNAME="$jena_username" SPARQL_PASSWORD="$jena_password" node bin/fetch-sparql-endpoint.js \
      --endpoint "http://localhost:$jena_port/$jena_dataset/sparql" \
      --query 'select * where { ?s ?p ?o }' \
      --auth basic \
      --timeout "$cli_timeout" \
  )
  echo "$result" | grep '{"s":"ex:s","p":"ex:p","o":"ex:o"}' &> /dev/null && echo "SPARQL SELECT OK" || (echo "SPARQL SELECT failed: $result" && exit 1)
fi
