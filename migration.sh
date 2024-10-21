#!/bin/sh

set -o allexport
source .env set
+o allexport

pnpm --filter '@webstudio-is/prisma-client' migrations migrate

