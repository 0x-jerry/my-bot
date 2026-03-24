set -e

bun run g:config-schema
bun run db:generate
bun run build

BASE_IAMGE_NAME="my-agent:base-v1"

# build base image
sh docker/build.sh

docker build --build-arg BASE_IMAGE_NAME="${BASE_IAMGE_NAME}" --rm -f Dockerfile -t my-agent:latest .
