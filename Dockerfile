FROM node:7
WORKDIR /i

ADD ./package.json package.json
RUN npm install

ADD ./index.js index.js
ADD ./lib lib

CMD node index.js
