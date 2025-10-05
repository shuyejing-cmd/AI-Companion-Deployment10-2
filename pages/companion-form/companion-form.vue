<template>
	<view>
        <view class="global-bg"></view> <view 
			class="form-container"
			:style="{ paddingTop: (statusBarHeight + 35) + 'px' }"  
		>
			<view class="form-item">
				<text class="form-label">伙伴头像</text>
				<image class="avatar-uploader" :src="form.src || '/static/default-avatar.png'" @click="chooseAvatar" mode="aspectFill"></image>
			</view>

			<view class="form-item">
				<text class="form-label">伙伴昵称</text>
				<input class="form-input" placeholder="给你的伙伴起个名字" :value="form.name" @input="handleInput($event, 'name')" />
			</view>

            <view class="form-item">
				<text class="form-label">伙伴描述</text>
				<input 
                    class="form-input" 
                    placeholder="展示在主页列表的伙伴描述" 
                    :value="form.description" 
                    @input="handleInput($event, 'description')" 
                />
			</view>
            <view class="form-item">
				<text class="form-label">伙伴性别</text>
				<radio-group class="form-radio-group" @change="onGenderChange">
					<label class="radio">
						<radio value="MALE" :checked="form.gender === 'MALE'" />男
					</label>
					<label class="radio">
						<radio value="FEMALE" :checked="form.gender === 'FEMALE'" />女
					</label>
					<label class="radio">
						<radio value="NONE" :checked="form.gender === 'NONE'" />保密
					</label>
				</radio-group>
			</view>

			<view class="form-item column">
				<text class="form-label">角色设定 (Instructions)</text>
				<view class="textarea-wrapper">
					<textarea
						class="scroll-textarea"
						:value="form.instructions"
						placeholder="简短描述角色的性格/背景/说话风格（建议 50-300 字）"
						:show-count="true"
						:maxlength="1000"
						@input="handleInput($event, 'instructions')"
						:adjust-position="true"
					></textarea>
				</view>
			</view>

			<view class="form-item column">
				<text class="form-label">示例对话 (Seed)</text>
				<view class="textarea-wrapper">
					<textarea
						class="scroll-textarea"
						:value="form.seed"
						placeholder="角色与用户的一个小对话示例（建议 20-100 字）"
						:show-count="true"
						:maxlength="500"
						@input="handleInput($event, 'seed')"
						:adjust-position="true"
					></textarea>
				</view>
			</view>
			
			<button class="submit-btn" @click="handleSubmit" :disabled="isSubmitting">保存伙伴</button>
		</view>
	</view>
</template>

<script>
import * as companionApi from '../../api/companion.js';

export default {
	data() {
		return {
			form: {
				id: null,
				name: '',
				description: '', // ⬅️ 【修正】初始化为空
				instructions: '',
				seed: '',
				src: '',
				gender: 'NONE', 
			},
			mode: 'create',
			isSubmitting: false,
			statusBarHeight: 0, 
		};
	},
	onLoad(options) {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0; 
		
		if (options.mode === 'edit' && options.id) {
			this.mode = 'edit';
			this.form.id = options.id;
			uni.setNavigationBarTitle({ title: '编辑伙伴' });
			this.loadCompanionData(options.id);
		} else {
			this.mode = 'create';
			// ⬅️ 【修正】创建时的默认值也为空
			this.form = { id: null, name: '', description: '', instructions: '', seed: '', src: '', gender: 'NONE' }; 
			uni.setNavigationBarTitle({ title: '创建新的AI伙伴' });
		}
	},
	methods: {
		async loadCompanionData(companionId) {
			uni.showLoading({ title: '加载数据...' });
			try {
				const companionData = await companionApi.getCompanionById(companionId);
				this.form = companionData;
			} catch (err) {
				uni.showToast({ title: '加载失败', icon: 'none' });
			} finally {
				uni.hideLoading();
			}
		},
		handleInput(e, field) {
			this.form[field] = e.detail.value;
		},
		chooseAvatar() {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					const tempFilePath = res.tempFilePaths[0];
					this.form.src = tempFilePath;
					uni.showToast({ title: '头像上传成功(演示)', icon: 'none' });
				}
			});
		},
		onGenderChange(e) {
			this.form.gender = e.detail.value;
		},
		async handleSubmit() {
			const app = getApp();

			if (this.isSubmitting) return;
			if (!this.form.name || !this.form.instructions) {
				uni.showToast({ title: '昵称和角色设定不能为空', icon: 'none' });
				return;
			}

			const dataToSubmit = {
				name: this.form.name,
				description: this.form.description, // ⬅️ 字段已包含在内
				instructions: this.form.instructions,
				seed: this.form.seed || `我是${this.form.name}，很高兴认识你！`,
				src: this.form.src,
			};

			this.isSubmitting = true;
			uni.showLoading({ title: '正在保存...' });

			try {
				if (this.mode === 'edit') {
					await companionApi.updateCompanion(this.form.id, dataToSubmit);
				} else {
					await companionApi.createCompanion(dataToSubmit);
				}

				uni.showToast({ title: '保存成功！', icon: 'success' });

				if (app && app.event && typeof app.event.emit === 'function') {
					app.event.emit('companionsUpdated');
				}

				setTimeout(() => {
					uni.navigateBack();
				}, 1500);

			} catch (err) {
				console.error("保存伙伴失败", err);
				uni.showToast({ title: '保存失败', icon: 'none' });
			} finally {
				uni.hideLoading();
				this.isSubmitting = false;
			}
		},
	}
};
</script>

