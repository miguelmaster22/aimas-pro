FROM node:22.16.0-alpine

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 8000

CMD [ "npm", "run", "start" ]
