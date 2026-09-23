export default class {

  constructor(api, page) {
    this.api = api
    this.allDevices = []
    this.page = page
    if (page.setData) {
      page.setData({
        devices: this.allDevices
      })
    } else {
      this.devices = this.allDevices
    }

    this.registeredDevices = []
    this.filteredDevices = []
    this.blockedDevices = ['未知或不支持的设备', '未知设备']
    this.connectedDevice = {}
    this.objectId = Math.random()
    this.enabled = true
    if (api.getDeviceInfo().platform === 'android') {
      this.chunkSize = 20  // 安卓小程序默认只支持 20 字节，打印图片时单独配置实例
    } else {
      this.chunkSize = 200
    }
  }

  // 获取本机蓝牙适配器状态
  getState({ success, fail, allowDup = false } = {}) {
    const allDevices = [...this.allDevices]
    console.debug('已连接设备（init）：', this.connectedDevice, this.objectId)
    console.debug('绑定设备（init）：', this.registeredDevices)
    console.debug('所有设备（init）：', allDevices.length, allDevices)
    this.api.getBluetoothAdapterState({
      success: stateRes => {
        console.debug('蓝牙状态：', stateRes)
        const state = stateRes.adapterState || stateRes

        if (state.available) {
          this.#getBluetoothDevices(success)
        }

        if (state.discovering) {
          this.api.onBluetoothDeviceFound(res => {
            console.debug('-'.repeat(50))
            console.debug('发现新设备：', JSON.stringify(res.devices))
            this.#filterBluetoothDevices(res.devices, this.objectId, success)
          })
        } else {
          const item = allDevices.find(e => this.registeredDevices.includes(e.name))
          if (item) {
            console.debug('打印机已连接：', item)
          }
        }
      },
      fail: stateRes => {
        console.debug('获取蓝牙状态失败：', stateRes)
        this.api.openBluetoothAdapter({
          success: res => {
            console.debug('初始化蓝牙模块：', res)
            this.#getBluetoothDevices(success)
            this.startApiBluetoothDevicesDiscovery(allowDup, success)
          },
          fail: res => {
            fail?.(res)
            this.api.showModal({
              title: '初始化蓝牙模块失败',
              content: '清除微信缓存后再试'
            })
            console.debug('初始化蓝牙模块失败', res)
          }
        })
      }
    })
  }

  startApiBluetoothDevicesDiscovery(allowDup, successCallback) {
    this.api.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: allowDup,
      success: discoveryRes => {
        console.debug('开始搜寻：', discoveryRes)
        this.api.onBluetoothDeviceFound(foundRes => {
          // 因为 uniApp 没有实现停止监听的方法，所以通过传递 ObjectId 来比较打印服务实例
          console.debug('='.repeat(50))
          console.debug('发现新设备（OnFound）：', this.objectId, JSON.stringify(foundRes.devices))
          this.#filterBluetoothDevices(foundRes.devices, this.objectId, successCallback)
        })
      },
      fail: res => {
        console.debug('搜寻失败：', res)
        this.#reportError('startBluetoothDevicesDiscovery', res)
      }
    })
  }

  #filterBluetoothDevices(devices, objectId, successCallback, x = false) {
    if (!this.enabled) {
      return
    }
    const allDevices = [...this.allDevices]
    console.debug('所有设备（summary）：', allDevices.length, objectId)
    console.debug('所有设备（filter）：', allDevices)
    console.debug('本次已连接：', this.connectedDevice)
    console.debug('本次筛选：', devices.length, devices)
    devices.forEach(device => {
      if (!device.name && !device.localName) { return }
      if (!device.RSSI) { return }
      if (this.blockedDevices.length >= 1 && this.blockedDevices.find(e => device.name.includes(e))) { return }
      if (this.filteredDevices.length === 0 || (this.filteredDevices.length >= 1 && this.filteredDevices.some(e => e === '' || device.name.includes(e)))) {
        const item = allDevices.find(e => e.deviceId === device.deviceId)
        if (item) {
          console.debug('搜索到新设备-更新：', device.name)
          Object.assign(item, device)
        } else {
          console.debug('搜索到新设备：', device.name)
          allDevices.push(device)
          this.allDevices.push(device)
          if (this.page.setData) {
            this.page.setData({ devices: this.allDevices })
          } else {
            this.page.devices = this.allDevices
          }
        }
      }
    })

    const item = devices.find(e => this.registeredDevices.includes(e.name))
    console.debug('筛选设备-符合条件：', item)

    if (item) {
      if (this.api.offBluetoothDeviceFound === 'function') {
        this.api.offBluetoothDeviceFound(res => {
          console.debug('停止监听：', res)
        })
      }
      this.api.stopBluetoothDevicesDiscovery({
        complete: res => {
          console.debug('停止扫描：', res)
        }
      })

      allDevices.sort((a, b) => {
        if (a.deviceId === item.deviceId) {
          return -1
        } else if (b.deviceId === item.deviceId) {
          return 1
        }
        return 0
      })

      if (this.connectedDevice.deviceId === item.deviceId) {
        console.debug('已连接设备（即将打印）：', item.deviceId, objectId, this.objectId, this.enabled)
        successCallback?.({ devices: allDevices, printable: true })
      } else {
        if (x) {
          console.debug('-------------筛选', item.advertisServiceUUIDs)
          this.#getConnectedBluetoothDevices(item.advertisServiceUUIDs, item.deviceId, successCallback)
        } else {
          this.createBLEConnection(item.deviceId, successCallback)
        }
      }
    } else if (x) {
      // x 表示是筛选所有发现过的设备场景, 既然找不到就开启 discovery
      successCallback?.({ devices: allDevices })
      this.startApiBluetoothDevicesDiscovery(false, successCallback)
    }
  }

  #getBluetoothDevices(successCallback) {
    this.api.getBluetoothDevices({
      success: res => {
        console.debug('获取在蓝牙模块生效期间所有搜索到的蓝牙设备：', res)
        this.#filterBluetoothDevices(res.devices, this.objectId, successCallback, true)
      }
    })
  }

  // 在 ios 系统中，必须提供有效的 services , getConnectedBluetoothDevices 才能正常工作；
  #getConnectedBluetoothDevices(filterDevices, deviceId, successCallback) {
    console.debug('筛选列表：', filterDevices)
    this.api.getConnectedBluetoothDevices({
      services: filterDevices,
      success: res => {
        console.debug('当前连接：', res.devices.length, res.devices)
        if (res.devices.length > 0) {
          const connectedItem = res.devices.find(e => e.deviceId === deviceId)
          console.debug('当前连接-已连接：', connectedItem)
          if (connectedItem && this.connectedDevice.deviceId === deviceId) {
            this.setMtu(deviceId)
            successCallback?.({ devices: filterDevices, printable: true })
          } else if (connectedItem) {
            this.getBLEDeviceServices(deviceId, successCallback)
          } else {
            console.debug('即将连接设备（即将打印）：', deviceId)
            this.createBLEConnection(deviceId, successCallback)
          }
        } else {
          console.debug('即将连接设备（即将打印）：', deviceId)
          this.createBLEConnection(deviceId, successCallback)
        }
      }
    })
  }

  setMtu(deviceId) {
    this.api.getBLEMTU({
      deviceId,
      success: res => {
        console.debug('最大传输单元为：', res)
        this.chunkSize = res.mtu - 3

        this.api.onBLEMTUChange(changedRes => {
          console.debug('最大传输单元变更为：', changedRes)
          this.chunkSize = changedRes.mtu - 3
        })
      }
    })
  }

  closeBLEConnection() {
    this.enabled = false
    this.api.stopBluetoothDevicesDiscovery({
      complete: res => {
        console.debug('停止扫描蓝牙设备', res)
      }
    })

    if (this.connectedDevice) {
      //this.api.closeBLEConnection({deviceId: this.connectedDevice.deviceId,success: res => {console.debug('断开蓝牙连接成功：', res)}})
    }

    //this.api.closeBluetoothAdapter({success: res => {console.debug('关闭蓝牙!', res)}})
  }

  #reportError(api, res) {
    this.api.request({
      url: 'https://one.work/bluetooth/devices/err',
      method: 'POST',
      header: {
        Accept: 'application/json'
      },
      data: {
        api: api,
        message: res
      }
    })
  }

}
