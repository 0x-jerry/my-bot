set -e

cd "$(dirname "$0")"

BASE_IMAGE_NAME="${BASE_IMAGE_NAME:-"my-agent:base-v0"}"

docker build --rm -f "Dockerfile.dev" -t "${BASE_IMAGE_NAME}" .
