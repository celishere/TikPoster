FROM alpine:latest

LABEL authors="celis"

RUN apk --no-cache add nodejs npm ffmpeg
RUN npm install --global yarn

WORKDIR /usr/src/app

COPY package.json ./

RUN yarn install

COPY . .

RUN yarn build

CMD ["yarn", "start"]
