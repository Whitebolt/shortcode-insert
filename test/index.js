/* jshint node: true, mocha: true */
/* global chai */


'use strict';

const packageInfo = require('../package.json');
const jsDoc = require('./index.json');
const Shortcode = require('../index.js');
const expect = require('chai').expect;
const assert = require('chai').assert;


/**
 * Generate a description for a describe clause using the info in an object.
 *
 * @private
 * @param {Object} items        The object to get a description from.
 * @param {string} [itemName]   If supplied the property of items to get from.
 * @returns {string}
 */
function describeItem(items, itemName) {
	if (itemName) return items[itemName].name + '(): ' + items[itemName].description;
	return items.name + ': ' + items.description;
}


describe(describeItem(packageInfo), ()=>{
	describe(describeItem(jsDoc, 'create'), ()=>{
		const parser = Shortcode.create();

		it('It should create a shortcode parser object.', ()=>{
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

		describe(describeItem(jsDoc, 'create~add'), ()=>{
			it('add() should add a new handler and return the handler.', ()=>{
				const parser = Shortcode.create();
				const handler = parser.add('TEST', ()=>'HELLO');

				assert.isTrue(parser.has('TEST'));
				assert.isFunction(handler);
				assert.isFunction(parser.get('TEST'));
				assert.equal(parser.get('TEST')(), 'HELLO');
				assert.equal(handler(), 'HELLO');
			});

			it('add() should throw as default when adding handler, which already exists.', ()=>{
				const parser = Shortcode.create();
				parser.add('TEST', ()=>'HELLO');
				assert.throws(()=>parser.add('TEST', ()=>'HELLO2'), Error);
				assert.throws(()=>parser.add('TEST', ()=>'HELLO2'), 'Tag \'TEST\' already exists');
			});

			it('add() should not throw when adding handler, if throwOnAlreadySet set to false.', ()=>{
				const parser = Shortcode.create();
				parser.add('TEST', ()=>'HELLO');
				assert.doesNotThrow(()=>parser.add('TEST', ()=>'HELLO2', false), Error);
				assert.doesNotThrow(()=>parser.add('TEST', ()=>'HELLO2', false), 'Tag \'TEST\' already exists');
			});

			it('add() should not throw when adding handler, if throwOnAlreadySet set to true.', ()=>{
				const parser = Shortcode.create();
				parser.add('TEST', ()=>'HELLO');
				assert.throws(()=>parser.add('TEST', ()=>'HELLO2', true), Error);
				assert.throws(()=>parser.add('TEST', ()=>'HELLO2', true), 'Tag \'TEST\' already exists');
			});

			it('add() should throw when trying to add a handler, which is not a function.', ()=>{
				const parser = Shortcode.create();
				assert.throws(()=>parser.add('TEST', 'HELLO'), TypeError);
				assert.throws(()=>parser.add('TEST', 'HELLO'), 'Cannot assign a non function as handler method for \'TEST\'');
			});
		});

		describe(describeItem(jsDoc, 'create~get'), ()=>{
			it('get() should return requested handler.', ()=>{
				const parser = Shortcode.create();
				const handler = ()=>'HELLO';
				parser.add('TEST', handler);

				assert.isTrue(parser.has('TEST'));
				assert.equal(parser.get('TEST'), handler);
				assert.equal(parser.get('TEST')(), 'HELLO');
			});

			it('get() should throw if handler does not exist.', ()=>{
				const parser = Shortcode.create();
				assert.throws(()=>parser.get('TEST'), RangeError);
				assert.throws(()=>parser.get('TEST'), 'Tag \'TEST\' does not exist');
			});
		});

		describe(describeItem(jsDoc, 'create~has'), ()=>{
			it('has() test if a handler exists for given tag name.', ()=>{
				const parser = Shortcode.create();
				parser.add('TEST', ()=>'HELLO');

				assert.isTrue(parser.has('TEST'));
				assert.isNotTrue(parser.has('TEST2'));
			});
		});

		describe(describeItem(jsDoc, 'create~delete'), ()=>{
			it('delete() should delete the handler for given tag name.', ()=>{
				const parser = Shortcode.create();
				parser.add('TEST', ()=>'HELLO');
				assert.isTrue(parser.has('TEST'));
				parser.delete('TEST');
				assert.isNotTrue(parser.has('TEST'));
			});

			it('delete() should throw if tag name does not exist.', ()=>{
				const parser = Shortcode.create();
				assert.throws(()=>parser.get('TEST'), RangeError);
				assert.throws(()=>parser.get('TEST'), 'Tag \'TEST\' does not exist');
			});
		});
	});
});


