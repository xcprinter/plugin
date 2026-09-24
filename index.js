// ================= 插件入口文件顶部 =================

// 1. 尝试获取原生 TextDecoder (高版本基础库已支持)
const NativeTextDecoder = (typeof globalThis !== 'undefined' && globalThis.TextDecoder) 
  ? globalThis.TextDecoder 
  : (typeof wx !== 'undefined' && wx.TextDecoder ? wx.TextDecoder : null);

class MiniProgramTextDecoder {
  constructor(label = 'utf-8', options = {}) {
    const normalizedLabel = (label || 'utf-8').toLowerCase().trim();
    
    // 2. 规范化并校验 encoding 标签 (支持 utf-16le 及其别名 ucs2/ucs-2)
    if (normalizedLabel === 'utf-8' || normalizedLabel === 'utf8') {
      this.encoding = 'utf-8';
    } else if (normalizedLabel === 'utf-16le' || normalizedLabel === 'utf16le' || normalizedLabel === 'ucs2' || normalizedLabel === 'ucs-2') {
      this.encoding = 'utf-16le';
    } else {
      throw new RangeError(`Failed to construct 'TextDecoder': The encoding label provided ('${label}') is invalid.`);
    }
    
    this.fatal = !!options.fatal;
  }

  decode(input, options = {}) {
    if (!input || input.byteLength === 0) return '';

    // 3. 统一转换为 Uint8Array 视图
    let uint8;
    if (input instanceof ArrayBuffer) {
      uint8 = new Uint8Array(input);
    } else if (ArrayBuffer.isView(input)) {
      uint8 = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    } else {
      throw new TypeError('The provided value is not of type `(ArrayBuffer or ArrayBufferView)`');
    }

    // 4. 针对 utf-16le 的高性能解码
    if (this.encoding === 'utf-16le') {
      return this._decodeUTF16LE(uint8);
    }

    // 5. UTF-8 解码：优先使用原生，保证生僻字/复杂字符 100% 正确
    if (NativeTextDecoder) {
      return new NativeTextDecoder('utf-8', { fatal: this.fatal }).decode(input, options);
    }
    
    // 极低版本基础库的 UTF-8 简易回退 (处理常规文本足够)
    try {
      return decodeURIComponent(escape(String.fromCharCode.apply(null, uint8)));
    } catch (e) {
      if (this.fatal) throw e;
      return String.fromCharCode.apply(null, uint8);
    }
  }

  // 核心：UTF-16LE 高效解码实现
  _decodeUTF16LE(uint8) {
    const len = uint8.length - (uint8.length % 2); // 确保按 2 字节对齐
    if (len === 0) return '';

    let startIndex = 0;
    // 可选：自动跳过 UTF-16LE BOM 头 (FF FE)
    if (len >= 2 && uint8[0] === 0xFF && uint8[1] === 0xFE) {
      startIndex = 2;
    }

    // 使用 Uint16Array 视图直接读取小端序 16 位整数，性能最佳
    const uint16 = new Uint16Array(uint8.buffer, uint8.byteOffset + startIndex, (len - startIndex) / 2);
    
    let result = '';
    const CHUNK_SIZE = 0x8000; // 分块处理，防止 String.fromCharCode.apply 参数过多导致调用栈溢出
    
    for (let i = 0; i < uint16.length; i += CHUNK_SIZE) {
      const chunk = uint16.subarray(i, i + CHUNK_SIZE);
      result += String.fromCharCode.apply(null, chunk);
    }
    
    return result;
  }
}

// 6. 强制挂载到全局，确保插件内部和主小程序调用时都能找到
if (typeof globalThis !== 'undefined') {
  globalThis.TextDecoder = MiniProgramTextDecoder;
} else if (typeof wx !== 'undefined') {
  wx.TextDecoder = MiniProgramTextDecoder;
}

// ====================================================

import BluetoothPrinter from './utils/bluetooth_printer'
import BluetoothWeigher from './utils/bluetooth_weigher'
import { PrintPOS, PrintCPCL, PrintPic, PrintCommand } from 'xcprinter'

export {
  BluetoothPrinter,
  BluetoothWeigher,
  PrintCPCL,
  PrintPOS,
  PrintPic,
  PrintCommand
}
