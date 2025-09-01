FROM node:22.16.0-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
