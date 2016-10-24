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

/**
 * @typedef ShortcodeParserFinder
 * Regular expressions object to use in extracting tag and tag-attribute data.
 *
 * @property {RegExp} tagMatch			Expression for extracting a tag.
 * @property {RegExp} isEndTag			Expression to test if a tag is an
 * 										end tag
 * @property {RegExp} getTagName		Expression to extract the tag name.
 * @property {Function} getAttributes	Method to extract the attributes in a
 * 										a given start tag string.
 */

/**
 * @typedef ShortcodeParserTag
 * Shortcode tag data.
 *
 * @property {string} tagName			The name of tag.
 * @property {boolean} endTag			Is this an end tag.
 * @property {string} fullMatch			The full tag text and content.
 * @property {integer} start			Start character number in
 * 										original text.
 * @property {integer} end				end character number in
 * 										original text.
 * @property {object} attributes		The tag attributes as an object.
 * @property {string} content			The content of tag when their is
 * 										an opening and closing tag.
 * @property {boolean} selfClosing		Is this a self-closing tag?
 */

/**
 * Add slashes to every character in a string.  Can be used to ensure all of
 * contents is treated as text and not used as regular expression functionality
 * when creating a RegExp with the given content.
 *
 * @private
 * @param {string} txt		The string to add slashes to.
 * @returns {string}		New slashed string.
 */
function _addSlashToEachCharacter(txt) {
	return txt.split('').map(char=>'\\'+char).join('');
}

/**
 * Get the attributes in the given tag text. Will return an object of the tag
 * attributes with properties being equal to their names and property values
 * equalling their value. Also, assign numbered properties for attribute
 * positions.
 *
 * @private
 * @param {RegExp} getAttributes		The regular expression to use in getting
 * 										the attributes.
 * @param {string} tag					The tag text from open tag start
 * 										and close.
 * @returns {Object}					The attributes object.
 */
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

/**
 * Safely create a regular expression from the given template with the given
 * start and end characters replaced in the regular expression.
 *
 * @private
 * @param {string} template			The regular expression template. The text
 * 									{start} and {end} will be replaced with
 * 									the given startChars and endChars.
 * @param {string} startChars		Tag start characters.
 * @param {string} endChars			Tag end characters.
 * @param {string} [options='']		The regular expression options to
 * 									use (eg. 'g' or 'gi').
 * @returns {RegExp}
 */
function _createRegExp(template, startChars, endChars, options='') {
	return new RegExp(template
		.replace(xStart, _addSlashToEachCharacter(startChars))
		.replace(xEnd, _addSlashToEachCharacter(endChars)
	), options);
}

/**
 * Get an object containing the regular expressions to use in extracting tag
 * and tag-attribute data. Construct these expressions to work with the given
 * start and end tag characters supplied in the options object.
 *
 * @private
 * @param {object} options				The options object.
 * @param {string} options.start		Start of tag characters.
 * @param {string} options.end			End of tag characters.
 * @returns {ShortcodeParserFinder}
 *
 */
function _createRegExpsObj(options) {
	return {
		tagMatch: _createRegExp(xTagMatch, options.start, options.end, 'g'),
		isEndTag: _createRegExp(xIsEndTag, options.start, options.end),
		getTagName: _createRegExp(xGetTagName, options.start, options.end),
		getAttributes: _getAttribute.bind({}, _createRegExp(xGetTagAttributesText, options.start, options.end))
	};
}

/**
 * Given an array of tags, remove end tags combining them with their start tag
 * and placing tag content in the tag object.
 *
 * @private
 * @param {string} txt					The text containing all the given tags.
 * @param {Array} tags					Array of tag objects.
 * @returns {ShortcodeParserTag[]}		New array with end tags removed and tag
 * 										data updated with any tag content.
 */
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

/**
 * @private
 * Fix overlapping tags, removing tags inside tags
 *
 * @param {ShortcodeParserTag[]} tags	Tags to filter.
 * @returns {ShortcodeParserTag[]}		Filtered tags.
 */
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

	/**
	 * Run set handlers for given tags, replacing text content as the handler
	 * return content.
	 *
	 * @private
	 * @param {string} txt					The full text containing the tags to
	 * 										do the replacements on.
	 * @param {ShortcodeParserTag[]} tags	The tags to run handlers on.
	 * @param {Array} params				The parameters to pass on to the
	 * 										tag handlers.
	 * @returns {Promise.<string>}			Promise resolving on completion of
	 * 										tag replacements.
	 */
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

	/**
	 * Parse string for tags that handlers have been added for. Return tags that
	 * can be parsed.
	 *
	 * @private
	 * @param {string} txt					Text to parse for tags.
	 * @returns {ShortcodeParserTag[]}		Tags which can be handled.
	 */
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

		/**
		 * Parse given text for tags, running handlers where handlers are
		 * defined and returning parsed text.
		 *
		 * @public
		 * @memberof ShortcodeParser
		 * @param {string} txt				Text to parse.
		 * @param {Array} [params=[]]		Parameters to pass to the handlers.
		 * @returns {Promise.<string>}		Promise resolving to new
		 * 									parsed text.
		 */
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