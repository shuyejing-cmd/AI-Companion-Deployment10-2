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
import { reactive } from 'vue';
import { useUserStore } from '@/stores/user.js';

// 1. 获取 user store 实例
const userStore = useUserStore();

// 2. 创建一个响应式对象来绑定表单数据
const loginForm = reactive({
    // [已修改] 将 username 属性改为 email
    email: '',
    password: ''
});

// 3. 定义登录处理函数
const handleLogin = async () => {
    // [已修改] 检查 email 字段，并更新提示信息
    if (!loginForm.email || !loginForm.password) {
        uni.showToast({ title: '请输入邮箱和密码', icon: 'none' });
        return;
    }
    try {
        // 4. 调用 store 的 action，把所有复杂逻辑都交给他
        // 注意：请确保你的 userStore.login action 能处理包含 email 的对象
        await userStore.login(loginForm);
        // 登录成功后的跳转逻辑已在 store action 中处理
    } catch (error) {
        // 登录失败的提示已在 store action 中处理
        // 这里可以根据需要做一些额外的UI处理，比如按钮禁用状态等
        console.log('Login page caught an error.');
    }
};

// 【新增】确保跳转到注册页的函数存在
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