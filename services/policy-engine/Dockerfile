FROM rust:1.79-alpine AS builder

RUN apk add --no-cache musl-dev

WORKDIR /app

COPY Cargo.toml ./
# Create dummy main to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release || true
RUN rm -rf src

COPY . .
RUN cargo build --release

FROM alpine:3.20

RUN apk --no-cache add ca-certificates curl

WORKDIR /root/
COPY --from=builder /app/target/release/policy-engine .

EXPOSE 8081

ENTRYPOINT ["./policy-engine"]
