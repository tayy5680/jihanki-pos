const { exec } = require('child_process')
const util = require('util')
const fs = require('fs')
export async function easycard(data, configFile) {
  await fs.writeFile(configFile.easycard.input, JSON.stringify(data), err => {
    if (err) {
      console.error('error:', err)
      return
    }
    console.log('success write easycard input file')
  })
  const execPromise = util.promisify(exec)
  try {
    const { stdout, stderr } = await execPromise(configFile.easycard.commend)
    return new Promise(async (resolve, reject) => {
      await fs.readFile(configFile.easycard.output, (err, data) => {
        if (err) {
          console.error('error:', err)
          return
        }
        resolve(JSON.parse(data))
      })
    })
  } catch {
    return { TXN_RESP_CODE: false, Msg: '卡機程式啟動失敗' }
  }
}
export async function payment(info, configFile) {
  await fs.writeFile(configFile.payment.input, info, err => {
    if (err) {
      console.error('error:', err)
      return
    }
    console.log('success')
  })
  const execPromise = util.promisify(exec)
  try {
    const { stdout, stderr } = await execPromise(configFile.payment.commend)
    // sendToVue('send_data', {Method: 'loadingRes',Data:{"Result":true,"Msg":null}})
    return new Promise(async (resolve, reject) => {
      await fs.readFile(configFile.payment.output, (err, data) => {
        if (err) {
          console.error('error:', err)
          return
        }
        const obj = {}
        const lines = data.toString().split('\r\n')
        lines.forEach(line => {
          const [key, value] = line.split('=')
          const variable = key.trim()
          obj[key] = value
        })
        resolve(obj)
      })
    })
  } catch {
    return { RESPONSECODE: false, Msg: '卡機程式啟動失敗' }
  }
}
