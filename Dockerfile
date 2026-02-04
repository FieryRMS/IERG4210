FROM node:20-alpine AS build-env
WORKDIR /app
COPY . /app
RUN npm ci --omit=dev
RUN npm run build

FROM nginx:alpine AS runner
WORKDIR /app
COPY --from=build-env /app/build/client /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]