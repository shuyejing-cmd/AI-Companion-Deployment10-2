// main.js
import App from './App'
import { createSSRApp } from 'vue'

// 1. 引入 Pinia
import * as Pinia from 'pinia';

export function createApp() {
  const app = createSSRApp(App)

  // 2. 创建 Pinia 实例并挂载
  const pinia = Pinia.createPinia();
  app.use(pinia);

  return {
    app,
    Pinia, // HBuilderX 最新版本需要同时导出 Pinia
  }
}