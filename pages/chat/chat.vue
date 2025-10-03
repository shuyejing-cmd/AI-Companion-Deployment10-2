<template>
	<view class="chat-page">
		<view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="nav-bar-content">
				<view class="back-button" @click="navigateBack">
					<image class="back-icon" src="/static/images/back-arrow-icon.png" />
				</view>
				<view class="title-container" @click="navigateToSettings">
					<text class="nav-bar-title">{{ companionName }}</text>
					<image class="settings-entry-icon" src="/static/images/right-arrow-icon.png" />
				</view>
			</view>
		</view>

		<view class="global-bg"></view>

		<scroll-view
			class="chat-container"
			:style="{ paddingTop: navBarHeight + 'px', paddingBottom: inputBarHeight + 'px' }"
			:scroll-y="true"
			:scroll-top="scrollTop"
			:scroll-with-animation="true"
		>
			<view class="message-list">
				<block v-for="item in messages" :key="item._id">
					<view v-if="item.displayTime" class="time-stamp">{{ item.displayTime }}</view>
					<view class="message-item" :class="item.role === 'user' ? 'user-message' : 'ai-message'">
						<image v-if="item.role === 'ai'" class="avatar" :src="companionAvatar" />
						<image v-if="item.role === 'user'" class="avatar" :src="userAvatar" />
						<view class="message-content">
							<text :selectable="true">{{ item.content }}</text>
							<view v-if="item.role === 'ai' && !item.done" class="cursor"></view>
						</view>
					</view>
				</block>
			</view>
		</scroll-view>

		<view class="input-bar-container" id="input-bar-container">
			<view class="input-bar">
				<input
				    class="input-field"
				    v-model="inputValue"
				    placeholder="说点什么吧..."
				    confirm-type="send"
				    @confirm="handleSend"
				    :disabled="isSending"
				    :adjust-position="false"
				    cursor-spacing="20"
				/>
				<button class="send-button" @click="handleSend" :disabled="isSending || !inputValue.trim()">发送</button>
			</view>
		</view>
	</view>
</template>

<script setup>
// 【新增】导入 watch 和 nextTick
import { ref, watch, nextTick } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/stores/chatStore.js';

// --- 页面局部状态 ---
const companionId = ref(null);
const companionName = ref('');
const companionAvatar = ref('');
const userAvatar = ref('/static/images/user-avatar.png');
const inputValue = ref('');
// 【新】scrollTop 作为页面的本地 UI 状态
const scrollTop = ref(0);

// --- Pinia Store ---
const chatStore = useChatStore();
// 【修正】不再从 store 中解构 scrollTop
const { messages, isSending } = storeToRefs(chatStore);

// --- 动态高度 ---
const statusBarHeight = ref(0);
const navBarHeight = ref(0);
const inputBarHeight = ref(50); // 默认值

// --- 方法定义 ---
const calculateHeights = () => {
	const systemInfo = uni.getSystemInfoSync();
	statusBarHeight.value = systemInfo.statusBarHeight;
	// H5/App 等平台的导航栏高度
	// #ifndef MP-WEIXIN
	navBarHeight.value = systemInfo.statusBarHeight + 44;
	// #endif
	// 微信小程序的导航栏高度
	// #ifdef MP-WEIXIN
	const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
	navBarHeight.value = menuButtonInfo.bottom + menuButtonInfo.top - systemInfo.statusBarHeight;
	// #endif
	
	// 动态计算输入框高度，以适配不同设备的底部安全区域
    uni.createSelectorQuery().in(this).select('#input-bar-container').boundingClientRect(data => {
        if (data) {
            inputBarHeight.value = data.height;
        }
    }).exec();
};

const handleSend = () => {
    const content = inputValue.value.trim();
    if (content) {
        chatStore.sendMessage(content);
        inputValue.value = '';
    }
};

const navigateBack = () => {
	uni.navigateBack();
};

const navigateToSettings = () => {
	uni.navigateTo({
		url: `/pages/knowledge-base/knowledge-base?id=${companionId.value}&name=${companionName.value}`
	});
};

// 【新】滚动到底部的逻辑，作为页面的一个方法
const scrollToBottom = () => {
    // nextTick 确保在 DOM 渲染完成后再执行滚动操作
    nextTick(() => {
        // 通过增加一个大数值来确保滚动条能到达底部
        scrollTop.value += 99999;
    });
};

