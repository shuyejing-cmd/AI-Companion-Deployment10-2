<template>
    <view class="container">
        <view class="form-group">
            <uni-easyinput v-model="nickname" placeholder="请输入昵称" />
        </view>
        <view class="form-group">
            <uni-easyinput v-model="email" placeholder="请输入邮箱" />
        </view>
        <view class="form-group">
            <uni-easyinput v-model="password" type="password" placeholder="请输入密码" />
        </view>
        <view class="form-group">
            <uni-easyinput v-model="confirmPassword" type="password" placeholder="请确认密码" />
        </view>
        <button @click="handleRegister" class="submit-btn">注册</button>
    </view>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user.js';

const userStore = useUserStore();

const nickname = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');

const handleRegister = async () => {
    if (!nickname.value || !email.value || !password.value) {
        uni.showToast({ title: '昵称、邮箱和密码不能为空', icon: 'none' });
        return;
    }
    if (password.value !== confirmPassword.value) {
        uni.showToast({ title: '两次输入的密码不一致', icon: 'none' });
        return;
    }
    try {
        await userStore.register({
            nickname: nickname.value,
            email: email.value,
            password: password.value
        });
        // 注册成功后的提示和跳转已在 store action 中处理
    } catch (error) {
        console.log('Register page caught an error.');
    }
};
</script>

<style>
.container {
    padding: 40rpx;
}
.form-group {
    margin-bottom: 30rpx;
}
.submit-btn {
    background-color: #007aff;
    color: white;
}
</style>