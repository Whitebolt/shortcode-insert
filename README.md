# Shortcode Insert
Shortcode parser to embed content into any text-string. The parser is fully-programmable and works asynchronously, using promises.

Will parse both Wordpress shortcodes and similar embed/inserts from other platforms.  This allows a fully bespoke solution if you are building your own platform.

Parser can apply handler functions to specific tags or even use fallback regular expressions and functions. These fallbacks mean it is possible to link content in without specific tag ids.

## Install

```
npm install shortcode-insert
```

**To save to your** *package.json*

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

The default tag delimiters are [[ and ]]. To switch to wordpress-style shortcodes is straight-forward.  All you have to do istell it to use different delimiters. You can define this in an options object passed to the parser factory.

**Wordpress shortcode parser example:**

```javascript
const Shortcode = require('shortcode-insert');

// Create a new parser instance
const parser = Shortcode({ // define the delimiters as single square brackets like in Wordpress.
	start: '[',
	end: ']'
});

let sampleText = '[woocommerce_cart]';

parser.add('woocommerce_cart', tag=>{ // add handler for woocomerce cart
	// do something interesting
	return 'My parsed text';
});

parser.parse(sampleText).then(parsedText=>{
	console.log(parsedText);
});
```


## How to create basic handlers

Handlers are super easy to create. All you need to do is call the add() method with the required tag name and the handler function.

```javascript
parser.add('HELLO', tag=>{ // add handler for HELLO tag
	return 'HELLO WORLD';
});
```

In the above a handler for the tag **HELLO** is created. All tag names are case-sensative, so: HELLO, Hello and hello are all different.

The return from a handler is always wrapped in a promise and resolved before parser completes.  This means that you can return plain text or a promise, which resolves to plain text. In either case plain text is expected as the result.  Theresult is what you want to replace the tag with.


## Handling asychronous parsing

If we want to, say query a database and then insert data after the results have returned we need to use promises. So, a more advanced example of a handler might be:

```javascript
parser.add('CONTENT', tag=>{ // add handler for CONTENT tag
	return new Promise((resolve, reject)=>{
		mydatabase.query('SELECT * FROM content WHERE ID=1', (err, rows, fields)=>{
			if (err) return reject(err);
			resolve(rows[0].content);
		});
	});
});
```


## Using the tag parameter

The tag parameter supplied to the handler function has the following format:

* **tagName:** *string*  Name of the tag.
* **endTag:** *boolean*  Is this a closing tag? Not normally true unless self-closing.
* **fullMatch** *string*  The full tag content, including the delimiters and opening and closing tags and content.
* **tagContents** *string*  The contents of the opening tag (this is the tag name and attributes astext not the content between any opening and closing tags).
* **start** *integer*  The start position in the string being parsed for this tag.
* **end** *integer*  The end position for this tag in the string being parsed (this is the final closing point of tag at end of any closing tag).
* **content** *string*  The tag contents (between the opening and closing tags).  Will be empty string if self-closing.
* **attributes** *Object*  Object containing all the tag attributes as key/value pairs.  Will also index attributes as numbered items, so you can reference the order of attributes too.  Attributes without a key and value can be referenced via the numbered items. This means you can parse attributes according to position as well as property name.


## Handling attributes

Tag attributes are accessible via the attributes property of the tag parameter.

```javascript
parser.add('CONTENT', tag=>{ // add handler for CONTENT tag
	return new Promise((resolve, reject)=>{ // Use the id attribute of the tag to do a lookup-up
		mydatabase.query('SELECT * FROM content WHERE ID=' + tag.attributes.id, (err, rows, fields)=>{
			if (err) return reject(err);
			resolve(rows[0].content);
		});
	});
});

let sampleText = '[[CONTENT id=45]]';

parser.parse(sampleText).then(parsedText=>{
	console.log(parsedText);
});
```

Attributes can be quoted via single or double qotes.  Quotes can be missed out entirely if the attribute value has no spaces in it. So **[[CONTENT id=45]]**, **[[CONTENT id='45']]** and **[[CONTENT id="45"]]** are all the same.


## Handling attributes via their position

Attributes are also accessible via their position.  This allows for simple positional attributes to be used.  Sometimes you might want to allow a really concise tag.

