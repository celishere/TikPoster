FROM alpine:latest

LABEL authors="celis"

RUN apk --no-cache add nodejs npm
RUN npm install --global yarn

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn install && yarn build

COPY . .

CMD ["yarn", "start"]
