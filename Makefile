.PHONY: setup dev test build clean

# Detect shell
SHELL := /usr/bin/env bash

setup:
	@bash scripts/setup.sh

dev:
	@bash scripts/dev.sh

test:
	@bash scripts/test.sh

build:
	@bash scripts/build.sh

clean:
	@rm -rf apps/web/.next apps/web/out
	@rm -rf services/gateway/bin
	@rm -rf services/policy-engine/target
	@rm -rf contracts/out contracts/cache
	@echo "Cleaned build artifacts."
