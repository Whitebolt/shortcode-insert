/* jshint node: true, mocha: true */
/* global chai */


'use strict';

const Promise = require('bluebird');
const packageInfo = require('../package.json');
const jsDoc = require('./index.json');
const Shortcode = require('../index.js');
const chai = require('chai');
const assert = chai.assert;

chai.use(require("chai-as-promised"));


/**
 * Generate a description for a describe clause using the info in an object.
 *
 * @private
 * @param {Object} items        The object to get a description from.
 * @param {string} [itemName]   If supplied the property of items to get from.
 * @returns {string}
 */
function describeItem(items, itemName) {
	try {
		if (itemName) return items[itemName].name + '(): ' + items[itemName].description;
		return items.name + ': ' + items.description;
	} catch(err) {
		throw new SyntaxError('Could not find the requested item: ' + itemName);
	}
}


describe(describeItem(packageInfo), ()=>{
	describe(describeItem(jsDoc, 'ShortcodeParser()'), ()=>{
		const parser = Shortcode();

		it('It should ShortcodeParser a shortcode parser object.', ()=>{
			assert.isObject(parser);
		});

		it('Returned instance should be frozen.', ()=>{
			assert.isObject(parser);
		});

		it('Returned instance should be have parse(), has(), add(), get() and delete() methods.', ()=> {
			assert.property(parser, 'parse');
			assert.isFunction(parser.parse);

			assert.property(parser, 'add');
			assert.isFunction(parser.add);

			assert.property(parser, 'has');
			assert.isFunction(parser.has);

			assert.property(parser, 'get');
			assert.isFunction(parser.get);

			assert.property(parser, 'delete');
			assert.isFunction(parser.delete);
		});

		describe(describeItem(jsDoc, 'ShortcodeParser.add'), ()=>{
			it('add() should add a new handler and return the handler.', ()=>{
				const parser = Shortcode();
				const handler = parser.add('TEST', ()=>'HELLO');

				assert.isTrue(parser.has('TEST'));
				assert.isFunction(handler);
				assert.isFunction(parser.get('TEST'));
				assert.equal(parser.get('TEST')(), 'HELLO');
				assert.equal(handler(), 'HELLO');
			});

			it('add() should throw as default when adding handler, which already exists.', ()=>{
				const parser = Shortcode();
				parser.add('TEST', ()=>'HELLO');
				assert.throws(()=>parser.add('TEST', ()=>'HELLO2'), Error);
				assert.throws(()=>parser.add('TEST', ()=>'HELLO2'), 'Tag \'TEST\' already exists');
			});

			it('add() should not throw when adding handler, if throwOnAlreadySet set to false.', ()=>{
				const parser = Shortcode();
				parser.add('TEST', ()=>'HELLO');
				assert.doesNotThrow(()=>parser.add('TEST', ()=>'HELLO2', false), Error);
				assert.doesNotThrow(()=>parser.add('TEST', ()=>'HELLO2', false), 'Tag \'TEST\' already exists');
			});

			it('add() should not throw when adding handler, if throwOnAlreadySet set to true.', ()=>{
				const parser = Shortcode();
				parser.add('TEST', ()=>'HELLO');
				assert.throws(()=>parser.add('TEST', ()=>'HELLO2', true), Error);
				assert.throws(()=>parser.add('TEST', ()=>'HELLO2', true), 'Tag \'TEST\' already exists');
			});

			it('add() should throw when trying to add a handler, which is not a function.', ()=>{
				const parser = Shortcode();
				assert.throws(()=>parser.add('TEST', 'HELLO'), TypeError);
				assert.throws(()=>parser.add('TEST', 'HELLO'), 'Cannot assign a non function as handler method for \'TEST\'');
			});

			it('add() should accept a name reference that is either a: string, function or regular expression.', ()=>{
				const parser = Shortcode();
				const errorMessage = 'Cannot add handler if the reference is not a string, regular expression or function. Reference of type: {type}, was given.';

				['TEST', ()=>{}, /\n/].forEach(test=>{
					let _errorMessage = errorMessage.replace('{type}', typeof test);
					assert.doesNotThrow(()=>parser.add(test, ()=>{}, false), TypeError);
					assert.doesNotThrow(()=>parser.add(test, ()=>{}, false), _errorMessage);
				});
			});

			it('add() should throw when trying to add a handler with a reference that is neither a: string, function or regular expression.', ()=>{
				const parser = Shortcode();
				const errorMessage = 'Cannot add handler if the reference is not a string, regular expression or function. Reference of type: {type}, was given.';

				[1, 1.7, [], {}, null, undefined, true, false].forEach(test=>{
					let _errorMessage = errorMessage.replace('{type}', typeof test);
					assert.throws(()=>parser.add(test, ()=>{}, false), TypeError);
					assert.throws(()=>parser.add(test, ()=>{}, false), _errorMessage);
				});
			});
		});

		describe(describeItem(jsDoc, 'ShortcodeParser.get'), ()=>{
			it('get() should return requested handler.', ()=>{
				const parser = Shortcode();
				const handler = ()=>'HELLO';
				parser.add('TEST', handler);

				assert.isTrue(parser.has('TEST'));
				assert.equal(parser.get('TEST'), handler);
				assert.equal(parser.get('TEST')(), 'HELLO');
			});

			it('get() should throw if handler does not exist.', ()=>{
				const parser = Shortcode();
				assert.throws(()=>parser.get('TEST'), RangeError);
				assert.throws(()=>parser.get('TEST'), 'Tag \'TEST\' does not exist');
			});
		});

		describe(describeItem(jsDoc, 'ShortcodeParser.has'), ()=>{
			it('has() test if a handler exists for given tag name.', ()=>{
				const parser = Shortcode();
				parser.add('TEST', ()=>'HELLO');

				assert.isTrue(parser.has('TEST'));
				assert.isNotTrue(parser.has('TEST2'));
			});
		});

		describe(describeItem(jsDoc, 'ShortcodeParser.delete'), ()=>{
			it('delete() should delete the handler for given tag name.', ()=>{
				const parser = Shortcode();
				parser.add('TEST', ()=>'HELLO');
				assert.isTrue(parser.has('TEST'));
				parser.delete('TEST');
				assert.isNotTrue(parser.has('TEST'));
			});

			it('delete() should throw if tag name does not exist.', ()=>{
				const parser = Shortcode();
				assert.throws(()=>parser.get('TEST'), RangeError);
				assert.throws(()=>parser.get('TEST'), 'Tag \'TEST\' does not exist');
			});
		});

		describe(describeItem(jsDoc, 'ShortcodeParser.parse'), ()=>{
			it('parse() should return a promise a bluebird promise.', ()=>{
				const parser = Shortcode();
				assert.instanceOf(parser.parse(''), Promise);
			});

			it('parse() should return the original text when no handlers fired.', ()=>{
				const parser = Shortcode();
				assert.eventually.equal(parser.parse('TEST'), 'TEST');
			});

			it('parse() will fire handler for tag embeded in text to parse.', done=>{
				const parser = Shortcode();

				parser.add('TEST', tag=>assert.equal(tag.tagName, 'TEST'));

				parser.add('OTHER', ()=>
					assert.fail('[[TEST]]', '[[OTHER]]', 'Handlers should only fire if present in text.')
				);
				parser.parse('[[TEST]]').then(()=>done());
			});

			it('parse() will fire handler for different tags in text.', done=>{
				const parser = Shortcode();
				let testCount = 0;

				parser.add('TEST', tag=>{
					testCount++;
					assert.equal(tag.tagName, 'TEST');
				});
				parser.add('HELLO', tag=>assert.equal(tag.tagName, 'HELLO'));


				parser.parse('[[TEST]] [[HELLO]] [[TEST]]').then(()=>{
					assert.equal(testCount, 2);
					done()
				});
			});

			it('parse() will fire handler for regular expression selector matches.', done=>{
				const parser = Shortcode();
				let found = false;

				parser.add(/.*\.pdf/, tag=>{
					assert.equal(tag.tagContents, 'test.pdf');
					found = true;
				});

				parser.parse('[[test.pdf]]').then(()=>{
					assert.isTrue(found);
					done()
				});
			});

			it('parse() will fire handler for function selector matches.', done=>{
				const parser = Shortcode();
				let found = false;

				parser.add(()=>true, tag=>{
					assert.equal(tag.tagContents, 'test.pdf');
					found = true;
				});

				parser.parse('[[test.pdf]]').then(()=>{
					assert.isTrue(found);
					done()
				});
			});

			it('parse() will fire handler for named tag selector instead of functional or regular expression match if tag matches.', done=>{
				const parser = Shortcode();
				let found = false;

				parser.add(/.*\.pdf/, tag=>{
					assert.fail('TEST', '/.*\\.pdf/', 'Handlers should fire named tag matches before regular expression selectors.');
				});

				parser.add(()=>true, tag=>{
					assert.fail('TEST', '/.*\\.pdf/', 'Handlers should fire named tag matches before functional selectors.');
				});

				parser.add('test.pdf', ()=>{
					found = true;
				});

				parser.parse('[[test.pdf]]').then(()=>{
					assert.isTrue(found);
					done()
				});
			});

			it('parse() should pass parameters to handlers.', done=>{
				const parser = Shortcode();

				parser.add('TEST', (...params)=>{
					assert.lengthOf(params, 4);
					assert.equal(params[1], 'A');
					assert.equal(params[2], 'B');
					assert.equal(params[3], 'C');
				});

				parser.parse('[[TEST]]', 'A', 'B', 'C').then(()=>done());
			});

			describe('ShortcodeParserTag is supplied to handler', ()=>{
				it('parse() will fire handler for tag supplying it with ShortcodeParserTag object.', done=>{
					const parser = Shortcode();

					parser.add('TEST', tag=>{
						assert.property(tag, 'tagName');
						assert.isString(tag.tagName);

						assert.property(tag, 'endTag');
						assert.isBoolean(tag.endTag);

						assert.property(tag, 'fullMatch');
						assert.isString(tag.fullMatch);

						assert.property(tag, 'end');
						assert.isNumber(tag.end);

						assert.property(tag, 'start');
						assert.isNumber(tag.start);

						assert.property(tag, 'attributes');
						assert.isObject(tag.attributes);

						assert.property(tag, 'content');
						assert.isString(tag.content);

						assert.property(tag, 'selfClosing');
						assert.isBoolean(tag.selfClosing);
					});


					parser.parse('[[TEST]]').then(()=>done());
				});

				it('ShortcodeParserTag supplied to handler will have correct tag name.', done=>{
					const parser = Shortcode();

					parser.add('TEST', tag=>assert.equal(tag.tagName, 'TEST'));
					parser.add('HELLO', tag=>assert.equal(tag.tagName, 'HELLO'));
					parser.add('MORE', tag=>assert.equal(tag.tagName, 'MORE'));

					parser.parse('[[TEST]] [[HELLO]] [[MORE]]').then(()=>done());
				});

				it('ShortcodeParserTag supplied to handler will have correct endTag value.', done=>{
					const parser = Shortcode();

					parser.add('TEST', tag=>assert.isFalse(tag.endTag));
					parser.add('HELLO', tag=>assert.isFalse(tag.endTag));
					parser.add('MORE', tag=>assert.isFalse(tag.endTag));

					parser.parse('[[TEST]] [[HELLO]] [[MORE]]').then(()=>done());
				});

				it('ShortcodeParserTag supplied to handler will have correct fullMatch value.', done=>{
					const parser = Shortcode();

					parser.add('TEST', tag=>assert.equal(tag.fullMatch, '[[TEST]]'));
					parser.add('HELLO', tag=>assert.equal(tag.fullMatch, '[[HELLO test="test"]]'));
					parser.add('MORE', tag=>assert.equal(tag.fullMatch, '[[MORE]]'));

					parser.parse('[[TEST]] [[HELLO test="test"]] [[MORE]]').then(()=>done());
				});

				it('ShortcodeParserTag supplied to handler will have correct end value.', done=>{
					const parser = Shortcode();

					parser.add('TEST', tag=>assert.equal(tag.end, 8));
					parser.add('HELLO', tag=>assert.equal(tag.end, 30));
					parser.add('MORE', tag=>assert.equal(tag.end, 39));

					parser.parse('[[TEST]] [[HELLO test="test"]] [[MORE]]').then(()=>done());
				});

				it('ShortcodeParserTag supplied to handler will have correct start value.', done=>{
					const parser = Shortcode();

					parser.add('TEST', tag=>assert.equal(tag.start, 0));
					parser.add('HELLO', tag=>assert.equal(tag.start, 9));
					parser.add('MORE', tag=>assert.equal(tag.start, 31));

					parser.parse('[[TEST]] [[HELLO test="test"]] [[MORE]]').then(()=>done());
				});

				it('ShortcodeParserTag supplied to handler will have correct content value.', done=>{
					const parser = Shortcode();

					parser.add('TEST', tag=>assert.equal(tag.content, ''));
					parser.add('HELLO', tag=>assert.equal(tag.content, 'HELLO WORLD'));
					parser.add('MORE', tag=>assert.equal(tag.content, ''));

					parser.parse('[[TEST]] [[HELLO test="test"]]HELLO WORLD[[/HELLO]] [[MORE]][[/MORE]').then(()=>done());
				});

				it('ShortcodeParserTag supplied to handler will have correct selfColosing value.', done=>{
					// @todo actual self-closing tags not parsed correctly - ie [[TEST/]].

					const parser = Shortcode();

					parser.add('TEST', tag=>assert.isFalse(tag.selfClosing));
					parser.add('HELLO', tag=>assert.isTrue(tag.selfClosing));
					parser.add('MORE', tag=>assert.isTrue(tag.selfClosing));

					parser.parse('[[TEST]]TEST[[/TEST]] [[HELLO test="test"]] [[MORE]]').then(()=>done());
				});

				describe('Attributes are parsed and passed to handlers', ()=>{
					it('ShortcodeParserTag supplied to handler parse attributes, with and without quotes.', done=>{
						const parser = Shortcode();

						parser.add('TEST', tag=>{
							assert.equal(tag.attributes.test, 'TESTER');
							assert.equal(tag.attributes.hello, 'Hello World!');
							assert.equal(tag.attributes.more, 'Hello');
							assert.equal(tag.attributes.evenmore, '"hello" WORLD');
						});

						parser.add('HELLO', tag=>{
							assert.equal(tag.attributes.test, 'TESTER');
							assert.equal(tag.attributes.hello, 'Hello World!');
							assert.equal(tag.attributes.more, 'Hello');
							assert.equal(tag.attributes.evenmore, '"hello" WORLD');
						});

						parser.add('MORE', tag=>{
							assert.equal(tag.attributes.test, 'TESTER');
							assert.equal(tag.attributes.hello, 'Hello World!');
							assert.equal(tag.attributes.more, 'Hello');
							assert.equal(tag.attributes.evenmore, '"hello" WORLD');
						});

						Promise.all(parser.parse(
							'[[TEST test=\'TESTER\' hello="Hello World!" more=Hello evenmore=\'"hello" WORLD\']]'
						), parser.parse(
							'[[HELLO test=\'TESTER\' hello="Hello World!" more=Hello evenmore=\'"hello" WORLD\']]TEST[[/HELLO test2="TEST2"]]'
						), parser.parse(
							'[[OTHER]] [[MORE test=\'TESTER\' hello="Hello World!" more=Hello evenmore=\'"hello" WORLD\']]TEST[[/MORE]]'
						)).then(()=>done())
					});

					it('ShortcodeParserTag supplied to handler parse attributes according to position.', done=> {
						const parser = Shortcode();

						parser.add('TEST', tag=>{
							assert.deepEqual(tag.attributes[1], {test: 'TESTER'});
							assert.deepEqual(tag.attributes[2], {hello: 'Hello World!'});
							assert.deepEqual(tag.attributes[3], {more: 'Hello'});
							assert.deepEqual(tag.attributes[4], {evenmore:'"hello" WORLD'});
						});

						parser.add('HELLO', tag=>{
							assert.equal(tag.attributes[1], 'test');
							assert.equal(tag.attributes[2], 'hello');
						});

						parser.add('OTHER', tag=>{
							assert.equal(tag.attributes[1], 'test');
							assert.equal(tag.attributes[2], 'hello');
							assert.deepEqual(tag.attributes[3], {more: 'Hello'});
						});

						parser.add('MORE', tag=>{
							assert.equal(tag.attributes[1], 'test');
							assert.equal(tag.attributes[2], 'hello world');
							assert.deepEqual(tag.attributes[3], {more: 'Hello'});
							assert.equal(tag.attributes[4], 'HELLO');
						});

						Promise.all(parser.parse(
							'[[TEST test=\'TESTER\' hello="Hello World!" more=Hello evenmore=\'"hello" WORLD\']]'
						), parser.parse(
							'[[HELLO test hello]]TEST[[/HELLO]]'
						), parser.parse(
							'[[OTHER test hello more=Hello]]TEST[[/OTHER]]'
						), parser.parse(
							'[[MORE test \'hello world\' more=Hello "HELLO"]]TEST[[/MORE]]'
						)).then(()=>done());
					});
				});
			});
		});
	});
});


