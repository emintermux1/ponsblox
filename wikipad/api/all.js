var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// ../node_modules/viem/_esm/utils/data/isHex.js
function isHex(value, { strict = true } = {}) {
  if (!value)
    return false;
  if (typeof value !== "string")
    return false;
  return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith("0x");
}
var init_isHex = __esm({
  "../node_modules/viem/_esm/utils/data/isHex.js"() {
  }
});

// ../node_modules/viem/_esm/utils/data/size.js
function size(value) {
  if (isHex(value, { strict: false }))
    return Math.ceil((value.length - 2) / 2);
  return value.length;
}
var init_size = __esm({
  "../node_modules/viem/_esm/utils/data/size.js"() {
    init_isHex();
  }
});

// ../node_modules/viem/_esm/errors/version.js
var version;
var init_version = __esm({
  "../node_modules/viem/_esm/errors/version.js"() {
    version = "2.56.3";
  }
});

// ../node_modules/viem/_esm/errors/base.js
function walk(err, fn) {
  if (fn?.(err))
    return err;
  if (err && typeof err === "object" && "cause" in err && err.cause !== void 0)
    return walk(err.cause, fn);
  return fn ? null : err;
}
var errorConfig, BaseError;
var init_base = __esm({
  "../node_modules/viem/_esm/errors/base.js"() {
    init_version();
    errorConfig = {
      getDocsUrl: ({ docsBaseUrl, docsPath = "", docsSlug }) => docsPath ? `${docsBaseUrl ?? "https://viem.sh"}${docsPath}${docsSlug ? `#${docsSlug}` : ""}` : void 0,
      version: `viem@${version}`
    };
    BaseError = class _BaseError extends Error {
      constructor(shortMessage, args = {}) {
        const details = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.details;
          if (args.cause?.message)
            return args.cause.message;
          return args.details;
        })();
        const docsPath = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.docsPath || args.docsPath;
          return args.docsPath;
        })();
        const docsUrl = errorConfig.getDocsUrl?.({ ...args, docsPath });
        const message = [
          shortMessage || "An error occurred.",
          "",
          ...args.metaMessages ? [...args.metaMessages, ""] : [],
          ...docsUrl ? [`Docs: ${docsUrl}`] : [],
          ...details ? [`Details: ${details}`] : [],
          ...errorConfig.version ? [`Version: ${errorConfig.version}`] : []
        ].join("\n");
        super(message, args.cause ? { cause: args.cause } : void 0);
        Object.defineProperty(this, "details", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "docsPath", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "metaMessages", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "shortMessage", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "version", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "BaseError"
        });
        this.details = details;
        this.docsPath = docsPath;
        this.metaMessages = args.metaMessages;
        this.name = args.name ?? this.name;
        this.shortMessage = shortMessage;
        this.version = version;
      }
      walk(fn) {
        return walk(this, fn);
      }
    };
  }
});

// ../node_modules/viem/_esm/errors/data.js
var SizeExceedsPaddingSizeError;
var init_data = __esm({
  "../node_modules/viem/_esm/errors/data.js"() {
    init_base();
    SizeExceedsPaddingSizeError = class extends BaseError {
      constructor({ size: size2, targetSize, type }) {
        super(`${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()} size (${size2}) exceeds padding size (${targetSize}).`, { name: "SizeExceedsPaddingSizeError" });
      }
    };
  }
});

// ../node_modules/viem/_esm/utils/data/pad.js
function pad(hexOrBytes, { dir, size: size2 = 32 } = {}) {
  if (typeof hexOrBytes === "string")
    return padHex(hexOrBytes, { dir, size: size2 });
  return padBytes(hexOrBytes, { dir, size: size2 });
}
function padHex(hex_, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return hex_;
  const hex = hex_.replace("0x", "");
  if (hex.length > size2 * 2)
    throw new SizeExceedsPaddingSizeError({
      size: Math.ceil(hex.length / 2),
      targetSize: size2,
      type: "hex"
    });
  return `0x${hex[dir === "right" ? "padEnd" : "padStart"](size2 * 2, "0")}`;
}
function padBytes(bytes, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return bytes;
  if (bytes.length > size2)
    throw new SizeExceedsPaddingSizeError({
      size: bytes.length,
      targetSize: size2,
      type: "bytes"
    });
  const paddedBytes = new Uint8Array(size2);
  for (let i = 0; i < size2; i++) {
    const padEnd = dir === "right";
    paddedBytes[padEnd ? i : size2 - i - 1] = bytes[padEnd ? i : bytes.length - i - 1];
  }
  return paddedBytes;
}
var init_pad = __esm({
  "../node_modules/viem/_esm/utils/data/pad.js"() {
    init_data();
  }
});

