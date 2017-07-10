"use strict";
/**
 * This module can be used to safely decode JSON into a typed value. All of the
 * decoders in this module are pure and reusable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function decoderError(_a) {
    var at = _a.at, expected = _a.expected, got = _a.got;
    if (typeof got === 'undefined') {
        return new Error("error at " + at + ": expected " + expected);
    }
    return new Error("error at " + at + ": expected " + expected + ", got " + prettyPrint(got));
}
var decode;
var createDecoder;
/**
 * A Decoder represents a way to decode JSON into type T. Provided in this
 * module are Decoders for primitive JSON types, as well as a set of
 * higher-order Decoders that can be composed together to decode complex nested
 * objects.
 */
var Decoder = (function () {
    function Decoder(fn) {
        this.fn = fn;
    }
    /**
     * Attempt to decode some JSON input into a value of type T. Throws a
     * descriptive error if the JSON input does not match the structure described
     * by the Decoder.
     * @param json A JSON encoded string.
     * @returns A value of the type described by the Decoder.
     */
    Decoder.prototype.decodeJSON = function (json) {
        return this.decodeAny(JSON.parse(json));
    };
    /**
     * Attempt to decode a plain object into a value of type T. Throws a
     * descriptive error if the object does not match the structure described
     * by the decoder.
     * @param object Any object.
     * @returns A value of the type described by the Decoder.
     */
    Decoder.prototype.decodeAny = function (object) {
        return this.fn(object, 'root');
    };
    // tricky way to get a package-private constructor
    Decoder._ignore = (function () {
        // compiler will complain about unused var without this
        Decoder._ignore;
        decode = function (decoder, object, at) {
            return decoder.fn(object, at);
        };
        createDecoder = function (fn) {
            return new Decoder(fn);
        };
    })();
    return Decoder;
}());
exports.Decoder = Decoder;
function prettyPrint(value) {
    if (value === null) {
        return 'null';
    }
    if (value instanceof Array) {
        return 'array';
    }
    return typeof value;
}
function escapeKey(key) {
    if (/^[$_a-zA-Z][$_a-zA-Z0-9]*$/.test(key)) {
        return key;
    }
    return JSON.stringify(key);
}
function pushLocation(at, key) {
    if (at === 'root') {
        at = '';
    }
    if (typeof key === 'number') {
        return at + "[" + key + "]";
    }
    if (/^[$_a-zA-Z][$_a-zA-Z0-9]+$/.test(key)) {
        return at + "." + key;
    }
    return at + "[" + JSON.stringify(key) + "]";
}
/**
 * @returns A Decoder that decodes a string.
 */
function string() {
    return createDecoder(function (obj, at) {
        if (typeof obj !== 'string') {
            throw decoderError({
                at: at,
                expected: 'string',
                got: obj
            });
        }
        return obj;
    });
}
exports.string = string;
/**
 * @returns A Decoder that decodes a number.
 */
function number() {
    return createDecoder(function (obj, at) {
        if (typeof obj !== 'number') {
            throw decoderError({
                at: at,
                expected: 'number',
                got: obj
            });
        }
        return obj;
    });
}
exports.number = number;
/**
 * @returns A Decoder that decodes a boolean.
 */
function boolean() {
    return createDecoder(function (obj, at) {
        if (typeof obj !== 'boolean') {
            throw decoderError({
                at: at,
                expected: 'boolean',
                got: obj
            });
        }
        return obj;
    });
}
exports.boolean = boolean;
/**
 * @returns A Decoder that decodes a null.
 */
function null_() {
    return createDecoder(function (obj, at) {
        if (obj !== null) {
            throw decoderError({
                at: at,
                expected: 'null',
                got: obj
            });
        }
        return obj;
    });
}
exports.null_ = null_;
/**
 * @returns A Decoder that decodes either a null or the type of the provided decoder.
 */
function nullable(other) {
    return oneOf(other, null_());
}
exports.nullable = nullable;
/**
 * @returns A Decoder that always succeeds with the value that it finds as an any.
 */
function any() {
    return createDecoder(function (obj, _) {
        return obj;
    });
}
exports.any = any;
/**
 * @returns A Decoder that succeeds with an `object` type if the value found is of type "object".
 * Doesn't do anything with object fields. If you're looking to decode the contents of an object
 * with a known shape, use the `object` decoder. This is for when you want to know something is
 * an object, but you don't care what's inside.
 */
