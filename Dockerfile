FROM node:8-alpine
WORKDIR /app

ADD ./lib /app/lib
ADD ./index.js /app/ndex.js
ADD ./package.json /app/package.json

RUN npm install -s --production

EXPOSE 3000
CMD node index.js
