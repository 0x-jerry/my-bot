FROM node:lts-trixie-slim

RUN apt-get update && apt-get install -y curl

# COPY ./cagent /usr/local/bin/
RUN curl -L https://gh-proxy.org/https://github.com/docker/cagent/releases/latest/download/cagent-linux-amd64 -o cagent
RUN mv cagent /usr/local/bin/
RUN chmod +x /usr/local/bin/cagent

COPY .npmrc /usr/local/etc/npmrc
RUN npm i open-websearch -g

WORKDIR /work
