import '../../utils/text-encoding-polyfill'
import BluetoothPrinter from '../../utils/bluetooth_printer'
import { PrintCPCL, PrintPic } from 'xcprinter'

Page({
  onLoad(options) {
    this.setData({ 
      connectedName: options.connectedName
    })

    this.printer = new BluetoothPrinter(wx, this)
    this.printer.registeredDevices = [this.data.connectedName]
  },

  printCpcl() {
    const cpcl = new PrintCPCL()
    cpcl.text('const cpcl = new PrintCPCL()')
    cpcl.text('cpcl.text_bold("蓝牙打印")')
    cpcl.text_bold('蓝牙打印')
    cpcl.text('cpcl.lineX()')
    cpcl.lineX()
    cpcl.text('cpcl.text("蓝牙打印")')
    cpcl.text('蓝牙打印')
    cpcl.text('cpcl.qrcode_right("https://one.work")')
    cpcl.qrcode_right('https://one.work')
    const data = cpcl.render()
    console.debug(data)

    this.print(data)
  },

  printImage() {
    const pos = new PrintCPCL()
    const pic = new PrintPic(wx, this)
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const img = res.tempFiles[0]
        pic.loadImageToCanvas(img.tempFilePath, ress => {
          console.debug('回调数据：', ress)
          pos.image(ress.data, ress.meta)
          this.print(pos.render())
        })
      }
    })
  },

  printText() {
    const pos = new PrintCPCL()
    pos.text_big('Bluetooth Printer!')
    pos.text('欢迎使用蓝牙打印机！')

    this.print(pos.render())
  },

  printQrcode() {
    const pos = new PrintCPCL()
    pos.qrcode_right('https://one.work')

    this.print(pos.render())
  },

  printBar() {
    const pos = new PrintCPCL()
    pos.barcode('123456789')

    this.print(pos.render())
  },

  print(data) {
    this.printer.getState({
      success: (res) => {
        if (res.printable) {
          this.printer.writeValue(data)
        }
      }
    })
  }

})
