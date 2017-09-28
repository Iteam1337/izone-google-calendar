#
## Builder image.
FROM node:8 as izone-slack-builder
WORKDIR /app

ADD ./package.json package.json
RUN npm install -s

ADD ./index.js index.js
ADD ./lib lib
ADD ./test test

RUN npm run test
RUN npm run standard

#
## Runner image.
FROM node:8-alpine
WORKDIR /app

COPY --from=izone-slack-builder /app/lib /app/lib
COPY --from=izone-slack-builder /app/index.js /app/index.js
COPY --from=izone-slack-builder /app/package.json /app/package.json

RUN npm install -s --production

EXPOSE 3000
CMD node index.js