function opaqueObject() {
    return createDecoder(function (obj, at) {
        if (typeof obj !== 'object') {
            throw decoderError({
                at: at,
                expected: 'object',
                got: obj
            });
        }
        return obj;
    });
}
exports.opaqueObject = opaqueObject;
/**
 * Decode a value and make sure the result equals another value. Useful for
 * checking for `null`.
 * ```typescript
 * const decoder = object(
 *   ['shouldBeNull', equal(null)],
 *   (shouldBeNull) => ({shouldBeNull})
 * )
 * decoder.decodeJSON('{"shouldBeNull": null}')
 * ```
 * @param value Value that the input must equal (`===`).
 * @returns A Decoder that decodes a value that equals the given value.
 */
function equal(value) {
    return createDecoder(function (obj, at) {
        if (obj !== value) {
            throw decoderError({
                at: at,
                expected: JSON.stringify(value),
                got: obj
            });
        }
        return obj;
    });
}
exports.equal = equal;
/**
 * Decode an array using another decoder for each element. Can only decode
 * arrays of a single type. If this feels like a limitation, you may be looking
 * for [tuple](#tuple), or perhaps [andThen](#andthen) paired with TypeScript's
 * union types.
 * @param element A Decoder that decodes the element type of an array.
 * @returns A Decoder that will decode an array of elements of the given type.
 */
function array(element) {
    return createDecoder(function (obj, at) {
        if (!(obj instanceof Array)) {
            throw decoderError({
                at: at,
                expected: 'array',
                got: obj
            });
        }
        return obj.map(function (e, i) { return decode(element, e, pushLocation(at, i)); });
    });
}
exports.array = array;
function object() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var cons = args[args.length - 1];
    var decoders = args.slice(0, args.length - 1);
    return createDecoder(function (obj, at) {
        var missingKeys = [];
        var values = [];
        if (typeof obj !== 'object') {
            throw decoderError({
                at: at,
                expected: 'object',
                got: obj
            });
        }
        decoders.forEach(function (_a) {
            var key = _a[0], decoder = _a[1];
            if (key in obj) {
                values.push(decode(decoder, obj[key], pushLocation(at, key)));
            }
            else {
                missingKeys.push(key);
            }
        });
        if (missingKeys.length > 0) {
            var keys = missingKeys
                .sort()
                .map(escapeKey)
                .join(', ');
            throw decoderError({
                at: at,
                expected: "object with keys: " + keys,
            });
        }
        return cons.apply(void 0, values);
    });
}
exports.object = object;
/**
 * Maps a function over the value returned by a decoder. Useful for creating
 * fancier objects from builtin types.
 *
 * ```typescript
 * import Immutable from 'immutable'
 *
 * const decoder = map(
 *   Immutable.List,
 *   array(number())
 * )
 * ```
 * @param tranform A function to apply to the decoded value.
 * @returns A decoder that will apply the function after decoding the input.
 */
function map(transform, decoder) {
    return createDecoder(function (obj, at) {
        return transform(decode(decoder, obj, at));
    });
}
exports.map = map;
function tuple() {
    var decoders = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        decoders[_i] = arguments[_i];
    }
    return createDecoder(function (obj, at) { return (decoders.map(function (decoder, i) {
        return decode(decoder, obj[i], pushLocation(at, i));
    })); });
}
exports.tuple = tuple;
/**
 * Reaches into a nested data structure and decodes the value there. Useful if
 * you only care about a single value in a nested data structure, or if you
 * want to skip past a top level data key. Can perform lookups on nested arrays
 * and objects.
 * @param keyPath Path of key lookups into a nested object.
 * @param decoder Decoder to use on the nested value.
 * @returns A decoder that decodes the value of the nested object.
 */
function at(keyPath, decoder) {
    return createDecoder(function (obj, at) {
        var _a = keyPath.reduce(function (_a, key) {
            var result = _a.result, resultAt = _a.resultAt;
            var value = result[key];
            if (value === undefined) {
                if (typeof key === 'number') {
                    if (result instanceof Array) {
                        throw decoderError({
                            at: at,
                            expected: "array: index out of range: " + key + " > " + (result.length - 1)
                        });
                    }
                    throw decoderError({
                        at: at,
                        expected: "array with index " + key,
                        got: obj
                    });
                }
                throw decoderError({
                    at: at,
                    expected: "object with key " + escapeKey(key),
                    got: result
                });
            }
            return { result: value, resultAt: pushLocation(resultAt, key) };
        }, { result: obj, resultAt: at }), result = _a.result, resultAt = _a.resultAt;
        return decode(decoder, result, resultAt);
    });
}
exports.at = at;
/**
 * Try multiple decoders on a value. Useful when paired with union types, or as
 * a way to provide a default value if something goes wrong. No decoders after
 * the first successful one will be tried. In that way `oneOf` can be thought
 * of a short circuit `OR` operator for decoders.
 *
 * The `first`/`rest` split is to make sure at least one decoder is specified.
 * @param first First decoder to try.
 * @param rest Fallback decoders to try in order if the first fails.
 * @returns A decoder or throws an Error of no decoders succeeded.
 */
