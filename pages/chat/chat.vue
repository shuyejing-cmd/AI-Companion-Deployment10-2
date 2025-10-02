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
			<view class="message-list" id="message-list">
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
					@confirm="sendMessage"
					:disabled="isSending"
					:adjust-position="false"
					cursor-spacing="20"
				/>
				<button class="send-button" @click="sendMessage" :disabled="isSending || !inputValue.trim()">发送</button>
			</view>
		</view>
	</view>
</template>

<script>
import * as chatApi from '../../api/chat.js';
import * as companionApi from '../../api/companion.js';
import { getToken } from '../../utils/auth.js'; // 使用我们封装的Token工具

// 不再需要在顶层调用 getApp()
// const app = getApp(); 

export default {
	data() {
		return {
			companionId: null,
			companionAvatar: '',
			companionName: '',
			userAvatar: '/static/images/user-avatar.png', 
			messages: [],
			inputValue: '',
			isSending: false,
			socketOpen: false,
			socketTask: null,
			scrollTop: 99999, // 初始滚动到底部
			
			// 动态计算的高度
			statusBarHeight: 0,
			navBarHeight: 0,
			inputBarHeight: 50, // 输入框初始高度
		};
	},
	onLoad(options) {
		// --- 页面初始化 ---
		if (!options.id) {
			uni.showToast({ title: '参数错误', icon: 'none', duration: 2000, success: () => setTimeout(() => uni.navigateBack(), 2000) });
			return;
		}
		this.companionId = options.id;
		this.companionName = options.name || '聊天';
		this.companionAvatar = options.avatar || '/static/images/default-avatar.png';
		
		this.calculateHeights(); // 计算导航栏等高度
		this.loadHistoryMessages(); // 加载历史消息
		this.connectWebSocket(); // 连接WebSocket
	},
	onReady() {
		// 在 onReady 中获取输入框高度，更准确
		this.calculateInputBarHeight();
	},
	onUnload() {
		// 离开页面时关闭 WebSocket 连接
		this.closeWebSocket();
		// 移除事件监听，防止内存泄漏
		const app = getApp();
		if (app && app.event) {
			app.event.off('companionUpdated', this.handleCompanionUpdate);
		}
	},
	methods: {
		// 动态计算各种高度，适配不同机型
		calculateHeights() {
			const systemInfo = uni.getSystemInfoSync();
			this.statusBarHeight = systemInfo.statusBarHeight;
			// #ifdef MP-WEIXIN
			const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
			this.navBarHeight = menuButtonInfo.bottom + menuButtonInfo.top - systemInfo.statusBarHeight;
			// #endif
			// #ifndef MP-WEIXIN
			this.navBarHeight = systemInfo.statusBarHeight + 44;
			// #endif
		},
		calculateInputBarHeight() {
			const query = uni.createSelectorQuery().in(this);
			query.select('#input-bar-container').boundingClientRect(data => {
				if (data) {
					this.inputBarHeight = data.height;
				}
			}).exec();
		},
		
		// --- 数据加载 ---
		async loadHistoryMessages() {
			uni.showLoading({ title: '加载记录中...' });
			try {
				const history = await chatApi.getMessages(this.companionId);
				this.messages = this.processMessages(history);
			} catch (err) {
				console.error("加载历史消息失败", err);
				uni.showToast({ title: '加载历史失败', icon: 'none' });
			} finally {
				uni.hideLoading();
				this.$nextTick(() => this.scrollToBottom());
			}
		},
		
		// --- WebSocket 核心逻辑 ---
		connectWebSocket() {
			const token = getToken();
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' });
				return;
			}
			
			// 请确保您的 config.js 中有 baseUrl
			// import { baseUrl } from '../../config.js'; 
			const wsUrl = `ws://120.53.230.215:8000/api/v1/chat/ws/${this.companionId}?token=${encodeURIComponent(token)}`;

			this.socketTask = uni.connectSocket({
				url: wsUrl,
				success: () => {}, // success回调在H5平台无用
				fail: (err) => {
					console.error("WebSocket 连接失败", err);
					uni.showToast({title: '连接聊天服务器失败', icon: 'none'});
				}
			});
			this.onWebSocketEvents();
		},
		onWebSocketEvents() {
			this.socketTask.onOpen(() => {
				console.log("WebSocket 连接成功");
				this.socketOpen = true;
			});
			this.socketTask.onClose(() => {
				console.log("WebSocket 连接关闭");
				this.socketOpen = false;
				this.isSending = false;
			});
			this.socketTask.onError((err) => {
				console.error("WebSocket 连接出错", err);
				this.socketOpen = false;
				this.isSending = false;
				uni.showToast({ title: '连接已断开', icon: 'none' });
			});
			this.socketTask.onMessage((res) => {
				const receivedText = res.data;
				if (receivedText === '[END_OF_STREAM]') {
					this.isSending = false;
					const lastMsg = this.messages[this.messages.length - 1];
					if (lastMsg && lastMsg.role === 'ai') {
						lastMsg.done = true;
					}
					return;
				}
				if (receivedText.startsWith('[ERROR]')) {
					uni.showToast({ title: 'AI 思考时出错了', icon: 'none' });
					this.isSending = false;
					return;
				}

				const lastMsg = this.messages[this.messages.length - 1];
				if (lastMsg && lastMsg.role === 'ai' && !lastMsg.done) {
					lastMsg.content += receivedText;
				} else {
					const newAiMessage = { role: 'ai', content: receivedText, done: false, created_at: new Date().toISOString() };
					this.messages = this.processMessages([newAiMessage], this.messages);
				}
				this.$nextTick(() => this.scrollToBottom());
			});
		},
		closeWebSocket() {
			if (this.socketTask) {
				this.socketTask.close();
			}
		},

		// --- 用户交互 ---
		sendMessage() {
			const content = this.inputValue.trim();
			if (!content || this.isSending || !this.socketOpen) return;

			const userMessage = { role: 'user', content, created_at: new Date().toISOString() };
			this.messages = this.processMessages([userMessage], this.messages);
			
			this.socketTask.send({ data: content });
			
			this.inputValue = '';
			this.isSending = true;
			this.$nextTick(() => this.scrollToBottom());
		},
		
		// --- 导航 ---
		navigateBack() {
			uni.navigateBack();
		},
		navigateToSettings() {
					// 修正跳转目标为“个性化设置”菜单页，并传递必要的参数
					uni.navigateTo({
						url: `/pages/knowledge-base/knowledge-base?id=${this.companionId}&name=${this.companionName}`
					});
		},
		
		// --- 工具函数 ---
		scrollToBottom() {
			this.$nextTick(() => {
				uni.createSelectorQuery().in(this).select('#message-list').boundingClientRect(rect => {
					if (rect) { this.scrollTop = rect.height; }
				}).exec();
			});
		},
		processMessages(newMessages, existingMessages = []) {
			// ... 此处逻辑与您原代码一致，无需修改 ...
			let lastTimestamp = existingMessages.length > 0 ? new Date(existingMessages[existingMessages.length - 1].created_at).getTime() : 0;
			const tenMinutes = 10 * 60 * 1000;
			newMessages.forEach(msg => {
				msg._id = msg.id || msg.role + '_' + Date.now() + Math.random();
				const currentTimestamp = new Date(msg.created_at).getTime();
				if (currentTimestamp - lastTimestamp > tenMinutes) {
					msg.displayTime = this.formatDisplayTime(currentTimestamp);
				} else {
					msg.displayTime = null;
				}
				lastTimestamp = currentTimestamp;
				msg.done = msg.done === undefined ? true : msg.done;
			});
			return [...existingMessages, ...newMessages];
		},
		formatDisplayTime(timestamp) {
			// ... 此处逻辑与您原代码一致，无需修改 ...
			const date = new Date(timestamp);
			const month = date.getMonth() + 1;
			const day = date.getDate();
			const hour = ('0' + date.getHours()).slice(-2);
			const minute = ('0' + date.getMinutes()).slice(-2);
			return `${month}月${day}日 ${hour}:${minute}`;
		},
	}
};
</script>

<style>
/* 您的样式大部分都很好，我做了一些微调和补全 */
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