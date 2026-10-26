# syntax=docker/dockerfile:1.7
# Image ph-app: một image, 3 lệnh api / worker / migrate (AD-001).
# sharp dùng libvips tự build kèm libheif + libde265 để giải mã HEIC (HEVC) từ iPhone (SAD §2.2.4).
# Build từ gốc repo: docker build -f infra/Dockerfile -t ph-app:dev .

# Ghim digest khi đưa lên staging/production (S2-06); Dependabot đề xuất bản mới.
ARG NODE_IMAGE=node:22-bookworm-slim

############################
# 1. libde265 + libheif + libvips
############################
FROM ${NODE_IMAGE} AS vips-build

ARG LIBDE265_VERSION=1.1.3
ARG LIBDE265_SHA256=554228bd17788c99a7e63b37ab5634722190e6e2bf60c1dcb01cef328e133905
ARG LIBHEIF_VERSION=1.23.6
ARG LIBHEIF_SHA256=4484346dc5995319dbc11e3a1c35d0a2ec46511ce370900869337fd2c7033125
# sharp 0.35.5 yêu cầu libvips >= 8.18.7 (config.libvips trong package.json của sharp)
ARG VIPS_VERSION=8.18.7
ARG VIPS_SHA256=5baaead3b0bb20ffdb9e9ff09aa9fda08620923df77b63b436654cb5e0b3bf94

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake meson ninja-build pkg-config python3 curl ca-certificates xz-utils \
      libglib2.0-dev libexpat1-dev libjpeg62-turbo-dev libpng-dev libexif-dev liblcms2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

RUN curl -fsSL -o libde265.tar.gz \
      "https://github.com/strukturag/libde265/releases/download/v${LIBDE265_VERSION}/libde265-${LIBDE265_VERSION}.tar.gz" \
    && echo "${LIBDE265_SHA256}  libde265.tar.gz" | sha256sum -c - \
    && tar xzf libde265.tar.gz \
    && cmake -S "libde265-${LIBDE265_VERSION}" -B de265-build -G Ninja \
         -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local \
         -DENABLE_DECODER=ON -DENABLE_ENCODER=OFF -DENABLE_SDL=OFF \
    && cmake --build de265-build && cmake --install de265-build

RUN curl -fsSL -o libheif.tar.gz \
      "https://github.com/strukturag/libheif/releases/download/v${LIBHEIF_VERSION}/libheif-${LIBHEIF_VERSION}.tar.gz" \
    && echo "${LIBHEIF_SHA256}  libheif.tar.gz" | sha256sum -c - \
    && tar xzf libheif.tar.gz \
    && cmake -S "libheif-${LIBHEIF_VERSION}" -B heif-build -G Ninja \
         -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local \
         -DWITH_LIBDE265=ON -DWITH_X265=OFF -DWITH_AOM_DECODER=OFF -DWITH_AOM_ENCODER=OFF \
         -DWITH_DAV1D=OFF -DWITH_RAV1E=OFF -DWITH_SvtEnc=OFF -DWITH_KVAZAAR=OFF \
         -DWITH_JPEG_DECODER=OFF -DWITH_JPEG_ENCODER=OFF -DWITH_OpenJPEG_DECODER=OFF \
         -DWITH_OpenJPEG_ENCODER=OFF -DWITH_EXAMPLES=OFF -DWITH_GDK_PIXBUF=OFF \
         -DBUILD_TESTING=OFF \
    && cmake --build heif-build && cmake --install heif-build

RUN curl -fsSL -o vips.tar.xz \
      "https://github.com/libvips/libvips/releases/download/v${VIPS_VERSION}/vips-${VIPS_VERSION}.tar.xz" \
    && echo "${VIPS_SHA256}  vips.tar.xz" | sha256sum -c - \
    && tar xJf vips.tar.xz \
    && cd "vips-${VIPS_VERSION}" \
    && meson setup build --prefix=/usr/local --libdir=lib --buildtype=release \
         -Dheif=enabled -Dintrospection=disabled -Dmodules=disabled -Dexamples=false \
         -Dcplusplus=true \
    && meson compile -C build && meson install -C build \
    && ldconfig

############################
# 2. dependency (sharp build với libvips hệ thống)
############################
FROM vips-build AS deps
ENV SHARP_FORCE_GLOBAL_LIBVIPS=1
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline

############################
# 3. build + deploy (chỉ dependency production)
############################
FROM deps AS build
RUN pnpm --filter @ph/api build \
    && pnpm --filter @ph/api deploy --prod --legacy /out \
    && rm -rf /out/dist && cp -r apps/api/dist /out/dist

############################
# 4. kiểm giải mã HEIC thật (fail build nếu sharp dùng bản prebuilt không có HEVC)
############################
FROM build AS heic-check
WORKDIR /out
COPY apps/api/test/fixtures/ /tmp/fixtures/
RUN node -e " \
  const fs = require('fs'); const sharp = require('sharp'); \
  console.log('libvips', sharp.versions.vips, 'heif', JSON.stringify(sharp.format.heif.input)); \
  const f = '/tmp/fixtures/iphone-sample.heic'; \
  if (!fs.existsSync(f)) { console.warn('WARN: thiếu ' + f + ', bỏ qua kiểm giải mã HEVC'); process.exit(0); } \
  sharp(f).jpeg().toBuffer({ resolveWithObject: true }) \
    .then(({ info }) => console.log('ok', info.width + 'x' + info.height)) \
    .catch((e) => { console.error(e); process.exit(1); });" \
  && touch /tmp/heic-ok

############################
# 5. runtime
############################
FROM ${NODE_IMAGE} AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      libglib2.0-0 libexpat1 libjpeg62-turbo libpng16-16 libexif12 liblcms2-2 tini \
    && rm -rf /var/lib/apt/lists/*
COPY --from=vips-build /usr/local/lib/ /usr/local/lib/
RUN ldconfig

# Bắt buộc bước kiểm HEIC chạy trước khi tạo image runtime.
COPY --from=heic-check /tmp/heic-ok /tmp/heic-ok
COPY --from=build --chown=node:node /out /app
COPY --chmod=755 infra/docker-entrypoint.sh /app/docker-entrypoint.sh
# Thư mục ảnh thuộc user `node`: volume Docker rỗng lần đầu mount sẽ chép quyền này (S7-01).
RUN mkdir -p /data/media/incoming && chown -R node:node /data

ENV NODE_ENV=production
WORKDIR /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 --start-period=20s \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/v1/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["tini", "--", "/app/docker-entrypoint.sh"]
CMD ["api"]
