<template>
	<view>
		<view class="settings-container">
			<view class="menu-group">
				<view class="menu-item" @click="navigateToKnowledgeSettings">
					<text class="menu-label">知识库管理</text>
					<image class="arrow-icon" src="/static/images/right-arrow-icon.png" />
				</view>

				<view class="menu-item" @click="navigateToEditPersona">
					<text class="menu-label">修改人设</text>
					<image class="arrow-icon" src="/static/images/right-arrow-icon.png" />
				</view>
			</view>
		</view>

		<view class="danger-zone">
			<view class="danger-zone-title">危险操作</view>
			<button class="delete-button" type="warn" @click="onDeleteCompanion">删除此AI伙伴</button>
			<view class="danger-zone-tip">此操作将永久删除伙伴的所有数据，包括聊天记录和知识库，且无法恢复。</view>
		</view>
	</view>
</template>

<script>
import * as companionApi from '../../api/companion.js';

export default {
	data() {
		return {
			companionId: null,
			companionName: ''
		};
	},
	onLoad(options) {
		if (!options.id) { // 检查 id 即可，name 不是必须的
			uni.showToast({ title: '参数错误', icon: 'none' });
			uni.navigateBack();
			return;
		}
		this.companionId = options.id;
		this.companionName = options.name || ''; // 如果没有name,给个默认值
	},
	methods: {
		navigateToKnowledgeSettings() {
			// 跳转到 companion-settings 页面
			uni.navigateTo({
				url: `/pages/companion-settings/companion-settings?id=${this.companionId}`
			});
		},
		navigateToEditPersona() {
			uni.navigateTo({
				url: `/pages/companion-form/companion-form?mode=edit&id=${this.companionId}`
			});
		},
		onDeleteCompanion() {
			// ... 此方法无需修改
			const companionName = this.companionName;
			uni.showModal({
				title: '请再次确认',
				content: `确定要永久删除 "${companionName}" 吗？所有相关数据都将被彻底清除且无法恢复。`,
				confirmText: '确定删除',
				confirmColor: '#fa5151',
				success: res => {
					if (res.confirm) this.performDelete();
				}
			});
		},
		async performDelete() {
			// --- ▼▼▼ 【核心修正】 ▼▼▼ ---
			// 在需要的地方才调用 getApp()
			const app = getApp();
			// --- ▲▲▲ 【核心修正】 ▲▲▲ ---

			const companionId = this.companionId;
			uni.showLoading({ title: '正在删除...', mask: true });

			try {
				const result = await companionApi.deleteCompanion(companionId);
				uni.showToast({ title: result.message || '删除成功', icon: 'success' });

				if (app && app.event && typeof app.event.emit === 'function') {
					app.event.emit('companionsUpdated');
				}
				setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 2000);

			} catch (err) {
				console.error('删除伙伴时发生前端错误', err);
				uni.showToast({ title: '删除失败', icon: 'none' });
			} finally {
				uni.hideLoading();
			}
		}
	}
};
</script>

<style>
page {
	background-color: #f7f8fa; /* cite: 1 */
	font-size: 32rpx; /* cite: 1 */
}
.settings-container {
	padding-top: 20rpx; /* cite: 2 */
}
.menu-group {
	background-color: #fff;
}
.menu-item {
	display: flex; /* cite: 3 */
	align-items: center; /* cite: 3 */
	justify-content: space-between; /* cite: 3 */
	padding: 30rpx; /* cite: 3 */
	position: relative; /* cite: 3 */
	transition: background-color 0.2s; /* cite: 3 */
}
.menu-item:active {
	background-color: #f7f8fa; /* cite: 4 */
}
.menu-item::after {
	content: ''; /* cite: 5 */
	position: absolute; /* cite: 5 */
	left: 30rpx; /* cite: 5 */
	right: 0; /* cite: 5 */
	bottom: 0; /* cite: 5 */
	height: 1rpx; /* cite: 5 */
	background-color: #f0f0f0; /* cite: 5 */
}
.menu-item:last-child::after {
	display: none;
}
.menu-label {
	color: #333; /* cite: 6 */
}
.arrow-icon {
	width: 28rpx; /* cite: 7 */
	height: 28rpx; /* cite: 7 */
	opacity: 0.4; /* cite: 7 */
}
.danger-zone {
	margin-top: 120rpx; /* cite: 8 */
	padding: 0 40rpx; /* cite: 8 */
	border-top: 1rpx solid #e5e5e5; /* cite: 8 */
	padding-top: 40rpx; /* cite: 8 */
}
.danger-zone-title {
	font-size: 28rpx; /* cite: 9 */
	color: #999; /* cite: 9 */
	margin-bottom: 20rpx; /* cite: 9 */
}
.delete-button {
	background-color: #fa5151; /* cite: 10 */
	color: white; /* cite: 10 */
}
.danger-zone-tip {
	font-size: 24rpx; /* cite: 10 */
	color: #aaa; /* cite: 10 */
	margin-top: 20rpx; /* cite: 10 */
	text-align: center; /* cite: 10 */
}
</style>