<style>
/* 样式保持不变 */
/* ... (样式代码与你提供的版本一致) ... */
page { background-color: transparent; }

.global-bg {
	position: fixed; top: 0; left: 0; width: 100%; height: 100%;
	/* 使用主页的渐变色 */
	background: linear-gradient(120deg, #fde4ea 0%, #a6c0fe 100%);
	z-index: -1;
}

.form-container { 
    /* 侧边和底部留白保持不变，顶部由 JS 动态样式控制 */
    padding-left: 30rpx; 
    padding-right: 30rpx;
    padding-bottom: 30rpx;
 }

/* 2. 表单卡片项 (Form Item) 样式 */
.form-item {
  display: flex;
  align-items: center;
  
  /* 【紧凑化】减小上下 padding，但保持左右 padding */
  padding: 20rpx 30rpx;
  
  /* 【紧凑化】减小卡片之间的垂直间距 */
  margin-bottom: 15rpx; 
  border-radius: 16rpx;
  
  /* 毛玻璃效果和立体感 */
  background-color: rgba(255, 255, 255, 0.7); /* 调整透明度 */
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx); 
  box-shadow: 0px 8rpx 30rpx rgba(100, 100, 150, 0.15); 
  border: 1rpx solid rgba(255, 255, 255, 0.6); 
}

.form-item.column {
  flex-direction: column;
  align-items: flex-start;
}

.form-label {
  font-size: 30rpx;
  color: #333;
  width: 180rpx;
  flex-shrink: 0;
}
.form-item.column .form-label {
  width: 100%;
  /* 【紧凑化】减小列布局中 label 下方的间距 */
  margin-bottom: 10rpx; 
}

.form-input {
  flex: 1;
  font-size: 30rpx;
}

.textarea-wrapper {
  position: relative;
  width: 100%;
  display: block;
}

.scroll-textarea {
  width: 100%;
  /* 保持高度，确保有足够的编辑空间 */
  height: 250rpx; 
  padding: 20rpx;
  box-sizing: border-box;
  border-radius: 8rpx;
  border: 1rpx solid #eee;
  background-color: #fbfbfb;
  font-size: 28rpx;
  line-height: 36rpx;
  overflow-y: scroll;     
  -webkit-overflow-scrolling: touch;
  resize: none;
}

.avatar-uploader { 
    width: 100rpx; /* ⬅️ 略微减小头像尺寸，配合紧凑布局 */
    height: 100rpx; 
    border-radius: 16rpx; 
    background-color: #f0f0f0; 
}

.form-radio-group { 
    display: flex; 
}
.radio { 
    margin-right: 40rpx; 
    font-size: 30rpx; 
}

/* 3. 按钮样式 */
.submit-btn { 
    background-color: #07c160; 
    color: #fff; 
    margin-top: 40rpx; 
    padding: 20rpx 40rpx; 
    border-radius: 12rpx; 
    text-align:center; 
}

.submit-btn[disabled] {
    background-color: #a8e5c1;
    color: #f7f7f7;
}
</style>