import BluetoothPrinter from '../../utils/bluetooth_printer'
import { PrintCommand } from 'xcprinter'

Page({
  onLoad(options) {
    console.debug('print onload', options)

    this.setData({ 
      connectedName: options.connectedName
    })

    this.printer = new BluetoothPrinter(wx, this)
    this.printer.registeredDevices = [this.data.connectedName]

    wx.getConnectedWifi({
      success: res => {
        this.setData({ wifi: res.wifi })
      },
      fail: err => {
        console.debug(err)
      }
    })
  },

  scanWifi() {
    wx.scanCode({
      success: (res) => {
        const wifi = {}
        const xx = res.result.substring(5)
        xx.split(';').forEach(i => {
          if (i.startsWith('S:')) {
            wifi.SSID = i.split(':')[1]
          } else if (i.startsWith('P:')) {
            wifi.PWD = i.split(':')[1]
          }
        })
        this.setData({ wifi: wifi })
      }
    })
  },

  formSubmit(e) {
    const input = e.detail.value
    const command = new PrintCommand()
    const data = command.setWifi(input.ssid, input.password)

    this.printer.getState({
      success: (res) => {
        if (res.printable) {
          this.printer.writeValue(data)
        }
      }
    })
  }
})
