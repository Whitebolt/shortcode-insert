# Shortcode Insert
Shortcode parser to embed content into any text-string. The parser is fully-programmable and works asynchronously, using promises.

Will parse both Wordpress shortcodes and similar embed/inserts from other platforms.  This allows a fully bespoke solution if you are building your own platform.

Parser can apply handler functions to specific tags or even use fallback regular expressions and functions. These fallbacks mean it is possible to link content in without specific tag ids.

## Install

```
npm install shortcode-insert
```

*to save to your *package.json**

```
npm install --save shortcode-insert
```

## Basic use

```javascript
const Shortcode = require('shortcode-insert');

// Create a new parser instance
const parser = Shortcode();

let sampleText = 'This is my test code: [[HELLO]]';

parser.add('HELLO', tag=>{ // add a handler for the 'HELLO' tag
	return 'HELLO WORLD';
});

parser.parse(sampleText).then(parsedText=>{
	console.log(parsedText); // will log 'This is my test code: HELLO WORLD' to the console.
});
```

## Wordress-style shortcodes

The default tag delimiters are [[ and ]]. To switch to wordpress-style shortcode is straight forward.  All you have to do istell it to use different delimiters. You can define this in an options object passed to the parser factory.

**Wordpress shortcode parser example:**

```javascript
const Shortcode = require('shortcode-insert');

// Create a new parser instance
const parser = Shortcode({ // define the delimiters as single square brackets like in Wordpress.
	start: '[',
	end: ']'
});
```