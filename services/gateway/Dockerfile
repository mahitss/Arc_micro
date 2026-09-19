FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/gateway ./cmd/server

FROM alpine:3.20

RUN apk --no-cache add ca-certificates curl

WORKDIR /root/
COPY --from=builder /bin/gateway .

EXPOSE 8080

ENTRYPOINT ["./gateway"]
