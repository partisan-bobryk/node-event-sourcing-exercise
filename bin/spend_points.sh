#!/bin/bash

curl -XPUT -H "Content-type: application/json" -d '{"points": 5000 }' 'http://localhost:8080/transactions'