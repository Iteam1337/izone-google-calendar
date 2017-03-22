FROM node:stable
WORKDIR /i

ADD ./package.json
RUN npm install

ADD ./index.js
ADD ./lib

CMD node index.js
