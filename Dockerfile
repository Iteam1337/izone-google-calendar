FROM node:8-alpine
WORKDIR /app

ADD ./index.js /app/ndex.js
ADD ./lib /app/lib

RUN npm install --production

EXPOSE 3000
CMD node index.js
