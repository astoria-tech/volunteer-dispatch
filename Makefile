develop: clean build run

clean:
	docker-compose rm -vf

build:
	docker-compose build

run:
	docker-compose up
