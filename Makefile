watch:
	npx tsc -w

dev:
	node out/dev.js

prod:
	npx tsc
	node out/prod.js
