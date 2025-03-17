# FROM node:18

# WORKDIR /usr/src/app/

# COPY ./gameFront/package.json ./gameFront/package-lock.json ./

# RUN npm install --legacy-peer-deps 

# RUN npm install -g live-server

# COPY . .  

# CMD ["live-server", "--host=0.0.0.0", "--port=5173", "--watch=."]



FROM nginx:1.27.1-bookworm

# Copy the frontend files directly to Nginx's serving directory
COPY ./gameFront /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]