// ../node_modules/viem/_esm/errors/encoding.js
var IntegerOutOfRangeError, SizeOverflowError;
var init_encoding = __esm({
  "../node_modules/viem/_esm/errors/encoding.js"() {
    init_base();
    IntegerOutOfRangeError = class extends BaseError {
      constructor({ max, min, signed, size: size2, value }) {
        super(`Number "${value}" is not in safe ${size2 ? `${size2 * 8}-bit ${signed ? "signed" : "unsigned"} ` : ""}integer range ${max ? `(${min} to ${max})` : `(above ${min})`}`, { name: "IntegerOutOfRangeError" });
      }
    };
    SizeOverflowError = class extends BaseError {
      constructor({ givenSize, maxSize }) {
        super(`Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`, { name: "SizeOverflowError" });
      }
    };
  }
});

// ../node_modules/viem/_esm/utils/encoding/fromHex.js
function assertSize(hexOrBytes, { size: size2 }) {
  if (size(hexOrBytes) > size2)
    throw new SizeOverflowError({
      givenSize: size(hexOrBytes),
      maxSize: size2
    });
}
var init_fromHex = __esm({
  "../node_modules/viem/_esm/utils/encoding/fromHex.js"() {
    init_encoding();
    init_size();
  }
});

// ../node_modules/viem/_esm/utils/encoding/toHex.js
function toHex(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToHex(value, opts);
  if (typeof value === "string") {
    return stringToHex(value, opts);
  }
  if (typeof value === "boolean")
    return boolToHex(value, opts);
  return bytesToHex(value, opts);
}
function boolToHex(value, opts = {}) {
  const hex = `0x${Number(value)}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { size: opts.size });
  }
  return hex;
}
function bytesToHex(value, opts = {}) {
  let string = "";
  for (let i = 0; i < value.length; i++) {
    string += hexes[value[i]];
  }
  const hex = `0x${string}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { dir: "right", size: opts.size });
  }
  return hex;
}
function numberToHex(value_, opts = {}) {
  const { signed, size: size2 } = opts;
  const value = BigInt(value_);
  let maxValue;
  if (size2) {
    if (signed)
      maxValue = (1n << BigInt(size2) * 8n - 1n) - 1n;
    else
      maxValue = 2n ** (BigInt(size2) * 8n) - 1n;
  } else if (typeof value_ === "number") {
    maxValue = BigInt(Number.MAX_SAFE_INTEGER);
  }
  const minValue = typeof maxValue === "bigint" && signed ? -maxValue - 1n : 0;
  if (maxValue && value > maxValue || value < minValue) {
    const suffix = typeof value_ === "bigint" ? "n" : "";
    throw new IntegerOutOfRangeError({
      max: maxValue ? `${maxValue}${suffix}` : void 0,
      min: `${minValue}${suffix}`,
      signed,
      size: size2,
      value: `${value_}${suffix}`
    });
  }
  const hex = `0x${(signed && value < 0 ? (1n << BigInt(size2 * 8)) + BigInt(value) : value).toString(16)}`;
  if (size2)
    return pad(hex, { size: size2 });
  return hex;
}
function stringToHex(value_, opts = {}) {
  const value = encoder.encode(value_);
  return bytesToHex(value, opts);
}
var hexes, encoder;
var init_toHex = __esm({
  "../node_modules/viem/_esm/utils/encoding/toHex.js"() {
    init_encoding();
    init_pad();
    init_fromHex();
    hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, "0"));
    encoder = /* @__PURE__ */ new TextEncoder();
  }
});