function oneOf(first) {
    var rest = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        rest[_i - 1] = arguments[_i];
    }
    return createDecoder(function (obj, at) {
        try {
            return decode(first, obj, at);
        }
        catch (e) { }
        for (var _i = 0, rest_1 = rest; _i < rest_1.length; _i++) {
            var decoder = rest_1[_i];
            try {
                return decode(decoder, obj, at);
            }
            catch (e) { }
        }
        throw new Error("error at " + at + ": unexpected " + prettyPrint(obj));
    });
}
exports.oneOf = oneOf;
/**
 * A decoder that always fails with the given error message.
 * @param message Message to throw when this decoder is used.
 * @returns Never since it always throws an error.
 */
function fail(message) {
    return createDecoder(function (_json, at) {
        throw new Error("error at " + at + ": " + message);
    });
}
exports.fail = fail;
/**
 * A decoder that always succeeds with the given value.
 * @param value Value that always gets returned when this decoder is used.
 * @returns A decoder that always returns the given value.
 */
function succeed(value) {
    return createDecoder(function () {
        return value;
    });
}
exports.succeed = succeed;
/**
 * Intelligently decode a value based on the result of another decoder. Useful
 * decoding on object whose type or structure is not immediately known. The
 * first decoder can be used to look at part of the object, then the second one
 * can can use the result of that decoder to decide on how to actually decode
 * the object.
 * @param ad First decoder to run against the value.
 * @param cb Callback that receives the previous result and returns a decoder.
 * @returns The decoder returned by from the callback function.
*/
function andThen(ad, cb) {
    return createDecoder(function (obj, at) {
        return decode(cb(decode(ad, obj, at)), obj, at);
    });
}
exports.andThen = andThen;
function union() {
    var decoders = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        decoders[_i] = arguments[_i];
    }
    return createDecoder(function (obj, at) {
        for (var _i = 0, decoders_1 = decoders; _i < decoders_1.length; _i++) {
            var decoder = decoders_1[_i];
            try {
                return decode(decoder, obj, at);
            }
            catch (e) { }
        }
        throw new Error("error at " + at + ": unexpected " + prettyPrint(obj));
    });
}
exports.union = union;
/**
 * Decode a value with the decoder returned by the given function. This is
 * useful if you need to decode a recursive data structure. TypeScript does not
 * allow the direct use of variables within their definition:
 * ```typescript
 * interface Comment {
 *   msg: string
 *   replies: Comment[]
 * }
 * const decoder: Decoder<Comment> = object(
 *   ['msg', string()],
 *   ['replies', array(decoder)],
 *   (msg, replies) => ({msg, replies})
 * )
// Block-scoped variable 'decoder' used before its declaration.
// Variable 'decoder' is used before being assigned.
 * ```
 * However, a variable can be used within its definition if it is not
 * immediately evaluated, or in other words, wrapped in an anonymous function:
 * ```typescript
 * const decoder: Decoder<Comment> = object(
 *   ['msg', string()],
 *   ['replies', array(lazy(() => decoder))],
 *   (msg, replies) => ({msg, replies})
 * )
 * ```
 * @param thunk A function that will return the decoder.
 * @returns A decoder that lazily calls thunk to get the decoder when needed.
 */
function lazy(thunk) {
    return createDecoder(function (obj, at) {
        return decode(thunk(), obj, at);
    });
}
exports.lazy = lazy;
/**
 * Decode an object with arbitrary keys. Values must be of the same type.
 * @param value A Decoder that will be used to decode each value.
 * @returns A Decoder will decode an object with arbitrary keys.
 */
function dict(value) {
    return createDecoder(function (obj, at) {
        if (!(obj instanceof Object) || (obj instanceof Array)) {
            throw decoderError({
                at: at,
                expected: 'object',
                got: obj
            });
        }
        var result = {};
        for (var key in obj) {
            result[key] = decode(value, obj[key], pushLocation(at, key));
        }
        return result;
    });
}
exports.dict = dict;
