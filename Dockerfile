FROM node:7
WORKDIR /i

ADD ./package.json package.json
RUN npm install -s

ADD ./index.js index.js
ADD ./lib lib

CMD node index.js
