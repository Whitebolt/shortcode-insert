'use strict';

const Promise = require('bluebird');
const defaultOptions = {start:'[[', end:']]'};
const _getAttribute = new RegExp('(\\S+)\\s*=\\s*([\'"])(.*?)\\2|(\\S+)\\s*=\\s*(.*?)(?:\s|$)|(\\S+)(?:\s|$)', 'g');

function addSlashToEachCharacter(txt) {
	return txt.split('').map(char=>'\\'+char).join('');
}

function getAttribute(getAttributes, tag) {
	let results = getAttributes.exec(tag);

	let attributes = {};
	if (results) {
		let result;
		let count = 1;
		while (result = _getAttribute.exec(results[1])) {
			if (!result[6] && (result[1]||result[4])) {
				attributes[result[1]||result[4]] = result[3]||result[5];
			} else if (result[6]) {
				attributes[count] = result[6];
			}
			count++;
		}
	}

	return attributes;
}

function createRegEx(options) {
	let start = addSlashToEachCharacter(options.start);
	let end = addSlashToEachCharacter(options.end);
	let _getAttributes = new RegExp(start+'.*?\\s(.*?)'+end);

	return {
		tagMatch: new RegExp(start+'.*?'+end, 'g'),
		isEndTag: new RegExp('^'+start+'\/'),
		getTagName: new RegExp(start+'(?:\/|)(.*?)(?:\\s|'+end+')'),
		getAttributes: getAttribute.bind({}, _getAttributes)
	};
}

function create(options=defaultOptions) {
	const _options = Object.assign({}, defaultOptions, options);
	const tags = new Map();
	const finder = createRegEx(_options);

	function add(name, handler, throwOnAlreadySet=true) {
		if (has(name) && throwOnAlreadySet) throw new Error(`Tag '${name}' already exists`);
		tags.set(name, handler);
	}

	function has(name) {
		return tags.has(name);
	}

	function _delete(name) {
		return tags.delete(name);
	}

	function get(name) {
		if (!has(name)) throw new Error(`Tag '${name}' does not exist`);
		return tags.get(name);
	}

	function _parse(txt) {
		let results = [];
		let result;
		while (result = finder.tagMatch.exec(txt)) {
			result.lastIndex = finder.tagMatch.lastIndex;
			results.push(result);
		}
		results = results.map(result=>{
			return {
				tagName: finder.getTagName.exec(result[0])[1],
				endTag: finder.isEndTag.test(result[0]),
				fullMatch: result[0],
				end: result.lastIndex,
				start: result.lastIndex - result[0].length,
				attributes: finder.getAttributes(result[0]),
				content: '',
				selfClosing: true
			}
		}).filter(result=>has(result.tagName));

		return results
	}

	function fixEndTags(txt, tags) {
		return tags.map((result, n)=>{
			if (result.endTag) {
				for (let nn=n; nn>=0; nn--) {
					if ((tags[nn].tagName === result.tagName) && (!tags[nn].endTag)) {
						tags[nn].content = txt.substring(tags[nn].end, result.start);
						tags[nn].fullMatch += (tags[nn].content + result.fullMatch);
						tags[nn].end = result.end;
						tags[nn].selfClosing = false;
					}
				}
			}
			return result;
		}).filter(result=>!result.endTag);
	}

	function filterOverlappingTags(tags) {
		return tags.filter((tag, n)=>{
			if (n>0) {
				for (let nn=(n-1); nn>=0; nn--) {
					if (tags[nn].end > tag.start) return false;
				}
			}
			return true;
		});
	}

	function runHandlers(txt, tags, params) {
		return Promise.all(tags.map(tag=>{
			let handler = get(tag.tagName).bind({}, tag);
			return Promise.resolve(handler.apply({}, params) || '').then(replacer=>{
				return {replacer, tag};
			});
		})).mapSeries(result=>{
			txt = txt.replace(result.tag.fullMatch, result.replacer);
		}).then(()=>txt);
	}

	function parse(txt, ...params) {
		let tags = filterOverlappingTags(fixEndTags(txt, _parse(txt)));

		return runHandlers(txt, tags, params).then(parsedTxt=>{
			if (txt !== parsedTxt) return parse(parsedTxt);
			return parsedTxt;
		});
	}

	return {parse, add, has, delete:_delete, get}
}


module.exports = {
	create
};