To modify the above example:

```javascript
parser.add('CONTENT', tag=>{ // add handler for CONTENT tag
	return new Promise((resolve, reject)=>{ // Use the id attribute of the tag to do a lookup-up
		mydatabase.query('SELECT * FROM content WHERE ID=' + tag.attributes[1], (err, rows, fields)=>{
			if (err) return reject(err);
			resolve(rows[0].content);
		});
	});
});

let sampleText = '[[CONTENT 45]]';

parser.parse(sampleText).then(parsedText=>{
	console.log(parsedText);
});
```

Tag positions start at 1.  These positional attributes can be quoted, so the following are all the same:  **[[CONTENT 45]]**, **[[CONTENT '45']]** and **[[CONTENT "45"]]**.

If a position is occupied by a key/value pair then an object is returned for that index with the single property and value.  This means you could in theory mix'n'match postional attributes and key/value pairs.


## Opening and closing tags

Tags are automatically self-closing but you can supply tag content by adding a closing tag. For example:

```javascript
parser.add('HELLO', tag=>{ // add a handler for the 'HELLO' tag
	return 'HELLO WORLD: ' + tag.content
});

let sampleText = '[[HELLO]] !!![[/HELLO]]';

parser.parse(sampleText, req).then(parsedText=>{
	console.log(parsedText); // will log 'HELLO WORLD !!!!'
});
```


## Passing parameters to the handlers

Any parameters passed to the parse method after the string to parse are passed onto the handlers.  So for example:

```javascript
parser.add('HELLO', (tag, req)=>{ // add a handler for the 'HELLO' tag
	return 'HELLO WORLD: ' + req.path;
});

parser.parse(sampleText, req).then(parsedText=>{
	console.log(parsedText);
});
```

This can be extreamly useful if you need to pass application data around or even a http request object.


## Overwritting a handler

If you try to add a handler for tag that already exists an error is thrown.  You can overide this by passing true as the 3rd parameter.

```javascript
parser.add('HELLO', tag=>{ // add a handler for the 'HELLO' tag
	return 'HELLO WORLD';
});

parser.add('HELLO', tag=>{ // add a handler for the 'HELLO' tag
	return 'HELLO WORLD!';
}, true); // Allow this to overwrite the previous one.
```


## Checking if a handler exists

You can test for a handler by using the has method.

```javascript
console.log('Does the passer have a handler assigned for the "HELLO" tag?', parser.has('HELLO'));
```


## Deleting a handler

You can delete a handler by calling the delete method.

```javascript
parser.delete('HELLO'); // Delete the handler for the HELLO tag.
```


## Get a handler

You can also get an assigned handler if you need to manipulate it somehow.

```javascript
parser.get('HELLO');
```


## Advanced handers

You can also create more generic handlers, which do not need tag names.  These use regular expressions to caputure tags to parse.

These can be extreamly powerful as you can create concise embed codes for adding content.

Here is an example, which adds a pdf link to some content.

```javascript
parser.add(/^.*\.pdf/, tag=>{ // add a handler for the 'HELLO' tag
	return '<a href="/uploads/pdfs/' + tag.attributes[1] + '">' + tag.attributes[2] + '</a>';
});

let sampleText = '[[mydoc.pdf "Interesting Document"]]'

parser.parse(sampleText).then(parsedText=>{
	console.log(parsedText); // will log <a href="/uploads/pdfs/mydoc.pdf">Interesting Document</a>
});
```

Named tags will always run if they are matched to handler.  These generic handlers will only fire if a named tag handler is not found.

You can also run a function as the tag selector.  These functions should return true or false for tag match.  The above example as a functional selector would be:

```javascript
parser.add(tagContents=>{
	return /^.*\.pdf/.test(tagContents);
}, tag=>{ // add a handler for the 'HELLO' tag
	return '<a href="/uploads/pdfs/' + tag.attributes[1] + '">' + tag.attributes[2] + '</a>';
});

let sampleText = '[[mydoc.pdf "Interesting Document"]]'

parser.parse(sampleText).then(parsedText=>{
	console.log(parsedText); // will log <a href="/uploads/pdfs/mydoc.pdf">Interesting Document</a>
});
```
