FROM php:8.2-apache

# ติดตั้ง PHP extensions
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && rm -rf /var/lib/apt/lists/*
RUN docker-php-ext-install mysqli pdo pdo_mysql pgsql pdo_pgsql

# เปิด Apache modules
RUN a2enmod rewrite headers

WORKDIR /var/www/html
EXPOSE 80
