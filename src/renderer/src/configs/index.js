export const GAME_URL = [
  { id: 0, url: '', name: '自訂' },
  { id: 1, url: 'https://chvin.github.io/react-tetris/', name: '俄羅斯方塊' },
  {
    id: 2,
    url: 'https://victor-win.club/H5Game/game60001/web-mobile/index.html',
    name: '切水果',
  },
  {
    id: 3,
    url: 'https://victor-win.club/H5Game/game60002/web-mobile/index.html',
    name: '插針',
  },
  { id: 4, url: 'SlingshotGame', name: '礦寵彈弓(demo)' },
]

export const PAYMENT_LIST = [
  {
    id: 'third',
    type: 'third',
    name: '電子支付',
    imgName: 'img_phoneqr.png',
    wayId: 6,
    subLabel: 'LINE Pay、台灣 Pay、街口支付、Pi Pay、元大支付<br>微信支付、全支付、悠遊付、icash Pay',
    payTypeID: 'ThirdPay',
  },
  {
    id: 'creditcard',
    type: 'credit',
    name: '信用卡',
    imgName: 'img_handcredit card.png',
    wayId: 3,
    subLabel: 'Apple Pay、Google Pay、Samsung Pay<br>VISA、MasterCard',
    payTypeID: 'CreditCard',
  },
  {
    id: 'easycard',
    type: 'easycard',
    name: '悠遊卡',
    imgName: 'handEasycard.png',
    wayId: 5,
    subLabel: 'EasyCard Carrier',
    payTypeID: 'Z0',
  },
]

export const SHIPPING_ERROR_CODE = {
  '0x01': '無馬達動作，馬達通路 OPEN ( 未動作過 )',
  '0x02': '無馬達動作，馬達通路 OPEN ( 上次動作過 )',
  '0x03': '位置線斷開或者馬達卡死不轉，在缺口位置',
  '0x04': '位置線常閉，轉 7 秒多於 1 圈，或馬達卡死不轉，不在缺口位置',
  '0x05': '轉小於 2 秒，轉小於 1 圈。在缺口位置',
  '0x06': '轉大於 5 秒，轉多於 1 圈。在缺口位置',
  '0x07': '轉 7 秒，轉多於 2 圈。不在缺口位置',
  '0x08': '履帶貨道未檢測到貨物（可能無貨）',
  '0x09': '系統忙碌',
  '0x0A': '升降機沒有到達指定位置 (無貨)',
  '0x0B': '只支援履帶貨道回退',
}

export const TIME_OUT = 15 * 60 * 1000
