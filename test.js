'use strict';

const parser = require('./index').create();

parser.add('TEST', ()=>{
	return 'hello world[[HELLO]]';
});

parser.add('HELLO', ()=>{
	return 'HELLO';
});

parser.parse('[[TEST path="/" hello]]1234[[TEST]][[/TEST]] [[HELLO]][[HELLO attribute=7]]').then(
	parsedTxt=>console.log(parsedTxt)
);