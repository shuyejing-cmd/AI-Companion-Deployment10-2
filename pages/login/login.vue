<template>
	<view class="container">
		<view class="form-wrapper">
			<view class="title">欢迎回来</view>
			
			<input class="input-item" type="text" v-model="loginForm.email" placeholder="请输入邮箱" />
			<input class="input-item" type="password" v-model="loginForm.password" placeholder="请输入密码" />
			
			<button class="action-btn" @click="handleLogin">登录</button>
			
			<view class="link" @click="goToRegister">还没有账户？立即注册</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user.js';

const userStore = useUserStore();

// 页面本地状态，用于UI展示
const email = ref('');
const password = ref('');
const isLoading = ref(false); // 用于防止用户重复点击

// ▼▼▼【核心重构代码】▼▼▼
const handleLogin = async () => {
    // 1. 防抖处理
    if (isLoading.value) return;

    // 2. 控制UI进入加载状态
    isLoading.value = true;
    uni.showLoading({ title: '登录中...' });

    try {
        // 3.【关键】调用 Store 的 login 方法，并等待其结果
        const loginSuccess = await userStore.login({
            email: email.value,
            password: password.value
        });
    
        // 4. 根据 Store 返回的结果，在页面上做出决策
        if (loginSuccess) {
            uni.hideLoading(); // 先隐藏加载提示
            uni.showToast({ title: '登录成功', icon: 'success' });
            
            // 延迟一点再跳转，给用户看清提示的时间
            setTimeout(() => {
                uni.switchTab({
                    url: '/pages/index/index'
                });
            }, 800);

        } else {
            // 如果失败，store 内部已经弹了 Toast 提示
            // 页面只需恢复UI状态即可
            uni.hideLoading();
        }
    } finally {
        // 5. 无论成功失败，最后都要恢复按钮的可点击状态
        isLoading.value = false;
    }
};
// ▲▲▲【核心重构代码】▲▲▲

const goToRegister = () => {
	uni.navigateTo({
		url: '/pages/register/register'
	});
};
</script>

<style scoped>
/* 样式与注册页保持一致 */
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100vw;
	height: 100vh;
	background-color: #f5f5f5;
}
.form-wrapper {
	width: 85%;
	padding: 40rpx;
	background-color: #ffffff;
	border-radius: 20rpx;
	box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);
}
.title {
	font-size: 48rpx;
	font-weight: bold;
	text-align: center;
	margin-bottom: 60rpx;
}
.input-item {
	width: 100%;
	height: 90rpx;
	margin-bottom: 30rpx;
	padding: 0 30rpx;
	border: 1px solid #e0e0e0;
	border-radius: 10rpx;
	box-sizing: border-box;
}
.action-btn {
	width: 100%;
	height: 90rpx;
	line-height: 90rpx;
	margin-top: 40rpx;
	background-color: #007aff;
	color: white;
	border-radius: 10rpx;
	font-size: 32rpx;
}
.link {
	margin-top: 40rpx;
	text-align: center;
	color: #007aff;
	font-size: 28rpx;
}
</style>