import BluetoothPrinter from './utils/bluetooth_printer'
import BluetoothWeigher from './utils/bluetooth_weigher'
import { PrintPOS, PrintCPCL, PrintPic, PrintCommand } from 'xcprinter'
import { TextDecoder } from 'text-encoding'

// 关键步骤：显式挂载到全局作用域，确保主小程序调用时能跨作用域找到
if (typeof globalThis !== 'undefined') {
  globalThis.TextDecoder = globalThis.TextDecoder || TextDecoder
} else if (typeof wx !== 'undefined') {
  wx.TextDecoder = wx.TextDecoder || TextDecoder
} else if (typeof window !== 'undefined') {
  window.TextDecoder = window.TextDecoder || TextDecoder
}


export {
  BluetoothPrinter,
  BluetoothWeigher,
  PrintCPCL,
  PrintPOS,
  PrintPic,
  PrintCommand
}
