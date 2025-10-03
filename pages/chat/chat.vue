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
import { ref , onMounted } from 'vue';
// 【修正】从 @dcloudio/uni-app 导入所有生命周期钩子
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/stores/chatStore.js';

// --- 页面局部状态 ---
const companionId = ref(null);
const companionName = ref('');
const companionAvatar = ref('');
const userAvatar = ref('/static/images/user-avatar.png');
const inputValue = ref('');

// --- Pinia Store ---
const chatStore = useChatStore();
const { messages, isSending, scrollTop } = storeToRefs(chatStore);

// --- 动态高度 ---
const statusBarHeight = ref(0);
const navBarHeight = ref(0);
const inputBarHeight = ref(50);

// 【修正】将所有工具函数定义前置
const calculateHeights = () => {
	const systemInfo = uni.getSystemInfoSync();
	statusBarHeight.value = systemInfo.statusBarHeight;
	// #ifndef MP-WEIXIN
	navBarHeight.value = systemInfo.statusBarHeight + 44;
	// #endif
	// #ifdef MP-WEIXIN
	const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
	navBarHeight.value = menuButtonInfo.bottom + menuButtonInfo.top - systemInfo.statusBarHeight;
	// #endif
};

const calculateInputBarHeight = () => {
    uni.createSelectorQuery().select('#input-bar-container').boundingClientRect(data => {
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

// --- 生命周期 ---
// 【修正】将生命周期钩子放在函数定义之后
onLoad((options) => {
	if (!options.id) {
		uni.showToast({ title: '参数错误', icon: 'none', duration: 2000, success: () => setTimeout(() => uni.navigateBack(), 2000) });
		return;
	}
	companionId.value = options.id;
	// 【修正】补全下面这行代码
	companionName.value = options.name || '聊天';
	companionAvatar.value = options.avatar || '/static/images/default-avatar.png';

	calculateHeights(); 
	chatStore.initializeChat(options.id);
});
</script>

<style>
/* 样式无需改动 */
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

/* --- 补全的输入框样式 --- */
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
/* --- 样式补全结束 --- */

.cursor { display: inline-block; width: 14rpx; height: 36rpx; background-color: #333; animation: blink 1s infinite; vertical-align: text-bottom; margin-left: 5rpx; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.time-stamp { text-align: center; margin: 20rpx auto; padding: 8rpx 20rpx; background-color: rgba(0, 0, 0, 0.1); color: #fff; font-size: 24rpx; border-radius: 8rpx; display: inline-block; left: 50%; transform: translateX(-50%); position: relative; }
</style>