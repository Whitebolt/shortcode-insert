/* jshint node: true */

'use strict';

const fs = require('fs');
const jsdocParse = require("jsdoc-parse");

function parseJsDoc(src, callback) {
	let txt = '';

	jsdocParse({
		src: src,
		private: true
	}).on('data', function(chunk) {
		txt += chunk.toString();
	}).on('end', function() {
		let data = JSON.parse(
			txt.replace(/(?:[\n\f\r\t ]|\\n|\\r|\\t|\\f)+/g, ' ')
		);
		let functions = {};

		data.forEach(item=>{
			functions[item.id] = item;
			delete item.id;
		});

		callback(functions);
	});
}

parseJsDoc(__dirname + '/../index.js', functions=>
	fs.writeFile('./test/index.json', JSON.stringify(functions), null)
);