FROM php:8.2-apache

# ติดตั้ง PHP extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# เปิด Apache modules
RUN a2enmod rewrite headers

WORKDIR /var/www/html
EXPOSE 80
