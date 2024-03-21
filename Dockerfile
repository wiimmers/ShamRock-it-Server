FROM node:21-alpine

ENV CLIENT_ID default_client_id
ENV REFRESH_TOKEN default_refresh_token

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json .

RUN npm install 

COPY ./ .

EXPOSE 80

CMD ["sh", "-c", "node index.js ${CLIENT_ID} ${REFRESH_TOKEN}"]