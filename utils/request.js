// utils/request.js
import { useUserStore } from '@/stores/user.js';

// 【重要】请将这里替换为你的后端部署地址
const BASE_URL = import.meta.env.VITE_BASE_URL; 
console.log(`[Request] Current API Base URL: ${BASE_URL}`); // 添加日志，方便调试

const request = (options) => {
    return new Promise((resolve, reject) => {
        // --- 请求拦截器 ---
        let userStore; // 将 userStore 的定义移到 Promise 内部
        try {
            userStore = useUserStore();
        } catch (error) {
            console.error("在请求拦截器中获取 Pinia store 失败:", error);
            // 即使获取store失败，也继续发送请求，让后端来决定是否需要认证
        }
        
        if (userStore && userStore.token) {
            if (!options.header) options.header = {};
            // 为请求头添加身份认证 Token
            options.header.Authorization = `Bearer ${userStore.token}`;
            console.log('请求已携带Token:', options.header.Authorization);
        }
        // --- 请求拦截器结束 ---

        uni.request({
            url: BASE_URL + options.url,
            method: options.method || 'GET',
            data: options.data || {},
            header: options.header || {},
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                } else if (res.statusCode === 401) {
                    console.error('响应拦截器：收到401，认证失败');
                    if(userStore) {
                            // userStore.logout() 内部应包含 uni.reLaunch 到登录页
                            userStore.logout(); 
                        } else {
                            // 如果 store 都获取不到，只能直接跳转（兜底方案）
                            uni.reLaunch({ url: '/pages/login/login' });
                        }
                    reject(res.data);
                } else {
                    console.error(`响应拦截器：请求失败，状态码 ${res.statusCode}`);
                    reject(res.data);
                }
            },
            fail: (err) => {
                uni.showToast({ title: '网络请求异常', icon: 'none' });
                console.error('网络请求失败:', err);
                reject(err);
            }
        });
    });
};

export default request;