#!/bin/bash
docker pull stain/jena-fuseki@sha256:4d84eb09dc69603cab990a25a5ad683cec648159f39ccf5dbffba312e7d7666a
docker container create --name endpoint \
  -p 4000:3030 \
  -e FUSEKI_DATASET_1=mydataset \
  -v $(pwd)/.github/workflows/shiro.ini:/jena-fuseki/shiro.ini \
  stain/jena-fuseki@sha256:4d84eb09dc69603cab990a25a5ad683cec648159f39ccf5dbffba312e7d7666a
docker start endpoint
