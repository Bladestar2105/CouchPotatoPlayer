# Stage 1: Build the Flutter web app
FROM debian:bullseye-slim AS build

# Install dependencies for Flutter
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    xz-utils \
    zip \
    libglu1-mesa \
    && rm -rf /var/lib/apt/lists/*

# Clone Flutter repository
RUN git clone https://github.com/flutter/flutter.git /usr/local/flutter -b stable

# Set Flutter path
ENV PATH="/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Run flutter doctor to setup
RUN flutter doctor -v

# Set working directory
WORKDIR /app

# Copy the app files
COPY . .

# Get packages and build for web
RUN flutter pub get
RUN flutter build web --release

# Stage 2: Serve the app with NGINX
FROM nginx:alpine

# Copy the custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built bundle to the NGINX html directory
COPY --from=build /app/build/web /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
