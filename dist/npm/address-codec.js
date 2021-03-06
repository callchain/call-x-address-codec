'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var baseCodec = require('base-x');

var _require = require('./utils');

var seqEqual = _require.seqEqual;
var concatArgs = _require.concatArgs;
var isSet = _require.isSet;

/* --------------------------------- ENCODER -------------------------------- */

function codecFactory(injected) {

  /* eslint-disable indent */
  var sha256 = injected.sha256;

  var AddressCodec = (function () {
    /* eslint-enable indent */

    function AddressCodec(alphabet) {
      _classCallCheck(this, AddressCodec);

      this.alphabet = alphabet;
      this.codec = baseCodec(alphabet);
      this.base = alphabet.length;
    }

    /* eslint-disable indent */

    _createClass(AddressCodec, [{
      key: 'encode',
      value: function encode(bytes) {
        var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var version = opts.version;

        return isSet(version) ? this.encodeVersioned(bytes, version, opts.expectedLength) : opts.checked ? this.encodeChecked(bytes) : this.encodeRaw(bytes);
      }
    }, {
      key: 'decode',
      value: function decode(string) {
        var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var version = opts.version;
        var versions = opts.versions;

        return isSet(versions) ? this.decodeMultiVersioned(string, versions, opts.expectedLength, opts.versionTypes) : isSet(version) ? this.decodeVersioned(string, version, opts.expectedLength) : opts.checked ? this.decodeChecked(string) : this.decodeRaw(string);
      }
    }, {
      key: 'encodeRaw',
      value: function encodeRaw(bytes) {
        return this.codec.encode(bytes);
      }
    }, {
      key: 'decodeRaw',
      value: function decodeRaw(string) {
        return this.codec.decode(string);
      }
    }, {
      key: 'encodeChecked',
      value: function encodeChecked(buffer) {
        var check = sha256(sha256(buffer)).slice(0, 4);
        return this.encodeRaw(concatArgs(buffer, check));
      }
    }, {
      key: 'decodeChecked',
      value: function decodeChecked(encoded) {
        var buf = this.decodeRaw(encoded);
        if (buf.length < 5) {
          throw new Error('invalid_input_size');
        }
        if (!this.verifyCheckSum(buf)) {
          throw new Error('checksum_invalid');
        }
        return buf.slice(0, -4);
      }
    }, {
      key: 'encodeVersioned',
      value: function encodeVersioned(bytes, version, expectedLength) {
        if (expectedLength && bytes.length !== expectedLength) {
          throw new Error('unexpected_payload_length');
        }
        return this.encodeChecked(concatArgs(version, bytes));
      }
    }, {
      key: 'decodeVersioned',
      value: function decodeVersioned(string, version, expectedLength) {
        return this.decodeMultiVersioned(string, [version], expectedLength).bytes;
      }

      /**
      * @param {String} encoded - base58 checksum encoded data string
      * @param {Array} possibleVersions - array of possible versions.
      *                                   Each element could be a single byte or an
      *                                   array of bytes.
      * @param {Number} [expectedLength] - of decoded bytes minus checksum
      *
      * @param {Array} [types] - parrallel array of names matching possibleVersions
      *
      * @return {Object} -
      */
    }, {
      key: 'decodeMultiVersioned',
      value: function decodeMultiVersioned(encoded, possibleVersions, expectedLength, types) {
        var withoutSum = this.decodeChecked(encoded);
        var ret = { version: null, bytes: null };

        if (possibleVersions.length > 1 && !expectedLength) {
          throw new Error('must pass expectedLengthgth > 1 possibleVersions');
        }

        var versionLenGuess = possibleVersions[0].length || 1; // Number.length
        var payloadLength = expectedLength || withoutSum.length - versionLenGuess;
        var versionBytes = withoutSum.slice(0, -payloadLength);
        var payload = withoutSum.slice(-payloadLength);

        var foundVersion = possibleVersions.some(function (version, i) {
          var asArray = Array.isArray(version) ? version : [version];
          if (seqEqual(versionBytes, asArray)) {
            ret.version = version;
            ret.bytes = payload;
            if (types) {
              ret.type = types[i];
            }
            return true;
          }
        });

        if (!foundVersion) {
          throw new Error('version_invalid');
        }
        if (expectedLength && ret.bytes.length !== expectedLength) {
          throw new Error('unexpected_payload_length');
        }

        return ret;
      }
    }, {
      key: 'verifyCheckSum',
      value: function verifyCheckSum(bytes) {
        var computed = sha256(sha256(bytes.slice(0, -4))).slice(0, 4);
        var checksum = bytes.slice(-4);
        return seqEqual(computed, checksum);
      }

      /**
      * @param {String} desiredPrefix - desired prefix when base58 encoded with
      *                                 checksum
      * @param {Number} payloadLength - number of bytes encoded not incl checksum
      * @return {Array} version
      */
    }, {
      key: 'findPrefix',
      value: function findPrefix(desiredPrefix, payloadLength) {
        if (this.base !== 58) {
          throw new Error('Only works for base58');
        }
        var totalLength = payloadLength + 4; // for checksum
        var chars = Math.log(Math.pow(256, totalLength)) / Math.log(this.base);
        // (x, x.8] -> x+1, (x.8, x+1) -> x+2
        var requiredChars = Math.ceil(chars + 0.2);
        var padding = this.alphabet[Math.floor(this.alphabet.length / 2) - 1];
        var template = desiredPrefix + new Array(requiredChars + 1).join(padding);
        var bytes = this.decodeRaw(template);
        var version = bytes.slice(0, -totalLength);
        return version;
      }
    }]);

    return AddressCodec;
  })();

  return AddressCodec;
  /* eslint-enable indent */
}
/* ------------------------------- END ENCODER ------------------------------ */

module.exports = codecFactory;