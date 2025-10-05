<template>
	<view>
		<view class="global-bg"></view>

		<view class="header-container">
			<view class="header-content"> 
				<view class="placeholder-left"></view> <text class="app-title">Sona</text>
				<view class="top-menu-button" @click="toggleMenu">
					<image class="menu-icon" src="/static/add-companion-icon.png"></image>
				</view>
			</view>
		</view>

		<view class="popup-menu" :class="{ show: isMenuShow }">
			<view class="menu-item" @click="goToAddCompanion">
				<image class="menu-item-icon" src="/static/add-companion-icon.png"></image>
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
				    <view
				        class="contact-item"
				        @click="goToChat(item)"  hover-class="none"
				    >
				        <image class="avatar" mode="aspectFill" :src="item.src || '/static/default-avatar.png'" />
				        <view class="info">
				            <text class="name">{{ item.name }}</text>
				            <text class="description">{{ item.description }}</text>
				        </view>
				    </view>
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
// 使用 storeToRefs 来保持 companionList 和 isLoading 的响应性
const { companionList, isLoading } = storeToRefs(companionStore);
const isMenuShow = ref(false); // 菜单的显示状态是页面局部状态，保留在页面内

// 【新增状态锁】用于防止用户快速重复点击列表项
const isNavigating = ref(false);

// --- 生命周期钩子 ---
onShow(() => {
	// 每次页面显示时，调用 action 来获取最新数据
	companionStore.fetchCompanions();
});

onPullDownRefresh(async () => {
	// 下拉刷新时也调用 action
	await companionStore.fetchCompanions();
	uni.stopPullDownRefresh();
});

// --- 方法 ---

// 1. 切换右上角菜单显示状态
const toggleMenu = () => {
	isMenuShow.value = !isMenuShow.value;
};

// 2. 导航到添加伙伴页面
const goToAddCompanion = () => {
	isMenuShow.value = false;
	uni.navigateTo({
		url: '/pages/companion-form/companion-form'
	});
};

// 3. 【核心方法】跳转到聊天页，并实现导航锁
const goToChat = (item) => {
    // 1. 检查导航锁：如果正在跳转，则直接退出，防止重复点击导致的 'locked' 错误
    if (isNavigating.value) {
        console.warn("导航被锁定，阻止重复跳转。");
        return;
    }
    
    // 2. 启动导航锁
    isNavigating.value = true;
    
    // 3. 构建 URL
    const url = `/pages/chat/chat?id=${item.id}&name=${item.name}&avatar=${item.src || '/static/default-avatar.png'}`;
    
    // 4. 执行 uni.navigateTo
    uni.navigateTo({
        url: url,
        // 5. 导航完成后，无论成功或失败，都在延迟后解除锁定
        complete: () => {
            // 延迟 300ms，确保 uni-app 的路由栈稳定后再解除锁定
            setTimeout(() => {
                isNavigating.value = false;
            }, 300); 
        }
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

/* 1. 修改 header-container: 确保它固定在顶部并处理安全区 */
/* 1. 确保 header-container 的 padding 足够，但不要太高 */
.header-container {
	/* ... 保持 position: fixed 等属性 ... */
	padding-top: calc(env(safe-area-inset-top) + 60rpx); /* ⬅️ 顶部填充 */
	padding-bottom: 30rpx;
	padding-left: 30rpx;
	padding-right: 30rpx;
	box-sizing: border-box;
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	z-index: 100;
	display: block; 
}

/* 2. 定义 header-content 的高度，并启用 Flexbox 垂直居中 */
.header-content {
	display: flex;
	justify-content: space-between; 
	align-items: center; 
	height: 70rpx; /* ⬅️ 关键：定义一个适中的高度来容纳标题和按钮 */
	width: 100%;
}

/* 3. 精简 top-menu-button 样式，移除所有定位属性 */
.top-menu-button {
	width: 60rpx; /* ⬅️ 按钮的点击区域 */
	height: 60rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-shrink: 0;
	/* 关键：移除 position 和 top/left 属性 */
	/* 移除 .top-action-button 的样式块，因为它已被内联或移除 */
}

/* 4. 确保菜单图标本身尺寸正确 */
.menu-icon {
	width: 40rpx; /* ⬅️ 图标的实际尺寸 */
	height: 40rpx;
}

/* 5. 确保占位符尺寸与按钮一致 */
.placeholder-left {
	width: 60rpx; 
	height: 60rpx;
}

/* 6. 调整标题的居中和 flex 属性 */
.app-title {
	font-size: 40rpx;
	font-weight: 600;
	color: #111;
	flex-grow: 1; 
	text-align: center; 
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
	padding-top: calc(env(safe-area-inset-top) + 160rpx);
	width: 100%;
	box-sizing: border-box;
}

.contact-item {
	width: calc(100% - 60rpx);
	margin: 0 auto 6rpx auto;
	display: flex;
	align-items: center;
	padding: 20rpx 30rpx;
	background-color: rgba(255, 255, 255, 0.6);
	backdrop-filter: blur(15px);
	border-radius: 24rpx;
	border: 1rpx solid rgba(255, 255, 255, 0.8);
	box-shadow: 0px 15rpx 50rpx rgba(60, 60, 100, 0.2);
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