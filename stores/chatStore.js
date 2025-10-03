// stores/chatStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUserStore } from '@/stores/user.js';
import * as chatApi from '@/api/chat.js';

// 从环境变量读取 WebSocket URL
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL; 

export const useChatStore = defineStore('chat', () => {
    // === State ===
    const messages = ref([]);
    const companionId = ref(null);
    const socketTask = ref(null);
    const isSending = ref(false);
    // [Removed] scrollTop state is no longer managed here

    // === Actions ===

    /**
     * 初始化聊天会话
     * @param {string} id - 伙伴ID
     */
    const initializeChat = async (id) => {
        // 重置状态以准备新的聊天
        messages.value = [];
        isSending.value = false;
        if (socketTask.value) {
            socketTask.value.close();
            socketTask.value = null;
        }

        companionId.value = id;
        
        // 注意：这里不再需要手动滚动，页面会通过 watch 自动处理
        await loadHistoryMessages();
        connectWebSocket();
    };

    /**
     * 加载历史消息
     */
    const loadHistoryMessages = async () => {
        if (!companionId.value) return;
        uni.showLoading({ title: '加载记录中...' });
        try {
            const history = await chatApi.getMessages(companionId.value);
            messages.value = processMessages(history);
        } catch (err) {
            console.error("加载历史消息失败", err);
            uni.showToast({ title: '加载历史失败', icon: 'none' });
        } finally {
            uni.hideLoading();
            // [Removed] No longer calls scrollToBottom()
        }
    };

    /**
     * 连接 WebSocket
     */
    const connectWebSocket = () => {
        const userStore = useUserStore();
        const token = userStore.token;

        if (!token) {
            uni.showToast({ title: '请先登录', icon: 'none' });
            return;
        }

        const wsUrl = `${WS_BASE_URL}/api/v1/chat/ws/${companionId.value}?token=${encodeURIComponent(token)}`;
        
        socketTask.value = uni.connectSocket({
            url: wsUrl,
            success: () => {},
            fail: (err) => {
                console.error("WebSocket 连接失败", err);
                uni.showToast({title: '连接聊天服务器失败', icon: 'none'});
            }
        });
        
        socketTask.value.onOpen(() => console.log("WebSocket 连接成功"));
        socketTask.value.onClose(() => console.log("WebSocket 连接关闭"));
        socketTask.value.onError((err) => {
            console.error("WebSocket 连接出错", err);
            isSending.value = false;
            uni.showToast({ title: '连接已断开', icon: 'none' });
        });
        socketTask.value.onMessage(handleSocketMessage);
    };

    /**
     * 处理收到的 WebSocket 消息
     * @param {object} res - 消息对象
     */
    const handleSocketMessage = (res) => {
        const receivedText = res.data;
        if (receivedText === '[END_OF_STREAM]') {
            isSending.value = false;
            const lastMsg = messages.value[messages.value.length - 1];
            if (lastMsg && lastMsg.role === 'ai') {
                lastMsg.done = true;
            }
            return;
        }
        if (receivedText.startsWith('[ERROR]')) {
            uni.showToast({ title: 'AI 思考时出错了', icon: 'none' });
            isSending.value = false;
            return;
        }

        const lastMsg = messages.value[messages.value.length - 1];
        if (lastMsg && lastMsg.role === 'ai' && !lastMsg.done) {
            lastMsg.content += receivedText;
        } else {
            const newAiMessage = { role: 'ai', content: receivedText, done: false, created_at: new Date().toISOString() };
            // 使用 processMessages 来确保一致的数据结构
            messages.value = processMessages([newAiMessage], messages.value);
        }
        // [Removed] No longer calls scrollToBottom()
    };
    
    /**
     * 发送消息
     * @param {string} content - 消息内容
     */
    const sendMessage = (content) => {
        if (!content || isSending.value || !socketTask.value) return;

        const userMessage = { role: 'user', content, created_at: new Date().toISOString() };
        messages.value = processMessages([userMessage], messages.value);
        
        socketTask.value.send({ data: content });
        isSending.value = true;
        // [Removed] No longer calls scrollToBottom()
    };

    /**
     * 关闭 WebSocket 连接
     */
    const closeChat = () => {
        if (socketTask.value) {
            socketTask.value.close();
            socketTask.value = null;
        }
    };
    
    // --- 工具函数 (保持私有) ---
    const processMessages = (newMessages, existingMessages = []) => {
        let lastTimestamp = existingMessages.length > 0 ? new Date(existingMessages[existingMessages.length - 1].created_at).getTime() : 0;
        const tenMinutes = 10 * 60 * 1000;
        newMessages.forEach(msg => {
            msg._id = msg.id || msg.role + '_' + Date.now() + Math.random();
            const currentTimestamp = new Date(msg.created_at).getTime();
            if (currentTimestamp - lastTimestamp > tenMinutes) {
                msg.displayTime = formatDisplayTime(currentTimestamp);
            }
            lastTimestamp = currentTimestamp;
            msg.done = msg.done === undefined ? true : msg.done;
        });
        return [...existingMessages, ...newMessages];
    };

    const formatDisplayTime = (timestamp) => {
        const date = new Date(timestamp);
        return `${date.getMonth() + 1}月${date.getDate()}日 ${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}`;
    };

    return {
        messages,
        isSending,
        initializeChat,
        sendMessage,
        closeChat,
    };
});