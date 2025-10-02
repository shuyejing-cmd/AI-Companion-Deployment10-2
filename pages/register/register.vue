<template>
	<view class="container">
		<view class="form-wrapper">
			<view class="title">创建新账户</view>
			
			<input class="input-item" type="text" v-model="registerForm.email" placeholder="请输入邮箱" />
			<input class="input-item" type="text" v-model="registerForm.nickname" placeholder="请输入昵称" />
			<input class="input-item" type="password" v-model="registerForm.password" placeholder="请输入密码" />
			
			<button class="action-btn" @click="handleRegister">注册</button>
			
			<view class="link" @click="goToLogin">已有账户？立即登录</view>
		</view>
	</view>
</template>

<script>
import { register } from '../../api/auth.js';

export default {
	data() {
		return {
			registerForm: {
				email: '',
				nickname: '',
				password: ''
			}
		};
	},
	methods: {
		handleRegister() {
			// 简单的非空校验
			if (!this.registerForm.email || !this.registerForm.password) {
				uni.showToast({ title: '邮箱和密码不能为空', icon: 'none' });
				return;
			}
			
			uni.showLoading({ title: '注册中...' });
			
			register(this.registerForm)
				.then(response => {
					uni.hideLoading();
					uni.showToast({
						title: '注册成功！',
						icon: 'success'
					});
					
					// 注册成功后，延时一会跳转到登录页
					setTimeout(() => {
						this.goToLogin();
					}, 1500);
				})
				.catch(error => {
					uni.hideLoading();
					console.error("注册失败: ", error);
                    // 从后端返回的错误信息中取 detail 字段
					const errorMsg = error.data?.detail || '注册失败，请稍后再试';
					uni.showToast({
						title: errorMsg,
						icon: 'none'
					});
				});
		},
		goToLogin() {
			uni.navigateTo({
				url: '/pages/login/login'
			});
		}
	}
};
</script>

<style scoped>
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