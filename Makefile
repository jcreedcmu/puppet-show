watch:
	node client-build.js watch

dev:
	node server-build.js
	node out/dev.js

build:
	node client-build.js
	node server-build.js