// --- 侦听器 ---
// 【关键】使用 watch 侦听消息列表的变化, 自动滚动到底部
watch(messages, (newMessages, oldMessages) => {
    // 当新消息数组长度大于或等于旧消息数组时（即有新消息加入），执行滚动
    if (newMessages.length >= oldMessages.length) {
        scrollToBottom();
    }
}, { deep: true }); // deep: true 深度侦听，确保能监听到数组内部元素的变更


// --- 生命周期钩子 ---
onLoad((options) => {
	if (!options.id) {
		uni.showToast({ title: '参数错误', icon: 'none', duration: 2000, success: () => setTimeout(() => uni.navigateBack(), 2000) });
		return;
	}
	companionId.value = options.id;
	companionName.value = options.name || '聊天';
	companionAvatar.value = options.avatar || '/static/images/default-avatar.png';

	calculateHeights();
	chatStore.initializeChat(options.id);
});

// 阶段一已添加：确保页面卸载时关闭 WebSocket 连接
onUnload(() => {
    console.log('Chat page unloaded, closing WebSocket.');
    chatStore.closeChat();
});
</script>

<style>
/* 样式与之前保持一致，无需改动 */
page, .chat-page {
	height: 100%;
	display: flex;
	flex-direction: column;
}
.global-bg {
	position: fixed; top: 0; left: 0; width: 100%; height: 100%;
	background: linear-gradient(120deg, #fde4ea 0%, #a6c0fe 100%);
	z-index: -1;
}
.custom-nav-bar {
	position: fixed; top: 0; left: 0; width: 100%;
	background-color: rgba(255,255,255,0.8);
	backdrop-filter: blur(10px);
	z-index: 100;
	border-bottom: 1rpx solid #e0e0e0;
}
.nav-bar-content {
	position: relative; display: flex; align-items: center; justify-content: center; height: 44px;
}
.back-button {
	position: absolute; left: 20rpx; top: 50%; transform: translateY(-50%); padding: 10rpx;
}
.back-icon { width: 36rpx; height: 36rpx; }
.title-container { display: flex; align-items: center; padding: 10rpx 20rpx; border-radius: 16rpx; transition: background-color 0.2s; }
.title-container:active { background-color: rgba(0, 0, 0, 0.1); }
.nav-bar-title { font-size: 34rpx; font-weight: 600; color: #333; }
.settings-entry-icon { width: 28rpx; height: 28rpx; margin-left: 10rpx; opacity: 0.5; }
.chat-container {
	width: 100%;
	flex: 1;
	box-sizing: border-box;
}
.message-list { padding: 20rpx; }
.message-item { display: flex; margin-bottom: 30rpx; }
.avatar { width: 80rpx; height: 80rpx; border-radius: 10rpx; flex-shrink: 0; }
.message-content {
	padding: 22rpx 26rpx; border-radius: 20rpx; max-width: 65%;
	word-break: break-all; position: relative; font-size: 32rpx;
	line-height: 1.5; box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.05);
}
.ai-message .avatar { margin-right: 20rpx; }
.ai-message .message-content { background-color: #ffffff; color: #333; }
.user-message { flex-direction: row-reverse; }
.user-message .avatar { margin-left: 20rpx; }
.user-message .message-content { background-color: #88d46a; color: #fff; }

.input-bar-container {
	position: fixed; bottom: 0; left: 0; right: 0; width: 100%;
	background-color: #f7f7f7; border-top: 1rpx solid #e0e0e0;
	padding-bottom: constant(safe-area-inset-bottom);
	padding-bottom: env(safe-area-inset-bottom);
	z-index: 100;
}
.input-bar {
	display: flex; align-items: center; padding: 16rpx 20rpx;
}
.input-field {
	flex: 1; height: 76rpx; background-color: #fff; border-radius: 10rpx;
	padding: 0 20rpx; font-size: 32rpx; box-sizing: border-box;
}
.send-button {
	width: 120rpx; height: 76rpx; padding: 0; font-size: 30rpx;
	line-height: 76rpx; margin-left: 20rpx; background-color: #f0f0f0;
	color: #b2b2b2;
}
.send-button:not([disabled]) { background-color: #07c160; color: #fff; }

.cursor { display: inline-block; width: 14rpx; height: 36rpx; background-color: #333; animation: blink 1s infinite; vertical-align: text-bottom; margin-left: 5rpx; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.time-stamp { text-align: center; margin: 20rpx auto; padding: 8rpx 20rpx; background-color: rgba(0, 0, 0, 0.1); color: #fff; font-size: 24rpx; border-radius: 8rpx; display: inline-block; left: 50%; transform: translateX(-50%); position: relative; }
</style>