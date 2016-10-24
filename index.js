'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const defaultOptions = {start:'[[', end:']]'};

const xGetAttributes = new RegExp('(\\S+)\\s*=\\s*([\'"])(.*?)\\2|(\\S+)\\s*=\\s*(.*?)(?:\s|$)|(\\S+)(?:\s|$)', 'g');
const xGetTagAttributesText = '{start}.*?\\s(.*?){end}';
const xTagMatch = '{start}.*?{end}';
const xIsEndTag = '^{start}\/';
const xGetTagName = '{start}(?:\/|)(.*?)(?:\\s|{end})';
const xStart = /\{start\}/g;
const xEnd = /\{end\}/g;


function _addSlashToEachCharacter(txt) {
	return txt.split('').map(char=>'\\'+char).join('');
}

function _getAttribute(getAttributes, tag) {
	let results = getAttributes.exec(tag);

	let attributes = {};
	if (results) {
		let result;
		let count = 1;
		while (result = xGetAttributes.exec(results[1])) {
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

function _createRegExp(rx, start, end, options='') {
	return new RegExp(rx
		.replace(xStart, _addSlashToEachCharacter(start))
		.replace(xEnd, _addSlashToEachCharacter(end)
	), options);
}

function _createRegExpsObj(options) {
	return {
		tagMatch: _createRegExp(xTagMatch, options.start, options.end, 'g'),
		isEndTag: _createRegExp(xIsEndTag, options.start, options.end),
		getTagName: _createRegExp(xGetTagName, options.start, options.end),
		getAttributes: _getAttribute.bind({}, _createRegExp(xGetTagAttributesText, options.start, options.end))
	};
}

function _fixEndTags(txt, tags) {
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

function _filterOverlappingTags(tags) {
	return tags.filter((tag, n)=>{
		if (n>0) {
			for (let nn=(n-1); nn>=0; nn--) {
				if (tags[nn].end > tag.start) return false;
			}
		}
		return true;
	});
}

/**
 * Create a new Shortcode parser instance.
 *
 * @class
 * @public
 * @param {Object} options		Options to ShortcodeParser function.
 * @returns {ShortcodeParser}	New instance of shortcode parser.
 */
function ShortcodeParser(options=defaultOptions) {
	const _options = Object.assign({}, defaultOptions, options);
	const tags = new Map();
	const finder = _createRegExpsObj(_options);

	function _runHandlers(txt, tags, params) {
		return Promise.all(tags.map(tag=>{
			let handler = exports.get(tag.tagName).bind({}, tag);
			return Promise.resolve(handler.apply({}, params) || '').then(replacer=>{
				return {replacer, tag};
			});
		})).mapSeries(result=>{
			txt = txt.replace(result.tag.fullMatch, result.replacer);
		}).then(()=>txt);
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
		}).filter(result=>exports.has(result.tagName));

		return results
	}

	const exports = {
		/**
		 * Add a new handler to the parser for given tag name.
		 *
		 * @public
		 * @memberof ShortcodeParser
		 * @param {string} name							Tag name to set handler for.
		 * @param {function} handler					Handler function to fire on tag.
		 * @param {boolean} [throwOnAlreadySet=true]	Throw error if tage already exists?
		 * @return {function}							The handler function returned.
		 */
		add: (name, handler, throwOnAlreadySet=true)=>{
			if (exports.has(name) && throwOnAlreadySet) throw new Error(`Tag '${name}' already exists`);
			if (!_.isFunction(handler)) throw new TypeError(`Cannot assign a non function as handler method for '${name}'`);
			tags.set(name, handler);
			return exports.get(name);
		},

		/**
		 * Test if a handler for given tag name.
		 *
		 * @public
		 * @memberof ShortcodeParser
		 * @param {string} name		The tag to look for a handler on.
		 * @returns {boolean}		Does it exist?
		 */
		has: name=>tags.has(name),

		/**
		 * Delete the handler for given tag name.
		 *
		 * @public
		 * @memberof ShortcodeParser
		 * @param {string} name		The tagname to delete the handler for.
		 * @returns {boolean}
		 */
		delete: name=>{
			if (!exports.has(name)) throw new RangeError(`Tag '${name}' does not exist`);
			return tags.delete(name);
		},

		/**
		 * Get the handler function for given tag name.
		 *
		 * @public
		 * @memberof ShortcodeParser
		 * @param {string} name	 	Tag name to get the handler for.
		 * @returns {function}		The handler for the given tag name.
		 */
		get: name=>{
			if (!exports.has(name)) throw new RangeError(`Tag '${name}' does not exist`);
			return tags.get(name);
		},

		parse: (txt, ...params)=>{
			let tags = _filterOverlappingTags(_fixEndTags(txt, _parse(txt)));

			return _runHandlers(txt, tags, params).then(parsedTxt=>{
				if (txt !== parsedTxt) return exports.parse(parsedTxt);
				return parsedTxt;
			});
		}
	};

	return Object.freeze(exports);
}


module.exports = ShortcodeParser