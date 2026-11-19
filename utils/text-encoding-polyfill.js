import { TextDecoder, TextEncoder } from 'text-encoding'

const scope =
  (typeof globalThis !== 'undefined' && globalThis) ||
  (typeof global !== 'undefined' && global) ||
  (typeof self !== 'undefined' && self) ||
  (typeof window !== 'undefined' && window) ||
  {}

// xcprinter/iconv-lite 在模块顶层直接 new TextEncoder()/new TextDecoder()，必须先挂到真正的全局对象上。
scope.TextEncoder = TextEncoder
scope.TextDecoder = TextDecoder

if (typeof wx !== 'undefined') {
  wx.TextEncoder = TextEncoder
  wx.TextDecoder = TextDecoder
}

export { TextEncoder, TextDecoder }
