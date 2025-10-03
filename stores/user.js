// stores/user.js
import { defineStore } from 'pinia';
// 【修正】只导入需要的函数
import { loginRequest, registerRequest } from '@/api/user.js'; 

export const useUserStore = defineStore('user', {
    state: () => ({
        token: uni.getStorageSync('token') || null,
        userInfo: JSON.parse(uni.getStorageSync('userInfo') || '{}'),
    }),
    getters: {
        isLoggedIn: (state) => !!state.token,
    },
    actions: {
        async login(loginData) {
            try {
                const response = await loginRequest(loginData);
                const accessToken = response.access_token;

                if (!accessToken) {
                    throw new Error('Token not found in response');
                }
                
                this.token = accessToken;
                uni.setStorageSync('token', accessToken);

                // 【修正】彻底移除 fetchUserInfo 的调用
                // await this.fetchUserInfo(); 

                uni.showToast({ title: '登录成功', icon: 'success' });
                uni.switchTab({
                    url: '/pages/index/index'
                });

            } catch (error) {
                console.error('Login failed:', error);
                const errorMsg = error.data?.detail || '登录失败，请检查凭据';
                uni.showToast({ title: errorMsg, icon: 'none' });
                throw error;
            }
        },
        async register(registerData) {
            try {
                await registerRequest(registerData);
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

        // 【修正】彻底移除 fetchUserInfo 这个 action
        /*
        async fetchUserInfo() {
            try {
                const userInfo = await getUserInfoRequest();
                this.userInfo = userInfo;
                uni.setStorageSync('userInfo', JSON.stringify(userInfo));
            } catch (error) {
                console.error('Fetch user info failed:', error);
                this.logout();
            }
        },
        */

        logout() {
            this.token = null;
            this.userInfo = {};
            uni.removeStorageSync('token');
            uni.removeStorageSync('userInfo');
            uni.showToast({ title: '已退出登录', icon: 'none' });
            uni.reLaunch({
                url: '/pages/login/login'
            });
        }
    }
});