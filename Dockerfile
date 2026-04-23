FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Instalar dependencias primero (capa cacheada)
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Imagen final
FROM base AS runner

ENV NODE_ENV=production

# Copiar dependencias instaladas
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente
COPY src/ ./src/
COPY tsconfig.json ./

# Directorio persistente para tokens (montar como volumen)
RUN mkdir -p /app/data
VOLUME ["/app/data"]

CMD ["bun", "src/index.ts"]
