"use strict";

/**
 * This file contains a copy of LazyTransform and Hash from
 * io.js/lib/crypto.js
 */

const util = require('util');
const stream = require('stream');
const binding = require('./build/Release/blake2');

function LazyTransform(options) {
	this._options = options;
}
util.inherits(LazyTransform, stream.Transform);

[
	'_readableState',
	'_writableState',
	'_transformState'
].forEach(function(prop, i, props) {
	Object.defineProperty(LazyTransform.prototype, prop, {
		get: function() {
			stream.Transform.call(this, this._options);
			this._writableState.decodeStrings = false;
			this._writableState.defaultEncoding = 'binary';
			return this[prop];
		},
		set: function(val) {
			Object.defineProperty(this, prop, {
				value: val,
				enumerable: true,
				configurable: true,
				writable: true
			});
		},
		configurable: true,
		enumerable: true
	});
});


exports.createHash = exports.Hash = Hash;
function Hash(algorithm, options) {
	if (!(this instanceof Hash))
		return new Hash(algorithm, options);
	this._handle = new binding.Hash(algorithm);
	LazyTransform.call(this, options);
}
util.inherits(Hash, LazyTransform);

Hash.prototype._transform = function(chunk, encoding, callback) {
	this._handle.update(chunk, encoding);
	callback();
};

Hash.prototype._flush = function(callback) {
	this.push(this._handle.digest());
	callback();
};

Hash.prototype.update = function(data, encoding) {
	encoding = encoding || exports.DEFAULT_ENCODING;
	if (encoding === 'buffer' && typeof data === 'string')
		encoding = 'binary';
	this._handle.update(data, encoding);
	return this;
};

Hash.prototype.digest = function(outputEncoding) {
	outputEncoding = outputEncoding || exports.DEFAULT_ENCODING;
	return this._handle.digest(outputEncoding);
};



exports.createHmac = exports.Hmac = Hmac;

function Hmac(algorithm, key, options) {
	if (!(this instanceof Hmac)) {
		return new Hmac(algorithm, key, options);
	}
	if(!util.isBuffer(key)) {
		throw new TypeError("key must be a Buffer");
	}
	this._handle = new binding.Hash(algorithm);
	// We replicate the logic of blake2*_init_key here
	let keybytes, blockbytes;
	if(algorithm == "blake2b" || algorithm == "blake2bp") {
		blockbytes = 128; /* BLAKE2B_BLOCKBYTES */
		keybytes = 64; /* BLAKE2B_KEYBYTES */
	} else {
		blockbytes = 64; /* BLAKE2S_BLOCKBYTES */
		keybytes = 32; /* BLAKE2S_KEYBYTES */
	}
	if(key.length > keybytes) {
		throw new Error("key must be <= " + keybytes + " bytes for " + algorithm);
	}
	let keybuffer = new Buffer(blockbytes).fill(0);
	key.copy(keybuffer);
	console.log(keybuffer);
	this._handle.update(keybuffer);
	LazyTransform.call(this, options);
}
util.inherits(Hmac, LazyTransform);

Hmac.prototype.update = Hash.prototype.update;
Hmac.prototype.digest = Hash.prototype.digest;
Hmac.prototype._flush = Hash.prototype._flush;
Hmac.prototype._transform = Hash.prototype._transform;