// ../node_modules/viem/_esm/utils/encoding/toBytes.js
function toBytes(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToBytes(value, opts);
  if (typeof value === "boolean")
    return boolToBytes(value, opts);
  if (isHex(value))
    return hexToBytes(value, opts);
  return stringToBytes(value, opts);
}
function boolToBytes(value, opts = {}) {
  const bytes = new Uint8Array(1);
  bytes[0] = Number(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { size: opts.size });
  }
  return bytes;
}
function charCodeToBase16(char) {
  if (char >= charCodeMap.zero && char <= charCodeMap.nine)
    return char - charCodeMap.zero;
  if (char >= charCodeMap.A && char <= charCodeMap.F)
    return char - (charCodeMap.A - 10);
  if (char >= charCodeMap.a && char <= charCodeMap.f)
    return char - (charCodeMap.a - 10);
  return void 0;
}
function hexToBytes(hex_, opts = {}) {
  let hex = hex_;
  if (opts.size) {
    assertSize(hex, { size: opts.size });
    hex = pad(hex, { dir: "right", size: opts.size });
  }
  let hexString = hex.slice(2);
  if (hexString.length % 2)
    hexString = `0${hexString}`;
  const length = hexString.length / 2;
  const bytes = new Uint8Array(length);
  for (let index = 0, j = 0; index < length; index++) {
    const nibbleLeft = charCodeToBase16(hexString.charCodeAt(j++));
    const nibbleRight = charCodeToBase16(hexString.charCodeAt(j++));
    if (nibbleLeft === void 0 || nibbleRight === void 0) {
      throw new BaseError(`Invalid byte sequence ("${hexString[j - 2]}${hexString[j - 1]}" in "${hexString}").`);
    }
    bytes[index] = nibbleLeft * 16 + nibbleRight;
  }
  return bytes;
}
function numberToBytes(value, opts) {
  const hex = numberToHex(value, opts);
  return hexToBytes(hex);
}
function stringToBytes(value, opts = {}) {
  const bytes = encoder2.encode(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { dir: "right", size: opts.size });
  }
  return bytes;
}
var encoder2, charCodeMap;
var init_toBytes = __esm({
  "../node_modules/viem/_esm/utils/encoding/toBytes.js"() {
    init_base();
    init_isHex();
    init_pad();
    init_fromHex();
    init_toHex();
    encoder2 = /* @__PURE__ */ new TextEncoder();
    charCodeMap = {
      zero: 48,
      nine: 57,
      A: 65,
      F: 70,
      a: 97,
      f: 102
    };
  }
});

// ../node_modules/@noble/hashes/esm/_u64.js
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var U32_MASK64, _32n, rotlSH, rotlSL, rotlBH, rotlBL;
var init_u64 = __esm({
  "../node_modules/@noble/hashes/esm/_u64.js"() {
    U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
    _32n = /* @__PURE__ */ BigInt(32);
    rotlSH = (h, l, s) => h << s | l >>> 32 - s;
    rotlSL = (h, l, s) => l << s | h >>> 32 - s;
    rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
    rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
  }
});

// ../node_modules/@noble/hashes/esm/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes2(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes2(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
var isLE, swap32IfBE, Hash;
var init_utils = __esm({
  "../node_modules/@noble/hashes/esm/utils.js"() {
    isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
    swap32IfBE = isLE ? (u) => u : byteSwap32;
    Hash = class {
    };
  }
});

