<template>
  <div class="view_login">
    <div class="back" @click="back">
      <el-icon><ArrowLeftBold /></el-icon>
    </div>
    <div class="content">
      <div class="account">
        <span> 帳號： </span>
        <input type="text" ref="account" :value="extraConfig.debug_mode ? 'edentest' : ''" />
      </div>
      <div class="password">
        <span> 密碼： </span>
        <input type="text" ref="password" :value="extraConfig.debug_mode ? 'ceis8888' : ''" />
      </div>
      <div class="loginButton">
        <button @click="login">登入</button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ArrowLeftBold } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import { ref, inject } from 'vue'
  import { postLogin } from '@renderer/api/request.js'
  import { useErrorMsg, useProducts, useIPCData } from '@renderer/store/index.js'
  import { decryptPassword } from '@renderer/utils/crypto.js'
  import { storeToRefs } from 'pinia'
  const ipcStore = useIPCData()
  const { extraConfig } = storeToRefs(ipcStore)

  const router = useRouter()

  const playAudio = inject('playAudio')
  const errorMsg = useErrorMsg()
  const productsStore = useProducts()
  productsStore.setIsServer(false)

  const account = ref(null)
  const password = ref(null)

  const back = () => {
    playAudio('back')
    router.push('/home')
  }

  const login = () => {
    const data = {
      name: account.value.value,
      password: password.value.value,
    }
    playAudio('click')
    if (data.name && data.password) {
      const key = import.meta.env.VITE_HASHKEY
      if (
        data.name === extraConfig.value.account &&
        data.password === decryptPassword(extraConfig.value.password, key)
      ) {
        router.push('/System')
        return
      }
      try {
        postLogin(data).then(res => {
          if (res.data.Status.Code === '0') {
            errorMsg.setErrorMsg({ msg: '登入成功' })
            router.push('/System')
          } else {
            errorMsg.setErrorMsg({ msg: '帳號密碼錯誤' })
          }
        })
      } catch {
        errorMsg.setErrorMsg({ msg: '發生錯誤，請稍後再試' })
      }
      return
    }
    errorMsg.setErrorMsg({ msg: '請輸入帳號密碼' })
  }
</script>

<style scoped>
  .view_login {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .content {
    width: 100%;
    margin: 100px;
    display: flex;
    flex-direction: column;
  }

  .password,
  .account {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
  }

  .password {
    margin: 30px 0;
  }

  .loginButton {
    display: flex;
    justify-content: right;
    color: white;
  }

  input {
    height: 50px;
    font-size: 30px;
    border-radius: 20px;
    text-indent: 10px;
    flex-grow: 1;
  }

  span {
    font-size: 30px;
  }

  button {
    color: white;
  }
</style>
