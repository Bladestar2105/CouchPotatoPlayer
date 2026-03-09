# Base build image
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (ignoring peer dependency errors if any exist)
RUN npm install --legacy-peer-deps

# Copy the rest of the app source code
COPY . .

# Build the web bundle
RUN npx webpack --mode production --config webpack.config.js

# Production image
FROM nginx:alpine

# Copy the custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built bundle to the NGINX html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]