# Etapa 1: build
# Compilamos el sitio estatico con Node 22 alpine (requerido por Astro 6+).
FROM node:22-alpine AS builder

WORKDIR /app

# Variables PUBLIC_* de Astro: se inyectan en el bundle durante "npm run build",
# asi que tienen que estar disponibles en esta capa. Coolify las pasa como
# --build-arg cuando estan marcadas como is_buildtime y autoinyecta una linea
# "ARG <NOMBRE>=<valor>" justo despues del FROM. NO usamos valor por defecto
# aqui para evitar sobreescribir el valor inyectado por Coolify.
ARG PUBLIC_GA_MEASUREMENT_ID
ENV PUBLIC_GA_MEASUREMENT_ID=${PUBLIC_GA_MEASUREMENT_ID}

# Copiar manifiestos de dependencias primero para aprovechar la cache de capas.
# Si el codigo cambia pero package.json no, esta capa no se reconstruye.
COPY package.json package-lock.json ./

RUN npm ci --ignore-scripts

# Copiar el resto del codigo fuente
COPY . .

RUN npm run build

# ---

# Etapa 2: servidor de produccion.
# Imagen oficial nginx-unprivileged: ya corre como usuario `nginx` (uid 101),
# escucha en 8080 por defecto y tiene PID/cache en directorios escribibles.
# Evita los problemas tipicos de permisos en /run/nginx.pid del nginx estandar.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

# Necesario root momentaneamente para instalar wget (usado por HEALTHCHECK)
# y copiar la configuracion y los assets.
USER root

RUN apk add --no-cache wget

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
