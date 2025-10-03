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

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useCompanionStore } from '@/stores/companionStore.js';

const companionId = ref(null);
const companionName = ref('');
const companionStore = useCompanionStore();

onLoad((options) => {
	if (!options.id) {
		uni.showToast({ title: '参数错误', icon: 'none' });
		uni.navigateBack();
		return;
	}
	companionId.value = options.id;
	companionName.value = options.name || '';
});

const navigateToKnowledgeSettings = () => {
	uni.navigateTo({
		url: `/pages/companion-settings/companion-settings?id=${companionId.value}`
	});
};

const navigateToEditPersona = () => {
	uni.navigateTo({
		url: `/pages/companion-form/companion-form?mode=edit&id=${companionId.value}`
	});
};

const onDeleteCompanion = () => {
	uni.showModal({
		title: '请再次确认',
		content: `确定要永久删除 "${companionName.value}" 吗？所有相关数据都将被彻底清除且无法恢复。`,
		confirmText: '确定删除',
		confirmColor: '#fa5151',
		success: res => {
			if (res.confirm) {
                // 【重构】调用 store action
				companionStore.deleteCompanion(companionId.value);
			}
		}
	});
};
</script>

<style>
/* 样式无需改动 */
page { background-color: #f7f8fa; }
.settings-container { padding-top: 20rpx; }
.menu-group { background-color: #fff; }
.menu-item { display: flex; align-items: center; justify-content: space-between; padding: 30rpx; position: relative; transition: background-color 0.2s; }
.menu-item:active { background-color: #f7f8fa; }
.menu-item::after { content: ''; position: absolute; left: 30rpx; right: 0; bottom: 0; height: 1rpx; background-color: #f0f0f0; }
.menu-item:last-child::after { display: none; }
.menu-label { color: #333; }
.arrow-icon { width: 28rpx; height: 28rpx; opacity: 0.4; }
.danger-zone { margin-top: 120rpx; padding: 0 40rpx; border-top: 1rpx solid #e5e5e5; padding-top: 40rpx; }
.danger-zone-title { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.delete-button { background-color: #fa5151; color: white; }
.danger-zone-tip { font-size: 24rpx; color: #aaa; margin-top: 20rpx; text-align: center; }
</style>