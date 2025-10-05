<template>
	<view class="chat-page">
		<view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="nav-bar-content">
				<view class="back-button" @click="navigateBack">
					<image class="back-icon" src="/static/back-arrow-icon.png" />
				</view>
				<view class="title-container" @click="navigateToSettings">
					<text class="nav-bar-title">{{ companionName }}</text>
					<image class="settings-entry-icon" src="/static/right-arrow-icon.png" />
				</view>
			</view>
		</view>

		<view class="global-bg"></view>

		<scroll-view
			class="chat-container"
			    :style="{ 
			        paddingTop: navBarHeight + 'px', 
			        paddingBottom: (inputBarHeight + keyboardHeight) + 'px'  }"
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
					@focus="handleFocus"  @blur="handleBlur"
				/>
				<button class="send-button" @click="handleSend" :disabled="isSending || !inputValue.trim()">发送</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, watch, nextTick, getCurrentInstance } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/stores/chatStore.js';

// --- 页面局部状态 ---
const companionId = ref(null);
const companionName = ref('');
const companionAvatar = ref('');
const userAvatar = ref('/static/images/user-avatar.png');
const inputValue = ref('');
const scrollTop = ref(0); // 滚动条位置，用于滚动到底部

// --- Pinia Store ---
const chatStore = useChatStore();
const { messages, isSending } = storeToRefs(chatStore);

// --- 动态高度（用于 UI 布局的计算） ---
const statusBarHeight = ref(0);
const navBarHeight = ref(0);
const inputBarHeight = ref(50); // 输入栏容器的最终高度（包含底部安全区）
const keyboardHeight = ref(0); // 【关键】动态获取的键盘高度 (px)

// --- 方法定义 ---

// 1. 高度计算 (在 onLoad 后执行)
const calculateHeights = () => {
    const systemInfo = uni.getSystemInfoSync();
    statusBarHeight.value = systemInfo.statusBarHeight;
    
    // 兼容不同平台的导航栏高度计算
    // #ifndef MP-WEIXIN
    // H5/App 等平台：状态栏 + 44px
    navBarHeight.value = systemInfo.statusBarHeight + 44;
    // #endif
    
    // #ifdef MP-WEIXIN
    // 微信小程序：胶囊按钮底部 - 状态栏高度 + 胶囊按钮顶部 (近似值)
    const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
    navBarHeight.value = menuButtonInfo.bottom + menuButtonInfo.top - systemInfo.statusBarHeight;
    // #endif
    
    // 【优化】动态计算输入框高度，确保 inputBarHeight 包含底部安全区域
    // 移除 in(this) 避免 H5 兼容性问题，仅在 onLoad 确保 DOM 已渲染后调用。
    uni.createSelectorQuery().select('#input-bar-container').boundingClientRect(data => {
        if (data && data.height) {
            // data.height 是包含 safe-area-inset-bottom 的最终高度
            inputBarHeight.value = data.height; 
        }
    }).exec();
};

// 2. 消息发送
const handleSend = () => {
    const content = inputValue.value.trim();
    if (content) {
        chatStore.sendMessage(content);
        inputValue.value = '';
    }
};

// 3. 导航操作
const navigateBack = () => {
	uni.navigateBack();
};

const navigateToSettings = () => {
	uni.navigateTo({
		url: `/pages/knowledge-base/knowledge-base?id=${companionId.value}&name=${companionName.value}`
	});
};

// 4. 【核心】键盘与滚动处理

// 处理输入框聚焦：获取键盘高度并调整滚动
const handleFocus = (e) => {
    if (e.detail && e.detail.height) {
        // uni-app 的 input:focus 得到的 height 是 px 单位
        keyboardHeight.value = e.detail.height; 
        
        // 键盘弹出后，立即滚动到底部，防止输入框被遮挡
        scrollToBottom();
    }
};

// 处理输入框失焦：键盘收起，重置高度
const handleBlur = () => {
    // 键盘收起时，重置键盘高度为 0
    keyboardHeight.value = 0;
    
    // 延迟滚动，确保键盘完全收起和 inputBarHeight 恢复正常
    setTimeout(() => {
        scrollToBottom();
    }, 100);
};

// 滚动到底部的通用方法
const scrollToBottom = () => {
    // nextTick 确保在 DOM 渲染或高度变化完成后再执行滚动操作
    nextTick(() => {
        // 通过设置一个极大的值，确保滚动条能到达内容底部
        scrollTop.value += 99999;
    });
};

// --- 侦听器 ---

// 【关键】侦听消息列表的变化, 自动滚动到底部
watch(messages, (newMessages, oldMessages) => {
    // 只有在有新消息加入时才滚动，避免非必要滚动（如初始加载）
    if (newMessages.length > oldMessages.length) {
        scrollToBottom();
    }
}, { deep: true });

// --- 生命周期钩子 ---

onLoad((options) => {
	if (!options.id) {
		uni.showToast({ title: '参数错误', icon: 'none', duration: 2000, success: () => setTimeout(() => uni.navigateBack(), 2000) });
		return;
	}
	companionId.value = options.id;
	companionName.value = options.name || '聊天';
	companionAvatar.value = options.avatar || '/static/images/default-avatar.png';

    // 确保组件加载完成后再计算高度
	calculateHeights(); 
    
    // 初始化聊天连接和历史记录
	chatStore.initializeChat(options.id);
});

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