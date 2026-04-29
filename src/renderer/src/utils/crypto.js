import CryptoJS from 'crypto-js'

function sortObj(obj, apiKey) {
  let keyA = Object.keys(obj).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  let querystring = ''
  for (let index = 0; index < keyA.length; index++) {
    let value = ''
    if (typeof obj[keyA[index]] === 'object' && obj[keyA[index]] !== null) {
      value = JSON.stringify(obj[keyA[index]])
    } else {
      value = obj[keyA[index]]
    }
    querystring += `${keyA[index]}=${value}`
    if (index != keyA.length - 1) {
      querystring += '&'
    }
  }
  querystring += apiKey
  return querystring
}

export function convertSign(body, key) {
  const dataWithApiKey = sortObj(body, key)
  body.sign = CryptoJS.MD5(dataWithApiKey).toString()
  return body
}

export function decryptPassword(encryptedPassword, key) {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}
