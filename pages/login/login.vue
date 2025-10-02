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

<script>
import { login } from '../../api/auth.js';
import { setToken } from '../../utils/auth.js';

export default {
	data() {
		return {
			loginForm: {
				email: '',
				password: ''
			}
		};
	},
	methods: {
		handleLogin() {
			if (!this.loginForm.email || !this.loginForm.password) {
				uni.showToast({ title: '邮箱和密码不能为空', icon: 'none' });
				return;
			}
			
			uni.showLoading({ title: '登录中...' });
			
			login(this.loginForm)
				.then(response => {
					const token = response.access_token;
					
					if (token) {
						setToken(token);
						uni.showToast({
							title: '登录成功！',
							icon: 'success'
						});
						
						setTimeout(() => {
							uni.switchTab({
								url: '/pages/index/index' // 请确保这是您的主页路径
							});
						}, 1500);
						
					} else {
						// 如果后端成功返回但没有token，作为一种异常情况处理
						throw new Error('未能从服务器获取Token');
					}
				})
				.catch(error => {
					console.error("登录失败: ", error);
                    // 统一从 error.data 中获取后端返回的错误信息
                    const errorMsg = error.data?.detail || '登录失败，请检查您的凭证';
					uni.showToast({
						title: errorMsg,
						icon: 'none'
					});
				})
				.finally(() => {
					// 【重要】无论成功还是失败，最后都确保关闭加载提示
					uni.hideLoading();
				});
		},
		goToRegister() {
			uni.navigateTo({
				url: '/pages/register/register'
			});
		}
	}
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