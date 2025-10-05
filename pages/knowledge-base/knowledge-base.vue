<template>
	<view class="page-wrapper">
        <view class="global-bg"></view> 

		<view 
            class="settings-container"
            :style="{ paddingTop: (statusBarHeight + 30) + 'px' }"  
        >
            
            <view class="menu-group">
				<view class="menu-item" @click="navigateToKnowledgeSettings">
					<text class="menu-label">知识库管理</text>
					<image class="arrow-icon" src="/static/right-arrow-icon.png" />
				</view>
				<view class="menu-item" @click="navigateToEditPersona">
					<text class="menu-label">修改人设</text>
					<image class="arrow-icon" src="/static/right-arrow-icon.png" />
				</view>
			</view>

            <view class="description-edit-card">
                <text class="card-title">主页伙伴备注/描述</text>
                <view class="input-row">
                    <input 
                        class="desc-input" 
                        placeholder="请输入主页列表中的伙伴备注"
                        v-model="companionDescription" 
                        :disabled="isSaving"
                        maxlength="50"
                    />
                    <button 
                        class="save-btn" 
                        :disabled="isSaving || !companionDescription.trim()"
                        @click="saveCompanionDescription"
                    >
                        {{ isSaving ? '保存中' : '保存' }}
                    </button>
                </view>
                <view class="desc-tip">此内容将显示在主页伙伴列表的名称下方。</view>
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
import * as companionApi from '@/api/companion.js'; 

const companionId = ref(null);
const companionName = ref('');
const companionStore = useCompanionStore();

const statusBarHeight = ref(0); 
const companionDescription = ref('');
const isSaving = ref(false); 

onLoad(async (options) => {
    const systemInfo = uni.getSystemInfoSync();
    statusBarHeight.value = systemInfo.statusBarHeight || 0;
    
	if (!options.id) {
		uni.showToast({ title: '参数错误', icon: 'none' });
		uni.navigateBack();
		return;
	}
	companionId.value = options.id;
	companionName.value = options.name || '';

    await loadCompanionDetails(options.id);
});

const loadCompanionDetails = async (id) => {
    uni.showLoading({ title: '加载中' });
    try {
        const data = await companionApi.getCompanionById(id);
        companionDescription.value = data.description || ''; 
    } catch (error) {
        console.error("加载伙伴详情失败:", error);
        uni.showToast({ title: '加载描述失败', icon: 'none' });
    } finally {
        uni.hideLoading();
    }
};

const saveCompanionDescription = async () => {
    if (isSaving.value) return;

    const newDescription = companionDescription.value.trim();
    if (!newDescription) {
        uni.showToast({ title: '备注不能为空', icon: 'none' });
        return;
    }

    isSaving.value = true;
    uni.showLoading({ title: '保存中' });

    try {
        const updateData = { description: newDescription };
        
        await companionApi.updateCompanion(companionId.value, updateData);
        
        uni.showToast({ title: '备注保存成功！', icon: 'success' });
        
        companionStore.fetchCompanions(); 

    } catch (error) {
        console.error("保存描述失败:", error);
        uni.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
        uni.hideLoading();
        isSaving.value = false;
    }
};

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
				companionStore.deleteCompanion(companionId.value);
			}
		}
	});
};
</script>

<style>
/* 1. 页面和全局背景设置 */
page { background-color: transparent; height: 100%; }

.page-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh; /* ⬅️ 关键：确保 flex 布局撑满整个视口 */
}

.global-bg {
	position: fixed; top: 0; left: 0; width: 100%; height: 100%;
	background: linear-gradient(120deg, #fde4ea 0%, #a6c0fe 100%);
	z-index: -1;
}

.settings-container { 
    flex: 1; /* ⬅️ 关键：占据剩余所有空间 */
    /* 仅控制左右留白，顶部由 JS 控制 */
    padding: 0 0 30rpx 0;
}

/* 2. 描述编辑卡片 (Description Edit Card) 样式 */
.description-edit-card {
    background-color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12rpx);
    -webkit-backdrop-filter: blur(12rpx);
    box-shadow: 0px 8rpx 30rpx rgba(100, 100, 150, 0.15); 
    border: 1rpx solid rgba(255, 255, 255, 0.6); 
    
    padding: 30rpx;
    margin: 30rpx; /* ⬅️ 左右和顶部边距 */
    border-radius: 16rpx;
}
.card-title {
    font-size: 30rpx;
    font-weight: 500;
    color: #333;
    margin-bottom: 20rpx;
    display: block;
}
.input-row {
    display: flex;
    align-items: center;
    margin-bottom: 10rpx;
}
.desc-input {
    flex: 1;
    height: 70rpx;
    border: 1rpx solid #e0e0e0;
    border-radius: 8rpx;
    padding: 0 20rpx;
    font-size: 28rpx;
    background-color: #f7f7f7;
}
.save-btn {
    width: 120rpx;
    height: 70rpx;
    line-height: 70rpx;
    margin-left: 20rpx;
    padding: 0;
    background-color: #07c160;
    color: #fff;
    font-size: 28rpx;
    border-radius: 8rpx;
}
.save-btn[disabled] {
    background-color: #ccc;
}
.desc-tip {
    font-size: 24rpx;
    color: #999;
}

/* 3. 菜单组 (Menu Group) 样式 */
.menu-group { 
    background-color: transparent; 
    margin: 0 30rpx;
    border-radius: 16rpx;
    overflow: hidden; 
}

.menu-item { 
    background-color: rgba(255, 255, 255, 0.7); 
    backdrop-filter: blur(12rpx);
    -webkit-backdrop-filter: blur(12rpx);
    box-shadow: 0px 2rpx 10rpx rgba(100, 100, 150, 0.05);
    border: 1rpx solid rgba(255, 255, 255, 0.6); 
    
    display: flex; align-items: center; justify-content: space-between; 
    padding: 30rpx; 
    position: relative; 
    transition: background-color 0.2s; 
    
    margin-bottom: 15rpx; /* ⬅️ 卡片间增加间距 */
    border-radius: 16rpx;
}

.menu-item:last-child {
    margin-bottom: 0;
}

.menu-item::after, .menu-item:last-child::after { 
    display: none; 
}

.menu-item:active { background-color: rgba(255, 255, 255, 0.9); }
.menu-label { color: #333; }
.arrow-icon { width: 28rpx; height: 28rpx; opacity: 0.4; }

/* 4. 危险区域样式 */
.danger-zone { 
    flex-shrink: 0; /* ⬅️ 关键：不被压缩 */
    margin-top: auto; /* ⬅️ 关键：将区域推到最底部 */
    
    padding: 40rpx 40rpx 0 40rpx; 
    border-top: 1rpx solid #e5e5e5; 
    padding-bottom: env(safe-area-inset-bottom); /* ⬅️ 处理底部安全区 */
}
.danger-zone-title { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.delete-button { background-color: #fa5151; color: white; }
.danger-zone-tip { font-size: 24rpx; color: #aaa; margin-top: 20rpx; text-align: center; }
</style>