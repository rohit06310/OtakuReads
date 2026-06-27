export ADMIN_EMAIL ?= admin@otakureads.com
export ADMIN_PASSWORD ?= admin123

.PHONY: venv install setup-playwright api e2e all clean


venv:
	python3 -m venv .venv

install:
	.venv/bin/pip install -r requirements.txt

setup-playwright:
	.venv/bin/playwright install chromium

api:
	.venv/bin/pytest api/ -v -m api

e2e:
	.venv/bin/pytest e2e/ -v -m e2e

all:
	.venv/bin/pytest -v

clean:
	rm -rf .venv
	rm -rf .pytest_cache
	rm -rf __pycache__
	rm -rf */__pycache__
	rm -rf htmlcov
	rm -rf .coverage

