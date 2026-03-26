# Use an Nginx image to serve the static WebAssembly output
FROM nginx:alpine

# The Nginx image serves files from this directory
WORKDIR /usr/share/nginx/html

# We assume the build workflow generates the Wasm app in composeApp/build/dist/wasmJs/productionExecutable/
# This COPY command expects that the context is the project root where we run the docker build
COPY composeApp/build/dist/wasmJs/productionExecutable/ .

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
