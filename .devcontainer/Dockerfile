FROM mcr.microsoft.com/devcontainers/javascript-node:20

USER root

# Install PostgreSQL (cached as an image layer — not re-downloaded on each rebuild)
RUN apt-get update -qq \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Detect the installed PG version and configure trust auth for all local
# connections. "trust" is fine for a dev container — no real data here.
RUN PG_VERSION=$(ls /etc/postgresql/) \
    && echo "local   all   all              trust" >  /etc/postgresql/${PG_VERSION}/main/pg_hba.conf \
    && echo "host    all   all  127.0.0.1/32  trust" >> /etc/postgresql/${PG_VERSION}/main/pg_hba.conf \
    && echo "host    all   all  ::1/128        trust" >> /etc/postgresql/${PG_VERSION}/main/pg_hba.conf

# Pre-create the gatekeeper database so post-create doesn't need to
RUN service postgresql start \
    && psql -U postgres -c "CREATE DATABASE gatekeeper;" \
    && service postgresql stop

USER node
