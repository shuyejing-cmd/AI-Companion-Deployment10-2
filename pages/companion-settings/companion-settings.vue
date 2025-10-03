<template>
	<view class="container">
		<view class="file-list-container">
			<view v-if="!isLoading && files.length > 0" class="file-list">
				<view v-for="file in files" :key="file.id" class="file-item">
					<view class="file-info">
						<text class="file-name">{{ file.file_name }}</text>
						<text class="file-status" :class="[file.status]">{{ formatStatus(file.status) }}</text>
					</view>
					<button class="delete-btn" size="mini" @click="confirmDelete(file)">删除</button>
				</view>
			</view>
			<view v-if="!isLoading && files.length === 0" class="empty-tip">知识库为空，请上传文件</view>
			<view v-if="isLoading" class="loading-tip">正在加载文件列表...</view>
		</view>
		<button class="upload-btn" @click="chooseAndUploadFile" :loading="isUploading">上传新文件</button>
	</view>
</template>

<script setup>
import { onShow, onLoad } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useKnowledgeStore } from '@/stores/knowledgeStore.js';

const knowledgeStore = useKnowledgeStore();
const { files, isLoading, isUploading } = storeToRefs(knowledgeStore);
let companionId = null;

onLoad((options) => {
	companionId = options.id;
	uni.setNavigationBarTitle({ title: '知识库管理' });
	// 【重构】在页面加载时初始化Store
	knowledgeStore.initializeKnowledgeBase(companionId);
});

onShow(() => {
	// 每次页面显示时，都刷新一次列表
	knowledgeStore.fetchFiles();
});

const confirmDelete = (file) => {
	uni.showModal({
		title: '确认删除',
		content: `确定要删除文件 "${file.file_name}" 吗？`,
		confirmText: '删除',
		confirmColor: '#fa5151',
		success: (res) => {
			if (res.confirm) {
				knowledgeStore.deleteFile(file.id);
			}
		}
	});
};

const chooseAndUploadFile = async () => {
    // 这段复杂的、兼容多平台的文件选择逻辑可以保持不变
	// ... (省略您原来的 chooseAndUploadFile 逻辑代码) ...
    // 但最终的上传调用需要修改为调用 store action
    // await this.uploadFile(tempFile.path) -> await knowledgeStore.uploadFile(tempFile.path)
    // await this.uploadFile(file) -> await knowledgeStore.uploadFile(file)
};

// 【重构】直接在 setup 中定义方法，无需 this
const formatStatus = (status) => {
	const statusMap = { 'UPLOADED': '已上传', 'PROCESSING': '处理中', 'INDEXED': '已索引', 'FAILED': '失败' };
	return statusMap[status] || status;
};
</script>

<style scoped>
/* 样式无需改动 */
.container { padding: 30rpx; }
.file-list-container { background-color: #fff; border-radius: 16rpx; padding: 10rpx 30rpx; margin-bottom: 40rpx; min-height: 200rpx; display: flex; flex-direction: column; justify-content: center; }
.file-item { display: flex; justify-content: space-between; align-items: center; padding: 25rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.file-item:last-child { border-bottom: none; }
.file-info { display: flex; flex-direction: column; flex-grow: 1; margin-right: 20rpx; }
.file-name { color: #333; font-size: 30rpx; margin-bottom: 5rpx; word-break: break-all; }
.file-status { font-size: 24rpx; }
.file-status.INDEXED { color: #07c160; }
.file-status.PROCESSING { color: #007aff; }
.file-status.FAILED { color: #fa5151; }
.delete-btn { background-color: #fa5151; color: white; margin: 0; font-size: 24rpx; flex-shrink: 0; }
.empty-tip, .loading-tip { text-align: center; color: #999; padding: 80rpx 0; }
.upload-btn { background-color: #007aff; color: white; }
</style>