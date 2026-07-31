FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y nginx \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

WORKDIR /opt/matchlens

COPY api-server.js /opt/matchlens/api-server.js

COPY site/ /var/www/matchlens/

COPY docker/web.conf /etc/nginx/conf.d/default.conf

RUN chown -R www-data:www-data /var/www/matchlens \
    && chmod -R 755 /var/www/matchlens

EXPOSE 80

CMD ["sh", "-c", "node /opt/matchlens/api-server.js & exec nginx -g 'daemon off;'"]
