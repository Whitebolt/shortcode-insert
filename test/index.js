/* jshint node: true, mocha: true */
/* global chai */


'use strict';

const packageInfo = require('../package.json');
const jsDoc = require('./index.json');
const Shortcode = require('../index.js');
const expect = require('chai').expect;


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

});


