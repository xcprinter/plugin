import '../../utils/text-encoding-polyfill'
import BluetoothPrinter from '../../utils/bluetooth_printer'
import { PrintCommand } from 'xcprinter'

Component({
  properties: {
    connectedName: {
      type: String,
      value: ''
    }
  },

  lifetimes: {
    attached() {
      this.printer = new BluetoothPrinter(wx, this)
    }
  },

  methods: {
    formSubmit(e) {
      this.printer.registeredDevices = [this.data.connectedName]
      const input = e.detail.value
      const command = new PrintCommand()
      const data = command.setName(input.name)

      this.printer.getState({
        success: (res) => {
          if (res.printable) {
            this.printer.writeValue(data)
          }
        }
      })
    }
  }
})