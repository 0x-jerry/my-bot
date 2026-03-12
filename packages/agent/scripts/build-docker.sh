bun run g:config-schema
bun run build
docker build --rm -f Dockerfile -t my-agent:latest .
