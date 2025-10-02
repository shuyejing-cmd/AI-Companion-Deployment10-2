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

<script>
import * as knowledgeApi from '../../api/knowledge.js';

export default {
	data() {
		return {
			companionId: null,
			files: [],
			isUploading: false,
			isLoading: true, // 新增一个加载状态
		};
	},
	onLoad(options) {
		this.companionId = options.id;
		uni.setNavigationBarTitle({ title: '知识库管理' });
	},
	onShow() {
		this.fetchFiles();
	},
	methods: {
		// --- 1. 数据获取与删除 (已连接真实API) ---
		async fetchFiles() {
			if (!this.companionId) return;
			this.isLoading = true;
			try {
				const fileList = await knowledgeApi.getKnowledgeFiles(this.companionId);
				this.files = fileList;
			} catch (err) {
				console.error('获取文件列表失败', err);
				uni.showToast({ title: '获取列表失败', icon: 'none' });
			} finally {
				this.isLoading = false;
			}
		},
		confirmDelete(file) {
			uni.showModal({
				title: '确认删除',
				content: `确定要删除文件 "${file.file_name}" 吗？`,
				confirmText: '删除',
				confirmColor: '#fa5151',
				success: (res) => {
					if (res.confirm) {
						this.deleteFile(file.id);
					}
				}
			});
		},
		async deleteFile(fileId) {
			uni.showLoading({ title: '删除中...' });
			try {
				await knowledgeApi.deleteKnowledgeFile(fileId);
				uni.showToast({ title: '删除成功', icon: 'success' });
				this.fetchFiles(); // 成功后刷新列表
			} catch (err) {
				console.error('删除失败', err);
				uni.showToast({ title: '删除失败', icon: 'none' });
			} finally {
				uni.hideLoading();
			}
		},

		// --- 2. 兼容多平台的文件选择逻辑 (最终版) ---
		async chooseAndUploadFile() {
			// 尝试使用 uni.chooseFile，这在打包为原生App时通常有效
			// #ifndef H5
			try {
				const res = await new Promise((resolve, reject) => {
					uni.chooseFile({
						count: 1,
						type: 'all',
						success: resolve,
						fail: reject
					});
				});
				const tempFile = res.tempFiles && res.tempFiles[0];
				if (tempFile && tempFile.path) {
					await this.uploadFile(tempFile.path);
					return;
				}
			} catch (e) {
				// 如果用户取消或API失败，则不提示错误，并继续尝试H5方案
				if (e.errMsg && e.errMsg.indexOf('cancel') === -1) {
					console.warn('uni.chooseFile API调用失败，可能是当前环境不支持。错误:', e);
				}
			}
			// #endif

			// 降级方案：在H5环境或uni.chooseFile失败时，使用浏览器标准的文件选择方式
			// #ifdef H5
			if (typeof document !== 'undefined') {
				const input = document.createElement('input');
				input.type = 'file';
				input.onchange = async (e) => {
					const file = e.target.files && e.target.files[0];
					if (file) {
						await this.uploadFile(file);
					}
					document.body.removeChild(input);
				};
				document.body.appendChild(input);
				input.click();
				return;
			}
			// #endif

			// 如果所有方法都失败
			uni.showToast({ title: '当前环境不支持文件选择', icon: 'none' });
		},

		// --- 3. 统一的上传处理函数 (已连接真实API) ---
		async uploadFile(fileOrPath) {
			this.isUploading = true;
			uni.showLoading({ title: '上传中...' });
			try {
				await knowledgeApi.uploadKnowledgeFile(this.companionId, fileOrPath);
				uni.showToast({ title: '上传成功，后台处理中...', icon: 'success' });
				setTimeout(() => {
					this.fetchFiles();
				}, 2000);
			} catch (err) {
				console.error('上传失败', err);
				uni.showToast({ title: '上传失败', icon: 'none' });
			} finally {
				this.isUploading = false;
				uni.hideLoading();
			}
		},

		formatStatus(status) {
			const statusMap = { 'UPLOADED': '已上传', 'PROCESSING': '处理中', 'INDEXED': '已索引', 'FAILED': '失败' };
			return statusMap[status] || status;
		}
	}
};
</script>

<style scoped>
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