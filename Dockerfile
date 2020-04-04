FROM node:13.10-alpine3.11

WORKDIR /srv
ADD . ./

RUN npm install

<<<<<<< HEAD
CMD ["node", "src/index.js"]
=======
COPY . ./

CMD ["/srv/entrypoints/start.sh"]
>>>>>>> bd54cda25cfbe864dcb006cdee8c33096a812fab
