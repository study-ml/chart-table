#!/bin/bash

rm dist/*
browserify src/js/main.js --s charttable -o dist/charttable.js
browserify src/js/main.js --s charttable | uglifyjs -c > dist/charttable.min.js
uglifycss src/css/main.css > dist/charttable.min.css

