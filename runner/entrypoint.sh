#!/usr/bin/env bash
set -euo pipefail

RUNTIME_DIR="${RUNTIME_DIR:-/game}"
BUILD_FILE="${RUNTIME_DIR}/build.zip"

echo "[entrypoint] Radix Game Server Runner"

# ------------------------------------------------------------------
# 1. Validate required variables
# ------------------------------------------------------------------
if [ -z "${RADIX_BUILD_URL:-}" ]; then
  echo "[entrypoint] FATAL: RADIX_BUILD_URL is not set"
  exit 1
fi

if [ -z "${RADIX_EXECUTABLE:-}" ]; then
  echo "[entrypoint] FATAL: RADIX_EXECUTABLE is not set"
  exit 1
fi

echo "[entrypoint] Build URL: ${RADIX_BUILD_URL}"
echo "[entrypoint] Executable: ${RADIX_EXECUTABLE}"
echo "[entrypoint] Game Port: ${GAME_PORT:-7777}"
echo "[entrypoint] Running as: $(whoami)"

# ------------------------------------------------------------------
# 2. Create runtime directory and download build
# ------------------------------------------------------------------
mkdir -p "${RUNTIME_DIR}"

echo "[entrypoint] Downloading build..."
curl --fail --silent --location --max-time 300 \
  -o "${BUILD_FILE}" \
  "${RADIX_BUILD_URL}" \
  || wget --timeout=300 -q -O "${BUILD_FILE}" "${RADIX_BUILD_URL}" \
  || { echo "[entrypoint] FATAL: failed to download build"; exit 1; }

echo "[entrypoint] Download complete ($(du -h "${BUILD_FILE}" | cut -f1))"

# ------------------------------------------------------------------
# 3. Extract build
# ------------------------------------------------------------------
echo "[entrypoint] Extracting build..."
unzip -q -o "${BUILD_FILE}" -d "${RUNTIME_DIR}" 2>/dev/null
rm -f "${BUILD_FILE}"

EXECUTABLE_PATH=$(find "${RUNTIME_DIR}" -type f -name "${RADIX_EXECUTABLE}" 2>/dev/null | head -1)

if [ -z "${EXECUTABLE_PATH}" ]; then
  echo "[entrypoint] FATAL: executable '${RADIX_EXECUTABLE}' not found in extracted build"
  ls -la "${RUNTIME_DIR}"
  exit 1
fi

echo "[entrypoint] Found executable at ${EXECUTABLE_PATH}"

# ------------------------------------------------------------------
# 4. Set permissions
# ------------------------------------------------------------------
chmod +x "${EXECUTABLE_PATH}"
echo "[entrypoint] Permissions set"

# ------------------------------------------------------------------
# 5. Build argument list
# ------------------------------------------------------------------
ARGS=("--headless" "--")

if [ -n "${GAME_PORT:-}" ]; then
  ARGS+=("--port" "${GAME_PORT}")
fi

# Pass through any custom env vars prefixed with RADIX_ARG_
for var in $(compgen -e); do
  case "${var}" in
    RADIX_ARG_*)
      key="${var#RADIX_ARG_}"
      val="${!var}"
      ARGS+=("--${key,,}" "${val}")
      ;;
  esac
done

# ------------------------------------------------------------------
# 6. Launch game server
# ------------------------------------------------------------------
echo "[entrypoint] Launching: ${EXECUTABLE_PATH} ${ARGS[*]-}"
cd "${RUNTIME_DIR}"
exec "${EXECUTABLE_PATH}" "${ARGS[@]}"