// ../node_modules/@noble/hashes/esm/sha3.js
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds; round < 24; round++) {
    for (let x = 0; x < 10; x++)
      B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t = 0; t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++)
        B[x] = s[y + x];
      for (let x = 0; x < 10; x++)
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}
var _0n, _1n, _2n, _7n, _256n, _0x71n, SHA3_PI, SHA3_ROTL, _SHA3_IOTA, IOTAS, SHA3_IOTA_H, SHA3_IOTA_L, rotlH, rotlL, Keccak, gen, keccak_256;
var init_sha3 = __esm({
  "../node_modules/@noble/hashes/esm/sha3.js"() {
    init_u64();
    init_utils();
    _0n = BigInt(0);
    _1n = BigInt(1);
    _2n = BigInt(2);
    _7n = BigInt(7);
    _256n = BigInt(256);
    _0x71n = BigInt(113);
    SHA3_PI = [];
    SHA3_ROTL = [];
    _SHA3_IOTA = [];
    for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
      [x, y] = [y, (2 * x + 3 * y) % 5];
      SHA3_PI.push(2 * (5 * y + x));
      SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
      let t = _0n;
      for (let j = 0; j < 7; j++) {
        R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
        if (R & _2n)
          t ^= _1n << (_1n << /* @__PURE__ */ BigInt(j)) - _1n;
      }
      _SHA3_IOTA.push(t);
    }
    IOTAS = split(_SHA3_IOTA, true);
    SHA3_IOTA_H = IOTAS[0];
    SHA3_IOTA_L = IOTAS[1];
    rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
    rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
    Keccak = class _Keccak extends Hash {
      // NOTE: we accept arguments in bytes instead of bits here.
      constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        this.enableXOF = false;
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        anumber(outputLen);
        if (!(0 < blockLen && blockLen < 200))
          throw new Error("only keccak-f1600 function is supported");
        this.state = new Uint8Array(200);
        this.state32 = u32(this.state);
      }
      clone() {
        return this._cloneInto();
      }
      keccak() {
        swap32IfBE(this.state32);
        keccakP(this.state32, this.rounds);
        swap32IfBE(this.state32);
        this.posOut = 0;
        this.pos = 0;
      }
      update(data) {
        aexists(this);
        data = toBytes2(data);
        abytes(data);
        const { blockLen, state } = this;
        const len = data.length;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          for (let i = 0; i < take; i++)
            state[this.pos++] ^= data[pos++];
          if (this.pos === blockLen)
            this.keccak();
        }
        return this;
      }
      finish() {
        if (this.finished)
          return;
        this.finished = true;
        const { state, suffix, pos, blockLen } = this;
        state[pos] ^= suffix;
        if ((suffix & 128) !== 0 && pos === blockLen - 1)
          this.keccak();
        state[blockLen - 1] ^= 128;
        this.keccak();
      }
      writeInto(out) {
        aexists(this, false);
        abytes(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len; ) {
          if (this.posOut >= blockLen)
            this.keccak();
          const take = Math.min(blockLen - this.posOut, len - pos);
          out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
          this.posOut += take;
          pos += take;
        }
        return out;
      }
      xofInto(out) {
        if (!this.enableXOF)
          throw new Error("XOF is not possible for this instance");
        return this.writeInto(out);
      }
      xof(bytes) {
        anumber(bytes);
        return this.xofInto(new Uint8Array(bytes));
      }
      digestInto(out) {
        aoutput(out, this);
        if (this.finished)
          throw new Error("digest() was already called");
        this.writeInto(out);
        this.destroy();
        return out;
      }
      digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
      }
      destroy() {
        this.destroyed = true;
        clean(this.state);
      }
      _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to || (to = new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
      }
    };
    gen = (suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen));
    keccak_256 = /* @__PURE__ */ (() => gen(1, 136, 256 / 8))();
  }
});

// ../node_modules/viem/_esm/utils/hash/keccak256.js
function keccak256(value, to_) {
  const to = to_ || "hex";
  const bytes = keccak_256(isHex(value, { strict: false }) ? toBytes(value) : value);
  if (to === "bytes")
    return bytes;
  return toHex(bytes);
}
var init_keccak256 = __esm({
  "../node_modules/viem/_esm/utils/hash/keccak256.js"() {
    init_sha3();
    init_isHex();
    init_toBytes();
    init_toHex();
  }
});

// ../node_modules/viem/_esm/utils/lru.js
var LruMap;
var init_lru = __esm({
  "../node_modules/viem/_esm/utils/lru.js"() {
    LruMap = class extends Map {
      constructor(size2) {
        super();
        Object.defineProperty(this, "maxSize", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.maxSize = size2;
      }
      get(key) {
        const value = super.get(key);
        if (super.has(key)) {
          super.delete(key);
          super.set(key, value);
        }
        return value;
      }
      set(key, value) {
        if (super.has(key))
          super.delete(key);
        super.set(key, value);
        if (this.maxSize && this.size > this.maxSize) {
          const firstKey = super.keys().next().value;
          if (firstKey !== void 0)
            super.delete(firstKey);
        }
        return this;
      }
    };
  }
});

// ../node_modules/viem/_esm/utils/address/getAddress.js
function checksumAddress(address_, chainId) {
  if (checksumAddressCache.has(`${address_}.${chainId}`))
    return checksumAddressCache.get(`${address_}.${chainId}`);
  const hexAddress = chainId ? `${chainId}${address_.toLowerCase()}` : address_.substring(2).toLowerCase();
  const hash = keccak256(stringToBytes(hexAddress), "bytes");
  const address = (chainId ? hexAddress.substring(`${chainId}0x`.length) : hexAddress).split("");
  for (let i = 0; i < 40; i += 2) {
    if (hash[i >> 1] >> 4 >= 8 && address[i]) {
      address[i] = address[i].toUpperCase();
    }
    if ((hash[i >> 1] & 15) >= 8 && address[i + 1]) {
      address[i + 1] = address[i + 1].toUpperCase();
    }
  }
  const result = `0x${address.join("")}`;
  checksumAddressCache.set(`${address_}.${chainId}`, result);
  return result;
}
var checksumAddressCache;
var init_getAddress = __esm({
  "../node_modules/viem/_esm/utils/address/getAddress.js"() {
    init_toBytes();
    init_keccak256();
    init_lru();
    checksumAddressCache = /* @__PURE__ */ new LruMap(8192);
  }
});

// ../node_modules/viem/_esm/utils/address/isAddress.js
function isAddress(address, options) {
  const { strict = true } = options ?? {};
  const cacheKey = `${address}.${strict}`;
  if (isAddressCache.has(cacheKey))
    return isAddressCache.get(cacheKey);
  const result = (() => {
    if (!addressRegex.test(address))
      return false;
    if (address.toLowerCase() === address)
      return true;
    if (strict)
      return checksumAddress(address) === address;
    return true;
  })();
  isAddressCache.set(cacheKey, result);
  return result;
}
var addressRegex, isAddressCache;
var init_isAddress = __esm({
  "../node_modules/viem/_esm/utils/address/isAddress.js"() {
    init_lru();
    init_getAddress();
    addressRegex = /^0x[a-fA-F0-9]{40}$/;
    isAddressCache = /* @__PURE__ */ new LruMap(8192);
  }
});

// src/server/security.ts
var hits = /* @__PURE__ */ new Map();
function rateLimit(key, max = 60, windowMs = 6e4) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now - cur.at > windowMs) {
    hits.set(key, { n: 1, at: now });
    return true;
  }
  cur.n += 1;
  return cur.n <= max;
}
var SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob: ipfs:",
    "connect-src 'self' https://rpc.mainnet.chain.robinhood.com https://en.wikipedia.org https://wikimedia.org https://www.wikidata.org wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ")
};

