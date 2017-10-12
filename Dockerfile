FROM node:8-alpine
WORKDIR /app

ADD ./index.js index.js
ADD ./lib lib

RUN npm install -s --production

EXPOSE 3000
CMD node index.js
