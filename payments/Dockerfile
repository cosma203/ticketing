FROM node:14-alpine
ENV CI=true

WORKDIR /app 
COPY package.json .
RUN npm install --only=prod
COPY . .

CMD [ "npm", "start" ]