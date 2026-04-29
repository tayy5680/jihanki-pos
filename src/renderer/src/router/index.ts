import { createRouter, createWebHistory, Router, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../components/Home.vue'),
  },
  {
    path: '/Shopping',
    name: 'Shopping',
    component: () => import('../components/shopping/index.vue'),
  },
  {
    path: '/Product',
    name: 'Product',
    component: () => import('../components/Product.vue'),
  },
  {
    path: '/InvoiceCarrier',
    name: 'InvoiceCarrier',
    component: () => import('../components/invoiceCarrier/index.vue'),
  },
  {
    path: '/Payment',
    name: 'Payment',
    component: () => import('../components/Payment/Payment.vue'),
  },
  {
    path: '/PaymentProcessing/:payID',
    name: 'PaymentProcessing',
    component: () => import('../components/Payment/PaymentProcessing.vue'),
  },
  {
    path: '/RedeemPrizes',
    name: 'RedeemPrizes',
    component: () => import('../components/RedeemPrizes/index.vue'),
  },
  {
    path: '/Shipping',
    name: 'Shipping',
    component: () => import('../components/shipping/Shipping.vue'),
  },
  {
    path: '/Login',
    name: 'Login',
    component: () => import('../components/Server/Login.vue'),
  },
  {
    path: '/System',
    name: 'System',
    component: () => import('../components/System/index.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'Home' } },
  // { path: '/h_test', name: 'Payment', component: () => import('../components/hardwareTest/hardware.vue') },
]

// Router是路由对象类型
const router: Router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
