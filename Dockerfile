FROM node:13.10-alpine3.11

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /srv
USER node
COPY package.json package-lock.json* ./

RUN npm install

COPY . ./

CMD ["node", "index.js"]