// ../node_modules/viem/_esm/index.js
init_isAddress();

// src/config/official.ts
function env(name) {
  const fromProcess = typeof process !== "undefined" ? process.env[name] : void 0;
  const viteEnv = import.meta.env;
  const fromVite = viteEnv?.[name];
  return (fromProcess || fromVite || "").trim();
}
function officialAddress(envName, published) {
  const override = env(envName);
  return override || published;
}
var PONS_FACTORY = officialAddress(
  "VITE_PONS_FACTORY",
  "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e"
);
var PONS_LAUNCH_AND_BUY = officialAddress(
  "VITE_PONS_LAUNCH_AND_BUY",
  "0xe33E9E479dF8802cb0866d5d05258bEc4cF62948"
);
var PONS_MEME_HOOK = officialAddress("VITE_PONS_MEME_HOOK", "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044");
var PONS_FEE_ESCROW = officialAddress("VITE_PONS_FEE_ESCROW", "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e");
var PONS_BUYBACK_VAULT = officialAddress("VITE_PONS_BUYBACK_VAULT", "0x42df2a798f82289E177311362e8f5ccC45c1219c");
var PONS_LAUNCH_LOCKER = officialAddress("VITE_PONS_LAUNCH_LOCKER", "0x267444D099b10fB5Ed7c3Cc7B7c767AdcA574952");
var PONS_LAUNCH_DEPLOYER = officialAddress("VITE_PONS_LAUNCH_DEPLOYER", "0x3711ceA4feaDE896C913C68F01Eda97Cb06D1A42");
var ETH_PAIR = "0x0000000000000000000000000000000000000000";
var blockedQuote = "0xf0c4bf4c582cb3836e98394b1d4e7b7281101be8";
var pairOverride = env("VITE_PONS_PAIR");
var QUOTE_TOKEN = pairOverride && pairOverride.toLowerCase() !== blockedQuote ? pairOverride : ETH_PAIR;
var LAUNCH_CONFIG_ID = BigInt(env("VITE_PONS_LAUNCH_CONFIG_ID") || "0");
var ROBINHOOD_CHAIN_ID = Number(env("VITE_ROBINHOOD_CHAIN_ID") || "4663");
var ROBINHOOD_EXPLORER = env("VITE_ROBINHOOD_EXPLORER") || "https://robinhoodchain.blockscout.com";
function robinhoodRpcUrls() {
  return [...new Set([env("VITE_ROBINHOOD_RPC"), "https://rpc.mainnet.chain.robinhood.com"].filter(
    (url) => Boolean(url) && !/robinhood\.family/i.test(url)
  ))];
}
var ROBINHOOD_RPC = robinhoodRpcUrls()[0];
var EDITOR_FEE_VAULT = env("VITE_EDITOR_FEE_VAULT");
var GITPAD_FEE_ROUTER = env("VITE_GITPAD_FEE_ROUTER");

