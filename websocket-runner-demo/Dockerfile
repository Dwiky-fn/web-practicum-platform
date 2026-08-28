FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip openjdk-17-jdk ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV PYTHONUNBUFFERED=1
EXPOSE 4000

CMD ["npm", "start"]
