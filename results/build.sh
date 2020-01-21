#!/bin/bash

rm archive.zip
zip -r archive.zip *.js Dockerfile package.json
curl -F "data=@./archive.zip" https://ipfs.infura.io:5001/api/v0/add
