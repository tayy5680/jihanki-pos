import { openDB } from 'idb'

const DB_NAME = 'image-database'
const DB_VERSION = 1
const STORE_NAME = 'images'

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
  },
})

// 取得圖片
const getImageFromDB = async imageId => {
  const db = await dbPromise
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  return store.get(imageId)
}

// 儲存圖片
const saveImageToDB = async (imageId, imageUrl) => {
  const response = await fetch(imageUrl)
  const blob = await response.blob()

  // 儲存圖片至 IndexedDB
  const db = await dbPromise
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await store.put({ id: imageId, image: blob })
  await tx.done
}

// 清除
export const clearIndexedDBStore = async () => {
  try {
    const db = await dbPromise
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    // 清空
    await store.clear()
    await tx.done
  } catch (error) {
    console.error('清空 Object Store 內容時出錯：', error)
  }
}

export const getIndexedDBImage = async (imageId, imageUrl) => {
  let dbImgData = await getImageFromDB(imageId)

  if (!dbImgData) {
    await saveImageToDB(imageId, imageUrl)
    dbImgData = await getImageFromDB(imageId)
  }
  return dbImgData
}
