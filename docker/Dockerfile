FROM php:8.2-apache

# ติดตั้ง PHP extensions
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && rm -rf /var/lib/apt/lists/*
RUN docker-php-ext-install pdo pdo_pgsql

# เปิด Apache modules
RUN a2enmod rewrite headers

COPY docker/php.ini /usr/local/etc/php/conf.d/custom.ini
COPY docker/apache.conf /etc/apache2/sites-enabled/000-default.conf

WORKDIR /var/www/html
# docker-compose mount โฟลเดอร์ทับตรงนี้ตอนรันในเครื่อง ส่วนบน Render ใช้โค้ดที่ copy เข้า image
COPY . /var/www/html/

EXPOSE 80
# Render ส่งพอร์ตมาทาง $PORT ในเครื่องไม่มีค่านี้จึงใช้ 80
CMD ["sh", "-c", "sed -i \"s/^Listen .*/Listen ${PORT:-80}/\" /etc/apache2/ports.conf && exec apache2-foreground"]
