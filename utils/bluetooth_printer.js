import Bluetooth from './bluetooth'

export default class extends Bluetooth {

  constructor(api, page) {
    super(api, page)
    this.printLock = false
  }

  // 向蓝牙设备发送数据
  writeValue(data) {
    console.debug(`${'-'.repeat(20)}${this.objectId}收到打印任务！${'-'.repeat(20)}`)
    if (this.printLock) {
      this.api.showModal({
        title: '打印机正忙',
        content: '前一个打印任务还在进行中！'
      })
      return
    }

    if (!Array.isArray(data) && !(data instanceof Uint8Array)) {
      this.api.showModal({
        title: '数据格式不符合预期',
        content: '支持 Array 类型或者 Uint8Array 类型数据！'
      })
      return
    }

    this.printLock = true
    if (Array.isArray(data)) {
      const buffer = new ArrayBuffer(data.length)
      const uint = new Uint8Array(buffer)
      uint.set(data)
      this.writeBuffer(uint)
    } else if (data instanceof Uint8Array) {
      this.writeBuffer(data)
    }
  }

  // 完善后的写入Buffer函数
  writeBuffer(buffer, chunkSize = this.chunkSize) {
    const totalChunks = Math.ceil(buffer.length / chunkSize)
    const systemInfo = this.api.getSystemInfoSync()
    const writeType = systemInfo.platform === 'android' ? 'writeNoResponse' : 'write'
    console.debug(`开始发送数据，总大小: ${buffer.length}字节，分${totalChunks}块发送`, `当前浏览器${systemInfo.platform}`)

    this.writeRemain({ 
      buffer: buffer, 
      chunkSize: chunkSize, 
      writeType: writeType
    })
  }

  writeRemain({ buffer, chunkSize, writeType, offset = 0, index = 1, retry = 3 } = {}) {
    if (offset >= buffer.length) {
      this.printLock = false
      console.debug('所有数据已发送完成')
      return
    }

    const chunk = buffer.subarray(offset, offset + chunkSize)
    const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.length)

    this.api.writeBLECharacteristicValue({
      deviceId: this.connectedDevice.deviceId,
      serviceId: this.connectedDevice.serviceId,
      characteristicId: this.connectedDevice.characteristicId,
      value: arrayBuffer,
      writeType: writeType,
      success: res => {
        console.debug(`写入第${index}块数据成功，写入：${this.connectedDevice.deviceId}，大小: ${chunk.length}字节`, res.errMsg)
        offset += chunkSize
        index += 1
        this.writeRemain({ 
          buffer: buffer, 
          offset: offset, 
          chunkSize: chunkSize, 
          writeType: writeType,
          index: index
        })
      },
      fail: res => {
        if (retry > 0) {
          retry -= 1
          console.debug(`写入第${index}块数据失败：`, res)
          this.writeRemain({
            buffer: buffer, 
            offset: offset, 
            chunkSize: chunkSize, 
            writeType: writeType,
            index: index,
            retry: retry
          })
        } else {
          this.printLock = false
          console.debug(`打印失败-----------------`)
          this.api.showModal(
            {
              title: '打印失败',
              content: '数据发送中断，请检查打印机连接后重试'
            }
          )
        }
      }
    })
  }

  createBLEConnection(deviceId, successCallback) {
    this.api.createBLEConnection({
      deviceId,
      success: res => {
        console.debug('连接蓝牙：', deviceId, res)
        if (successCallback) {
          this.getBLEDeviceServices(deviceId, successCallback)
        }
      },
      fail: res => {
        console.debug('连接蓝牙设备失败', deviceId, res)
      }
    })
  }

  // 获取蓝牙设备的所有服务
  getBLEDeviceServices(deviceId, successCallback) {
    this.api.getBLEDeviceServices({
      deviceId,
      success: res => {
        let availableServices = res.services.filter(service => service.isPrimary && service.uuid.toLowerCase().startsWith('0000ff00'))

        if (availableServices.length === 0) {
          console.debug('特征值没符合条件的，列出所有服务：')
          res.services.forEach(service => {
            console.debug(service)
          })
          console.debug('==' * 20)
          availableServices = res.services.filter(service => service.isPrimary && service.uuid.toLowerCase().startsWith('0000'))
        }

        if (availableServices.length === 0) {
          availableServices = res.services.filter(service => service.isPrimary && service.uuid.endsWith('0000-1000-8000-00805F9B34FB'))
        }

        const servicesLength = availableServices.length
        availableServices.forEach((service, index) => {
          console.debug('设备 ID：', deviceId, '主服务：', service.uuid)
          // 获取蓝牙设备服务中所有特征
          this.api.getBLEDeviceCharacteristics({
            deviceId: deviceId,
            serviceId: service.uuid,
            success: res => {
              for (const characteristic of res.characteristics) {
                console.debug('特征值', service.uuid, characteristic.uuid, characteristic.properties)
                if (characteristic.properties.write && characteristic.uuid.toLowerCase().startsWith('0000')) {
                  console.debug('可写入', deviceId, service.uuid, characteristic.uuid)
                  this.connectedDevice = {
                    deviceId: deviceId,
                    serviceId: service.uuid,
                    characteristicId: characteristic.uuid
                  }
                  break // 找到符合条件的之后就跳出循环
                }
              }
              // 所有 service 的特制值已获取完毕
              if (servicesLength === index + 1) {
                console.debug('获取打印机', this.connectedDevice)
                if (this.connectedDevice.deviceId) {
                  successCallback?.({ devices: this.allDevices, printable: true })
                } else {
                  this.api.showModal({
                    title: '获取合适的特征值失败',
                    content: JSON.stringify(res)
                  })
                }
              }
            },
            fail: res => {
              console.error('读取蓝牙设备特征值失败', res)
            }
          })
        })
      }
    })
  }
}