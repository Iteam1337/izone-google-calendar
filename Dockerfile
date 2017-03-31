FROM node:7
WORKDIR /i

ADD ./package.json package.json
RUN npm install > /dev/null 2>&1

ADD ./index.js index.js
ADD ./lib lib

CMD node index.js
