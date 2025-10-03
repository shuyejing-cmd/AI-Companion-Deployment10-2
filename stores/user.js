// 文件: stores/user.js

import { defineStore } from 'pinia';
// 【修正】在你的项目中，实际的API函数是从 @/api/user.js 导入的
import { loginRequest, registerRequest } from '@/api/user.js'; 

export const useUserStore = defineStore('user', {
    state: () => ({
        token: uni.getStorageSync('token') || null,
        // userInfo 已被移除，保持代码整洁
    }),
    getters: {
        isLoggedIn: (state) => !!state.token,
    },
    actions: {
        // ▼▼▼【核心重构代码】▼▼▼
        async login(loginData) {
            try {
                const response = await loginRequest(loginData);
                const accessToken = response.access_token;

                if (!accessToken) {
                    // 如果API成功但没有返回token，也视为失败
                    throw new Error('Token not found in response');
                }
                
                // 1. 更新自身状态
                this.token = accessToken;
                uni.setStorageSync('token', accessToken);
                
                // 2.【关键】不再调用 uni.switchTab 或 uni.showToast
                // 而是返回一个成功状态，让调用者（页面）去决定下一步做什么
                return true;

            } catch (error) {
                console.error('Login failed:', error);
                const errorMsg = error.data?.detail || '登录失败，请检查凭据';
                
                // 同样，只弹窗提示错误，并返回失败状态
                uni.showToast({ title: errorMsg, icon: 'none' });
                return false;
            }
        },
        // ▲▲▲【核心重构代码】▲▲▲

        async register(registerData) {
            try {
                await registerRequest(registerData);
                // 【建议】这里的 Toast 和跳转逻辑，未来也应该移到 register.vue 页面中
                // 作为本次核心重构，我们暂时保留它
                uni.showToast({
                    title: '注册成功，请登录',
                    icon: 'success',
                    duration: 2000
                });
                setTimeout(() => {
                    uni.navigateTo({
                        url: '/pages/login/login'
                    });
                }, 2000);
            } catch (error) {
                console.error('Registration failed:', error);
                const errorMsg = error.data?.detail || '注册失败，请稍后再试';
                uni.showToast({ title: errorMsg, icon: 'none' });
                throw error;
            }
        },

        logout() {
            this.token = null;
            uni.removeStorageSync('token');
            // 【建议】同理，这里的 UI 操作也应由页面发起
            uni.showToast({ title: '已退出登录', icon: 'none' });
            uni.reLaunch({
                url: '/pages/login/login'
            });
        }
    }
});