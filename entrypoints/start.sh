#!/bin/sh

MAIN_SCRIPT=/srv/src/index.js

if [ ${NODE_ENV} = 'production' ]; then
  node ${MAIN_SCRIPT}
else
  nodemon ${MAIN_SCRIPT}
fi
