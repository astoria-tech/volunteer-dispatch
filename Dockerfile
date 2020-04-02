FROM node:13.10-alpine3.11

WORKDIR /srv
ADD . ./

RUN npm install

CMD npm start
