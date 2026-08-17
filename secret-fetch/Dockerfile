# Fetches this stack's secrets and exits.
#
# Every service here is a vendor image, so none of them can run the enrollment
# bootstrap as a wrapper the way a first-party container does. This one enrolls
# with the trust appliance, reads the parameters it is declared to read, writes
# them as files to a volume, and stops. Grafana reads those files; nothing is
# delivered by the deploy and nothing is stored in Komodo (ahara-trust
# ADR-0002).
FROM alpine:3.22

ARG AWS_SIGNING_HELPER_VERSION=1.8.4
ARG AWS_SIGNING_HELPER_SHA256=b7568acd6e1517a4e1adaee68d52bfd6284a0e5305677166cd83d43a07c815c9

# The bootstrap is bash, and speaks to the appliance over curl and openssl.
RUN apk add --no-cache bash ca-certificates curl openssl aws-cli

RUN curl -fsSL \
    "https://rolesanywhere.amazonaws.com/releases/${AWS_SIGNING_HELPER_VERSION}/X86_64/Linux/Amzn2023/aws_signing_helper" \
    -o /usr/local/bin/aws_signing_helper \
    && echo "${AWS_SIGNING_HELPER_SHA256}  /usr/local/bin/aws_signing_helper" | sha256sum -c - \
    && chmod 0755 /usr/local/bin/aws_signing_helper

COPY truenas-roles-anywhere-bootstrap /usr/local/bin/truenas-roles-anywhere-bootstrap
RUN chmod 0755 /usr/local/bin/truenas-roles-anywhere-bootstrap

# No arguments after the prefix: the bootstrap enrols, writes the files, and
# returns rather than handing off to a long-running process.
ENTRYPOINT ["/usr/local/bin/truenas-roles-anywhere-bootstrap"]
CMD ["AWS_RA_OBSERVABILITY"]
