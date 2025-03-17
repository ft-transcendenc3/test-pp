FROM node:18

WORKDIR /var/app


COPY ./tools/init.sh /bin/init.sh

RUN chmod +x /bin/init.sh

RUN npm init -y && \
npm install express


ENTRYPOINT ["/bin/init.sh"]

CMD ["node", "server.js"]