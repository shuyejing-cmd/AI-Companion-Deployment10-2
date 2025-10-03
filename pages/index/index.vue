<template>
	<view>
		<view class="global-bg"></view>

		<view class="header-container">
			<text class="app-title">Sona</text>
			<view class="top-menu-button" @click="toggleMenu">
				<image class="menu-icon" src="/static/images/add-companion-icon.png"></image>
			</view>
		</view>

		<view class="popup-menu" :class="{ show: isMenuShow }">
			<view class="menu-item" @click="goToAddCompanion">
				<image class="menu-item-icon" src="/static/images/add-companion-icon.png"></image>
				<text class="menu-item-text">添加AI伙伴</text>
			</view>
		</view>

		<view v-if="isMenuShow" class="menu-overlay" @click="toggleMenu"></view>

		<view class="container">
			<view v-if="isLoading" class="loading-container">
				<text>正在加载...</text>
			</view>

			<view v-else class="contact-list">
				<block v-for="item in companionList" :key="item.id">
					<navigator
						class="contact-item"
						:url="'/pages/chat/chat?id=' + item.id + '&name=' + item.name + '&avatar=' + (item.src || '/static/images/default-avatar.png')"
						hover-class="none"
					>
						<image class="avatar" mode="aspectFill" :src="item.src || '/static/images/default-avatar.png'" />
						<view class="info">
							<text class="name">{{ item.name }}</text>
							<text class="description">{{ item.description }}</text>
						</view>
					</navigator>
				</block>
			</view>

			<view v-if="!isLoading && companionList.length === 0" class="empty-container">
				<text>你还没有创建任何 AI 伙伴，点击左上角 "+" 创建你的第一个AI伙伴吧</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useCompanionStore } from '@/stores/companionStore.js';

// --- 状态管理 ---
const companionStore = useCompanionStore();
// [重构] 使用 storeToRefs 来保持 companionList 和 isLoading 的响应性
const { companionList, isLoading } = storeToRefs(companionStore);
const isMenuShow = ref(false); // 菜单的显示状态是页面局部状态，保留在页面内

// --- 生命周期钩子 ---
onShow(() => {
	// [重构] 每次页面显示时，调用 action 来获取最新数据
	companionStore.fetchCompanions();
});

onPullDownRefresh(async () => {
	// [重构] 下拉刷新时也调用 action
	await companionStore.fetchCompanions();
	uni.stopPullDownRefresh();
});

// --- 方法 ---
const toggleMenu = () => {
	isMenuShow.value = !isMenuShow.value;
};

const goToAddCompanion = () => {
	isMenuShow.value = false;
	uni.navigateTo({
		url: '/pages/companion-form/companion-form'
	});
};
</script>

<style>
/* 样式无需改动 */
page {
	height: 100%;
}

.global-bg {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: linear-gradient(120deg, #fde4ea 0%, #a6c0fe 100%);
	z-index: -1;
}

.header-container {
	background-color: transparent;
	padding-top: calc(env(safe-area-inset-top) + 100rpx);
	padding-right: 30rpx;
	padding-bottom: 30rpx;
	padding-left: 30rpx;
	border-bottom: none;
	box-sizing: border-box;
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	z-index: 100;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
}

.app-title {
	font-size: 38rpx;
	font-weight: 600;
	color: #111;
	margin-left: 0;
}

.top-menu-button,
.top-action-button {
	position: fixed;
	top: calc(env(safe-area-inset-top) + 100rpx);
	width: 60rpx;
	height: 60rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 101;
}

.top-menu-button {
	left: 30rpx;
}

.top-action-button {
	right: 30rpx;
}

.menu-icon {
	width: 40rpx;
	height: 40rpx;
}

.popup-menu {
	position: fixed;
	top: calc(env(safe-area-inset-top) + 20rpx + 60rpx + 10rpx);
	left: 30rpx;
	background-color: rgba(255, 255, 255, 0.95);
	backdrop-filter: blur(10px);
	border-radius: 16rpx;
	box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.15);
	padding: 10rpx 0;
	min-width: 250rpx;
	transform: translateX(-120%);
	transition: transform 0.3s ease-out;
	z-index: 102;
	overflow: hidden;
}

.popup-menu.show {
	transform: translateX(0);
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 20rpx 30rpx;
	color: #333;
	font-size: 30rpx;
	transition: background-color 0.2s;
}

.menu-item:active {
	background-color: #f0f0f0;
}

.menu-item-icon {
	width: 36rpx;
	height: 36rpx;
	margin-right: 20rpx;
}

.menu-item-text {
	flex-grow: 1;
}

.menu-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background-color: rgba(0, 0, 0, 0.3);
	z-index: 101;
}

.container {
	padding-top: 0;
}

.contact-list {
	padding-top: calc(env(safe-area-inset-top) + 100rpx + 60rpx);
	width: 100%;
	box-sizing: border-box;
}

.contact-item {
	width: calc(100% - 60rpx);
	margin: 0 auto 20rpx auto;
	display: flex;
	align-items: center;
	padding: 20rpx 30rpx;
	background-color: rgba(255, 255, 255, 0.6);
	backdrop-filter: blur(15px);
	border-radius: 24rpx;
	border: 1rpx solid rgba(255, 255, 255, 0.8);
	box-shadow: 0px 8px 25px rgba(180, 180, 220, 0.15);
	transition: all 0.2s ease-in-out;
}

.contact-item:last-child {
	border-bottom: none;
}

.contact-item:active {
	transform: scale(0.98);
	box-shadow: 0px 4px 15px rgba(180, 180, 220, 0.2);
}

.avatar {
	width: 100rpx;
	height: 100rpx;
	border-radius: 18rpx;
	margin-right: 25rpx;
	flex-shrink: 0;
}

.info {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	overflow: hidden;
}

.name {
	font-size: 34rpx;
	color: #2c2c2c;
	font-weight: 500;
	margin-bottom: 8rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.description {
	font-size: 26rpx;
	color: #777;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.loading-container,
.empty-container {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 80vh;
	color: #999;
}

.empty-container {
	padding-top: calc(env(safe-area-inset-top) + 100rpx);
}

.empty-container text {
	white-space: pre-line;
	text-align: center;
	line-height: 1.6;
}
</style>