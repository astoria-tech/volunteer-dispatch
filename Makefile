develop: clean build run ## Alias for: clean build run.

help: ## Prints help for targets with comments.
	@grep -E '^[a-zA-Z._-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

clean: ## Remove stopped Docker services.
	docker-compose rm -vf

build: ## Build Docker services.
	docker-compose build

run: ## Start Docker services.
	docker-compose up

pr: ## Prepare for pull request
	npm run lint
	npm run test
