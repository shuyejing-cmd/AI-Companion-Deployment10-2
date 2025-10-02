<template>
	<view class="form-container">
		<view class="form-item">
			<text class="form-label">伙伴头像</text>
			<image class="avatar-uploader" :src="form.src || '/static/images/default-avatar.png'" @click="chooseAvatar" mode="aspectFill"></image>
		</view>

		<view class="form-item">
			<text class="form-label">伙伴昵称</text>
			<input class="form-input" placeholder="给你的伙伴起个名字" :value="form.name" @input="handleInput($event, 'name')" />
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
</template>

<script>
import * as companionApi from '../../api/companion.js';

export default {
	data() {
		return {
			form: {
				id: null,
				name: '',
				description: '',
				instructions: '',
				seed: '',
				src: '',
				gender: 'NONE', 
			},
			mode: 'create',
			isSubmitting: false,
		};
	},
	onLoad(options) {
		// ... onLoad 方法内容无需修改, 保持原样 ...
		if (options.mode === 'edit' && options.id) {
			this.mode = 'edit';
			this.form.id = options.id;
			uni.setNavigationBarTitle({ title: '编辑伙伴' });
			this.loadCompanionData(options.id);
		} else {
			this.mode = 'create';
			this.form = { id: null, name: '', description: '一个新建的AI伙伴', instructions: '', seed: '', src: '', gender: 'NONE' };
			uni.setNavigationBarTitle({ title: '创建新的AI伙伴' });
		}
चींटी (Chīṇṭī)
	},
	methods: {
		async loadCompanionData(companionId) {
			// ... 此方法无需修改 ...
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
			// ... 此方法无需修改 ...
			this.form[field] = e.detail.value;
		},
		chooseAvatar() {
			// ... 此方法无需修改 ...
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
			// ... 此方法无需修改 ...
			this.form.gender = e.detail.value;
		},
		async handleSubmit() {
			// --- ▼▼▼ 【核心修正】 ▼▼▼ ---
			// 在需要用到的地方才调用 getApp()
			const app = getApp();
			// --- ▲▲▲ 【核心修正】 ▲▲▲ ---

			if (this.isSubmitting) return;
			if (!this.form.name || !this.form.instructions) {
				uni.showToast({ title: '昵称和角色设定不能为空', icon: 'none' });
				return;
			}

			const dataToSubmit = {
				name: this.form.name,
				description: this.form.description,
				instructions: this.form.instructions,
				seed: this.form.seed || `我是${this.form.name}，很高兴认识你！`,
				src: this.form.src,
				// gender 字段后端 companion schema 中没有，暂时不提交
			};

			this.isSubmitting = true;
			uni.showLoading({ title: '正在保存...' });

			try {
				if (this.mode === 'edit') {
					await companionApi.updateCompanion(this.form.id, dataToSubmit);
				} else {
					// 使用我们新创建的 api/companion.js 中的方法
					await companionApi.createCompanion(dataToSubmit);
				}

				uni.showToast({ title: '保存成功！', icon: 'success' });

				// 确保 app 和 event 存在再调用
				if (app && app.event && typeof app.event.emit === 'function') {
                    // event.emit 的第一个参数应该是事件名字符串
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
/* .wxss 内容可以直接复制过来 */
page { background-color: #f7f8fa; }
.form-container { padding: 30rpx; }

.form-item {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 30rpx;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
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
  margin-bottom: 20rpx;
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
  height: 300rpx;
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
    width: 120rpx; 
    height: 120rpx; 
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

.submit-btn { 
    background-color: #07c160; 
    color: #fff; 
    margin-top: 40rpx; 
    padding: 20rpx 40rpx; 
    border-radius: 12rpx; 
    text-align:center; 
}
/* 按钮禁用时的样式 */
.submit-btn[disabled] {
    background-color: #a8e5c1;
    color: #f7f7f7;
}
</style>