// src/lib/format.ts
function stripHtml(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

// src/lib/editorFees.ts
function env2(name) {
  const fromProcess = typeof process !== "undefined" ? process.env[name] : void 0;
  const viteEnv = import.meta.env;
  const fromVite = viteEnv?.[name];
  return (fromProcess || fromVite || "").trim();
}
function editorHoldRecipient() {
  const vault = env2("VITE_EDITOR_FEE_VAULT");
  const router = env2("VITE_GITPAD_FEE_ROUTER");
  if (vault && isAddress(vault)) return vault;
  if (router && isAddress(router)) return router;
  return PONS_FEE_ESCROW;
}
function resolveEditorFeeTo(wallet) {
  const w = (wallet || "").trim();
  if (w && isAddress(w)) return { feeTo: w, kind: "wallet" };
  return { feeTo: editorHoldRecipient(), kind: "held" };
}
function editorUserUrl(name) {
  return `https://en.wikipedia.org/wiki/User:${encodeURIComponent(name.replace(/ /g, "_"))}`;
}

// src/server/wiki.ts
var UA = "WikiPad/1.0 (https://wikipad; knowledge markets on Pons V2; ponsblox)";
var cache = /* @__PURE__ */ new Map();
var TTL = 5 * 6e4;
var ApiError = class extends Error {
  status;
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function ymd(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
function utcDaysAgo(n) {
  const d = /* @__PURE__ */ new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function articleKey(title) {
  return title.trim().replace(/ /g, "_");
}
function absUrl(url) {
  const v = (url || "").trim();
  if (!v) return null;
  if (v.startsWith("//")) return `https:${v}`;
  return v;
}
async function wikiGet(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" }
  });
  if (!res.ok) {
    throw new ApiError(res.status === 404 ? 404 : 502, "Wikipedia is unavailable. Try again.");
  }
  const json = await res.json();
  cache.set(url, { at: Date.now(), value: json });
  return json;
}
var SKIP = /^(Main_Page|Special:|Wikipedia:|File:|Portal:|Template:|Category:|Help:|User:|Talk:|Draft:|TimedText:|MediaWiki:|Module:|Book:)/i;
async function searchPages(q) {
  const query = q.trim();
  if (!query) return [];
  const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=12`;
  const data = await wikiGet(url);
  return (data.pages || []).filter((p) => p.title && !SKIP.test(p.key || p.title.replace(/ /g, "_"))).map((p) => ({
    title: p.title,
    pageid: p.id,
    snippet: stripHtml(p.excerpt || ""),
    description: p.description || "",
    thumbnail: absUrl(p.thumbnail?.url),
    key: p.key
  }));
}
async function fetchSummary(title) {
  const key = encodeURIComponent(articleKey(title));
  return wikiGet(`https://en.wikipedia.org/api/rest_v1/page/summary/${key}`);
}
async function fetchProps(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageprops|langlinks&ppprop=wikibase_item|disambiguation&lllimit=500&format=json&origin=*`;
  const data = await wikiGet(url);
  const page = Object.values(data.query?.pages || {})[0];
  if (!page || page.pageid == null) return { qid: null, languages: 1, disambiguation: false, pageid: null };
  return {
    qid: page.pageprops?.wikibase_item || null,
    languages: 1 + (page.langlinks?.length || 0),
    disambiguation: page.pageprops?.disambiguation !== void 0,
    pageid: page.pageid
  };
}
async function fetchQidFromWikidata(title) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(title)}&props=labels&languages=en&format=json&origin=*`;
  const data = await wikiGet(url);
  const row = Object.values(data.entities || {})[0];
  if (!row || row.missing || !row.id) return null;
  return row.id;
}
async function fetchViews(title) {
  const start = ymd(utcDaysAgo(16));
  const end = ymd(utcDaysAgo(0));
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(articleKey(title))}/daily/${start}/${end}`;
  const data = await wikiGet(url).catch(() => ({ items: [] }));
  const series = (data.items || []).map((i) => Number(i.views || 0)).filter((n) => Number.isFinite(n));
  if (!series.length) return { views24h: null, views7d: null, viewsPrev7d: null, growthPct: null };
  const complete = series.slice(0, -1);
  const used = complete.length ? complete : series;
  const views24h = used[used.length - 1] ?? null;
  const last7 = used.slice(-7);
  const prev7 = used.slice(-14, -7);
  const views7d = last7.length ? last7.reduce((a, b) => a + b, 0) : null;
  const viewsPrev7d = prev7.length ? prev7.reduce((a, b) => a + b, 0) : null;
  const growthPct = views7d != null && viewsPrev7d != null && viewsPrev7d > 0 ? (views7d - viewsPrev7d) / viewsPrev7d * 100 : null;
  return { views24h, views7d, viewsPrev7d, growthPct };
}
async function fetchEdits(title) {
  const url = `https://en.wikipedia.org/w/rest.php/v1/page/${encodeURIComponent(articleKey(title))}/history/counts/edits`;
  const data = await wikiGet(url).catch(() => ({ count: void 0 }));
  return typeof data.count === "number" ? data.count : null;
}
function isBotName(user) {
  return /bot$/i.test(user.trim()) || /\bbot\b/i.test(user);
}
function isIpUser(user) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(user) || /:/.test(user);
}
function pickEditor(revs) {
  const list = revs || [];
  for (const r of list) {
    if (!r.user) continue;
    if (r.bot) continue;
    if (isBotName(r.user)) continue;
    return { name: r.user, timestamp: r.timestamp || null };
  }
  const first = list[0];
  if (first?.user) return { name: first.user, timestamp: first.timestamp || null };
  return null;
}
var ADDR_RE = /0x[a-fA-F0-9]{40}/g;
async function fetchUserWallet(username) {
  if (isIpUser(username)) return null;
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(`User:${username}`)}&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*`;
  const data = await wikiGet(url).catch(() => null);
  if (!data) return null;
  const page = Object.values(data.query?.pages || {})[0];
  if (!page || page.missing !== void 0) return null;
  const rev = page.revisions?.[0];
  const text = rev?.slots?.main?.content || rev?.slots?.main?.["*"] || rev?.["*"] || "";
  const hits2 = text.match(ADDR_RE) || [];
  for (const h of hits2) {
    if (isAddress(h)) return h;
  }
  return null;
}
async function fetchPageEditor(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=${encodeURIComponent(title)}&rvlimit=25&rvprop=user|timestamp|comment|flags&redirects=1&format=json&origin=*`;
  const data = await wikiGet(url).catch(() => null);
  const page = Object.values(data?.query?.pages || {})[0];
  const picked = pickEditor(page?.revisions);
  if (!picked) return null;
  const wallet = await fetchUserWallet(picked.name).catch(() => null);
  const route = resolveEditorFeeTo(wallet);
  return {
    name: picked.name,
    timestamp: picked.timestamp,
    userUrl: editorUserUrl(picked.name),
    wallet,
    feeTo: route.feeTo,
    held: route.kind === "held"
  };
}
async function fetchTopDay(offset) {
  const d = utcDaysAgo(offset);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${y}/${m}/${day}`;
  const data = await wikiGet(url);
  return data.items?.[0]?.articles || [];
}
async function topArticles() {
  for (const offset of [1, 2, 3]) {
    const rows = await fetchTopDay(offset).catch(() => []);
    if (rows.length) return rows.filter((r) => !SKIP.test(r.article));
  }
  return [];
}
async function loadPage(title) {
  const raw = title.trim();
  if (!raw) throw new ApiError(400, "Title is required");
  const [summary, props] = await Promise.all([
    fetchSummary(raw),
    fetchProps(raw)
  ]);
  const canonical = summary.titles?.normalized || summary.titles?.canonical || summary.title || raw;
  const type = summary.type === "disambiguation" || props.disambiguation ? "disambiguation" : summary.type === "standard" ? "standard" : "other";
  let qid = props.qid;
  if (!qid) qid = await fetchQidFromWikidata(canonical).catch(() => null);
  const [views, edits, top, editor] = await Promise.all([
    fetchViews(canonical),
    fetchEdits(canonical),
    topArticles().catch(() => []),
    fetchPageEditor(canonical).catch(() => null)
  ]);
  const rank = top.find((r) => r.article.replace(/_/g, " ").toLowerCase() === canonical.replace(/_/g, " ").toLowerCase())?.rank ?? null;
  const ns = summary.namespace?.id;
  let launchBlock = null;
  if (type === "disambiguation") launchBlock = "This is a disambiguation page. Choose a specific article before pairing.";
  else if (ns != null && ns !== 0) launchBlock = "Only main-namespace Wikipedia articles can be paired.";
  else if (!summary.pageid && !props.pageid) launchBlock = "This title is not a Wikipedia article.";
  else if (!qid) launchBlock = "No Wikidata entity is attached to this page, so it cannot be verified for launch.";
  const index = {
    views24h: views.views24h,
    views7d: views.views7d,
    viewsPrev7d: views.viewsPrev7d,
    growthPct: views.growthPct,
    edits,
    languages: props.languages,
    rank
  };
  const pageid = summary.pageid || props.pageid || 0;
  return {
    title: canonical,
    displayTitle: stripHtml(summary.displaytitle || canonical),
    pageid,
    qid,
    extract: summary.extract || "",
    description: summary.description || "",
    thumbnail: absUrl(summary.thumbnail?.source),
    originalImage: absUrl(summary.originalimage?.source),
    wikipediaUrl: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(articleKey(canonical))}`,
    wikidataUrl: qid ? `https://www.wikidata.org/wiki/${qid}` : null,
    type,
    launchable: launchBlock == null && pageid > 0,
    launchBlock,
    index,
    editor
  };
}
async function hydrateTop(limit) {
  const top = (await topArticles()).slice(0, limit);
  const rows = await Promise.all(top.map(async (row) => {
    const title = row.article.replace(/_/g, " ");
    const [summary, views] = await Promise.all([
      fetchSummary(title).catch(() => null),
      fetchViews(title).catch(() => ({ views24h: null, growthPct: null }))
    ]);
    if (summary?.type === "disambiguation") return null;
    return {
      title: summary?.titles?.normalized || summary?.title || title,
      pageid: summary?.pageid ?? null,
      extract: (summary?.extract || "").slice(0, 220),
      description: summary?.description || "",
      thumbnail: absUrl(summary?.thumbnail?.source),
      views: row.views,
      rank: row.rank,
      growthPct: views.growthPct,
      views24h: views.views24h
    };
  }));
  return rows.filter((r) => r !== null);
}
async function loadTrending() {
  return hydrateTop(10);
}
async function loadMostViewed() {
  return hydrateTop(16);
}

