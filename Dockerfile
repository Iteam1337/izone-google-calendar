FROM node:7
WORKDIR /i

ADD ./package.json package.json
RUN npm install -s

ADD ./index.js index.js
ADD ./lib lib

EXPOSE 3000
CMD node index.js
