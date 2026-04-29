import { defineStore } from 'pinia'
import mqtt from 'mqtt'
import { useProducts, useIPCData } from './index.js'

let client

export const useMqtt = defineStore('mqttStore', {
  state: () => ({
    machineId: 1,
  }),
  getters: {
    topicsList: state => {
      return ['Product/UpdateProducts', `Product/UpdateProductStock/${state.machineId}`]
    },
  },
  actions: {
    setClient() {
      client = mqtt.connect(import.meta.env.VITE_MQTT_CONNECT, {
        connectTimeout: 40000,
      })
    },
    initMqtt() {
      this.setClient()
      const ipcStore = useIPCData()
      this.machineId = ipcStore.extraConfig.machine_id
      // 連線
      client.on('connect', e => {
        ipcStore.sendIpcRenderer('log', {
          logType: 'info',
          msg: 'mqtt連線成功',
        })
        client.subscribe(this.topicsList, { qos: 0 }, (error, granted) => {
          if (error) {
            ipcStore.sendIpcRenderer('log', {
              logType: 'error',
              msg: `mqtt訂閱失敗: ${error.toString()}`,
            })
            return
          }
          ipcStore.sendIpcRenderer('log', {
            msg: `mqtt訂閱成功: ${JSON.stringify(granted)}`,
          })
        })
      })
      client.on('error', err => {
        ipcStore.sendIpcRenderer('log', {
          logType: 'error',
          msg: `mqtt連線失敗: ${err}`,
        })
      })
      client.on('reconnect', err => {
        ipcStore.sendIpcRenderer('log', {
          logType: 'error',
          msg: `mqtt重新連線，原因: ${err}`,
        })
      })
      // 接收訊息
      client.on('message', this.handleMqttMessage)
    },
    handleMqttMessage(topic, message) {
      console.log(`收到訊息 topic ${topic}: `)
      console.log(message)
      const decoder = new TextDecoder()
      const text = decoder.decode(message)
      const ipcStore = useIPCData()
      ipcStore.sendIpcRenderer('log', {
        msg: `收到訊息 topic ${topic}: \n ${text}`,
      })

      // 將物件中的鍵名首字母改為小寫
      const jsonObject = JSON.parse(text)
      const newObjectToLowerCase = jsonObject.map(item => {
        const newItem = {}
        for (const [key, value] of Object.entries(item)) {
          newItem[key.charAt(0).toLowerCase() + key.slice(1)] = value
        }
        return newItem
      })
      // 根據topic處訊息
      const ProductsStore = useProducts()
      switch (topic) {
        case 'Product/UpdateProducts':
          ProductsStore.updateProductsRes(newObjectToLowerCase)
          break
        case `Product/UpdateProductStock/${this.machineId}`:
          ProductsStore.updateProductStockRes(newObjectToLowerCase)
          break
      }
    },
    // 取消訂閱
    mqttUnSubscribe(topic, qos) {
      client.unsubscribe(topic, { qos }, error => {
        if (error) {
          console.log('unsubscribe error:', error)
          return
        }
        console.log(`unsubscribed topic: ${topic}`)
      })
    },
    // 设置发布的主题、消息及 QoS
    mqttPublish(topic, qos) {
      client.publish(topic, inputMsg.value, { qos }, error => {
        if (error) {
          console.log('publish error:', error)
          return
        }
        console.log(`發送成功: ${inputMsg.value}`)
      })
    },
    ReconnectMqtt() {
      if (client?.connected) {
        try {
          client.end(false, () => {
            console.log('disconnected successfully')
            this.initMqtt()
          })
        } catch (error) {
          console.log('disconnect error:', error)
        }
      } else {
        this.initMqtt()
      }
    },
  },
})