// src/server/handleApi.ts
async function handleApi(req) {
  const path = req.pathname.replace(/\/+$/, "") || "/";
  if (!rateLimit(`${req.ip || "local"}:${path}`, 80)) {
    return { status: 429, json: { error: "Rate limited. Wait a minute." } };
  }
  try {
    if (path === "/api/health" && req.method === "GET") {
      return { status: 200, json: { ok: true, product: "WikiPad" } };
    }
    if (path === "/api/wiki/search" && req.method === "GET") {
      const q = req.search.get("q") || "";
      const results = await searchPages(q);
      return { status: 200, json: { results, q } };
    }
    if (path === "/api/wiki/page" && req.method === "GET") {
      const title = req.search.get("title") || "";
      const page = await loadPage(title);
      return { status: 200, json: page };
    }
    if (path === "/api/wiki/trending" && req.method === "GET") {
      const results = await loadTrending();
      return { status: 200, json: { results } };
    }
    if (path === "/api/wiki/top" && req.method === "GET") {
      const results = await loadMostViewed();
      return { status: 200, json: { results } };
    }
    return { status: 404, json: { error: "Not found" } };
  } catch (e) {
    if (e instanceof ApiError) {
      const msg = e.message;
      if (/eth_call|HTTP request failed|rpc\.mainnet|viem|0x[a-fA-F0-9]{24,}/i.test(msg)) {
        return { status: 502, json: { error: "Wikipedia is unavailable. Try again." } };
      }
      return { status: e.status, json: { error: msg } };
    }
    return { status: 500, json: { error: "Something failed." } };
  }
}

// src/server/vercelHandler.ts
function header(req, name) {
  const value = req.headers[name];
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] : void 0;
}
function apiPathname(req, url) {
  const raw = url.pathname.replace(/\/+$/, "") || "/";
  if (raw !== "/api/all" && raw !== "/api/all.js") return url.pathname;
  const candidates = [
    header(req, "x-forwarded-uri"),
    header(req, "x-invoke-path"),
    header(req, "x-matched-path")
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const path = candidate.startsWith("http") ? new URL(candidate).pathname : candidate.split("?")[0];
    if (path.startsWith("/api/") && path !== "/api/all" && path !== "/api/all.js") return path;
  }
  return url.pathname;
}
async function handler(req, res) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `http://${host}`);
  const result = await handleApi({
    method: req.method || "GET",
    pathname: apiPathname(req, url),
    search: url.searchParams,
    body: req.body,
    origin: typeof req.headers.origin === "string" ? req.headers.origin : void 0,
    host
  });
  res.statusCode = result.status;
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  res.setHeader("content-type", result.contentType || "application/json");
  res.setHeader("cache-control", "s-maxage=120, stale-while-revalidate=300");
  res.end(result.raw ?? JSON.stringify(result.json ?? {}));
}
export {
  handler as default
};
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
