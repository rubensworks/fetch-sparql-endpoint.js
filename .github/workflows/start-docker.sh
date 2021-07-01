#!/bin/bash
docker pull stain/jena-fuseki
docker container create --name endpoint \
  -p 4000:3030 \
  -e FUSEKI_DATASET_1=mydataset \
  -v $(pwd)/.github/workflows/shiro.ini:/jena-fuseki/shiro.ini \
  stain/jena-fuseki
docker start endpoint
