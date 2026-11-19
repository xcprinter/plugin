import '../../utils/text-encoding-polyfill'
import BluetoothPrinter from '../../utils/bluetooth_printer'
import { PrintPOS, PrintPic } from 'xcprinter'

Page({
  data: {
    state: '正在连接打印机...',
    width: 300,
    height: 200
  },

  onLoad(options) {
    this.setData({ 
      connectedName: options.connectedName
    })

    this.printer = new BluetoothPrinter(wx, this)
    this.printer.registeredDevices = [this.data.connectedName]
  },

  printPos() {
    const pos = new PrintPOS()
    pos.text_big('蓝牙打印 Bluetooth Printer!')
    pos.text('蓝牙打印')
    pos.qrcode('https://one.work')
    const data = pos.render()
    console.debug('POS处理后的数据：', data)

    this.print(data)
  },

  printImage() {
    const pos = new PrintPOS()
    const query = this.createSelectorQuery()

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const img = res.tempFiles[0]
        query.select('#hiddenCanvas').fields({ node: true, size: true }).exec(res => {
          console.debug(res)
          const canvas = res[0].node
          const imgNode = canvas.createImage()
          const pic = new PrintPic(wx.getWindowInfo().pixelRatio, imgNode)

          pic.loadImageToCanvas(canvas, img.tempFilePath, ress => {
            this.setData({
              width: ress.meta.width,
              height: ress.meta.height
            })
            pos.image(ress.data, ress.meta)
            this.print(pos.render())
          })
        })
      }
    })
  },

  printText() {
    const pos = new PrintPOS()
    pos.text_big('Bluetooth Printer!')
    pos.text('欢迎使用蓝牙打印机！')

    this.print(pos.render())
  },

  printQrcode() {
    const pos = new PrintPOS()
    pos.qrcode('https://one.work')

    this.print(pos.render())
  },

  printBar() {
    const pos = new PrintPOS()
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
