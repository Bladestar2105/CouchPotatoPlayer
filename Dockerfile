# Use an official Node.js runtime as a build environment
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm lockfile
COPY package*.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies (ignoring pure React Native / native issues since we just build web)
RUN pnpm install

# Copy the rest of the application code
COPY . .

# In a React Native Expo project, these specific web dependencies are needed for export.
# These dependencies are now managed inside package.json

# Build the web export
RUN npx expo export -p web

# Use a lightweight web server to serve the static files
FROM nginx:alpine

# Copy the built output from the build stage to Nginx's html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]