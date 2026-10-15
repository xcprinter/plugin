import BluetoothPrinter from '../../utils/bluetooth_printer'

Component({
  behaviors: ['wx://component-export'],

  export() {
    return {
      connectedId: this.data.connectedId,
      connectedName: this.data.connectedName
    }
  },

  properties: {
    deviceName: {
      type: String,
      value: ''
    }
  },

  lifetimes: {
    attached() {
      this.setData({
        connectedId: wx.getStorageSync('connectedId'),
        connectedName: wx.getStorageSync('connectedName')
      })

      if (this.data.connectedId) {
        this.doConnect(this.data.connectedId)
      }
      this.printer = new BluetoothPrinter(wx, this)
      if (this.data.deviceName) {
        this.printer.filteredDevices = this.data.deviceName.split(',')
      }
      this.printer.getState({
        success: res => {
          this.setData({ devices: res.devices })
        }
      })
    }
  },

  methods: {
    createBLEConnection(e) {
      const ds = e.currentTarget.dataset
      this.setData({
        connectedId: ds.deviceId,
        connectedName: ds.deviceName
      })

      wx.setStorageSync('connectedId', ds.deviceId)
      wx.setStorageSync('connectedName', ds.deviceName)

      this.doConnect(ds.deviceId)
      this.triggerEvent('selected', { ...ds })
    },

    doConnect(deviceId) {
      console.log('正在连接设备：', deviceId)
      wx.createBLEConnection({
        deviceId: deviceId,
        success: res => {
          this.setData({ connected: true })
        },
        fail: res => {
          wx.showModal({
            title: '连接蓝牙失败',
            content: JSON.stringify(res)
          })
        }
      })
    },

    closeBLEConnection(e) {
      const ds = e.currentTarget.dataset
      wx.closeBLEConnection({
        deviceId: this.data.connectedId,
        success: res => {
          console.debug('断开与蓝牙设备的连接', res)
        }
      })
      this.setData({ 
        connectedId: '',
        connectedName: ''
      })
      wx.removeStorageSync('connectedId')
      wx.removeStorageSync('connectedName')

      this.triggerEvent('unselected', { ...ds })
    },

    restartBluetooth() {
      wx.closeBluetoothAdapter({
        success: res => {
          this.setData({ devices: [] })
          this.printer.getState({
            success: res => {
              this.setData({ devices: res.devices })
            }
          })
        }
      })
    }
  }
})