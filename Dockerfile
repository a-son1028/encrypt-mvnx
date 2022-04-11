FROM registry.scontain.com:5050/sconecuratedimages/apps:node-10.14-alpine
ENV SCONE_HEAP=1G
WORKDIR /app

COPY package*.json /app/

RUN npm install
COPY . /app/

EXPOSE 3000
CMD SCONE_VERSION=1 node index.js
