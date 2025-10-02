if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const TokenKey = "user_access_token";
  function getToken() {
    return uni.getStorageSync(TokenKey);
  }
  function setToken(token) {
    return uni.setStorageSync(TokenKey, token);
  }
  function removeToken() {
    return uni.removeStorageSync(TokenKey);
  }
  const BASE_URL = "http://120.53.230.215:8000";
  const request = (options) => {
    return new Promise((resolve, reject) => {
      const token = getToken();
      const header = options.header || {};
      if (token) {
        header["Authorization"] = "Bearer " + token;
      }
      uni.request({
        url: BASE_URL + options.url,
        method: options.method || "GET",
        header,
        data: options.data || {},
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            if (res.statusCode === 401) {
              uni.showToast({ title: "登录已过期，请重新登录", icon: "none" });
              removeToken();
              uni.navigateTo({
                url: "/pages/login/login"
              });
            }
            formatAppLog("error", "at api/request.js:34", "请求失败: ", res);
            reject(res);
          }
        },
        fail: (err) => {
          uni.showToast({ title: "网络连接失败", icon: "none" });
          formatAppLog("error", "at api/request.js:40", "网络错误: ", err);
          reject(err);
        }
      });
    });
  };
  function register(data) {
    return request({
      url: "/api/v1/auth/register",
      method: "post",
      data
    });
  }
  function login(data) {
    const formData = `username=${encodeURIComponent(data.email)}&password=${encodeURIComponent(data.password)}`;
    return request({
      url: "/api/v1/auth/login",
      method: "POST",
      header: {
        // 明确告诉后端请求体的格式
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: formData
    });
  }
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$7 = {
    data() {
      return {
        loginForm: {
          email: "",
          password: ""
        }
      };
    },
    methods: {
      handleLogin() {
        if (!this.loginForm.email || !this.loginForm.password) {
          uni.showToast({ title: "邮箱和密码不能为空", icon: "none" });
          return;
        }
        uni.showLoading({ title: "登录中..." });
        login(this.loginForm).then((response) => {
          const token = response.access_token;
          if (token) {
            setToken(token);
            uni.showToast({
              title: "登录成功！",
              icon: "success"
            });
            setTimeout(() => {
              uni.switchTab({
                url: "/pages/index/index"
                // 请确保这是您的主页路径
              });
            }, 1500);
          } else {
            throw new Error("未能从服务器获取Token");
          }
        }).catch((error) => {
          var _a;
          formatAppLog("error", "at pages/login/login.vue:61", "登录失败: ", error);
          const errorMsg = ((_a = error.data) == null ? void 0 : _a.detail) || "登录失败，请检查您的凭证";
          uni.showToast({
            title: errorMsg,
            icon: "none"
          });
        }).finally(() => {
          uni.hideLoading();
        });
      },
      goToRegister() {
        uni.navigateTo({
          url: "/pages/register/register"
        });
      }
    }
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "form-wrapper" }, [
        vue.createElementVNode("view", { class: "title" }, "欢迎回来"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input-item",
            type: "text",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.loginForm.email = $event),
            placeholder: "请输入邮箱"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.loginForm.email]
        ]),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input-item",
            type: "password",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.loginForm.password = $event),
            placeholder: "请输入密码"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.loginForm.password]
        ]),
        vue.createElementVNode("button", {
          class: "action-btn",
          onClick: _cache[2] || (_cache[2] = (...args) => $options.handleLogin && $options.handleLogin(...args))
        }, "登录"),
        vue.createElementVNode("view", {
          class: "link",
          onClick: _cache[3] || (_cache[3] = (...args) => $options.goToRegister && $options.goToRegister(...args))
        }, "还没有账户？立即注册")
      ])
    ]);
  }
  const PagesLoginLogin = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__scopeId", "data-v-e4e4508d"], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/login/login.vue"]]);
  const _sfc_main$6 = {
    data() {
      return {
        registerForm: {
          email: "",
          nickname: "",
          password: ""
        }
      };
    },
    methods: {
      handleRegister() {
        if (!this.registerForm.email || !this.registerForm.password) {
          uni.showToast({ title: "邮箱和密码不能为空", icon: "none" });
          return;
        }
        uni.showLoading({ title: "注册中..." });
        register(this.registerForm).then((response) => {
          uni.hideLoading();
          uni.showToast({
            title: "注册成功！",
            icon: "success"
          });
          setTimeout(() => {
            this.goToLogin();
          }, 1500);
        }).catch((error) => {
          var _a;
          uni.hideLoading();
          formatAppLog("error", "at pages/register/register.vue:55", "注册失败: ", error);
          const errorMsg = ((_a = error.data) == null ? void 0 : _a.detail) || "注册失败，请稍后再试";
          uni.showToast({
            title: errorMsg,
            icon: "none"
          });
        });
      },
      goToLogin() {
        uni.navigateTo({
          url: "/pages/login/login"
        });
      }
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "form-wrapper" }, [
        vue.createElementVNode("view", { class: "title" }, "创建新账户"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input-item",
            type: "text",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.registerForm.email = $event),
            placeholder: "请输入邮箱"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.registerForm.email]
        ]),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input-item",
            type: "text",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.registerForm.nickname = $event),
            placeholder: "请输入昵称"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.registerForm.nickname]
        ]),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input-item",
            type: "password",
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.registerForm.password = $event),
            placeholder: "请输入密码"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.registerForm.password]
        ]),
        vue.createElementVNode("button", {
          class: "action-btn",
          onClick: _cache[3] || (_cache[3] = (...args) => $options.handleRegister && $options.handleRegister(...args))
        }, "注册"),
        vue.createElementVNode("view", {
          class: "link",
          onClick: _cache[4] || (_cache[4] = (...args) => $options.goToLogin && $options.goToLogin(...args))
        }, "已有账户？立即登录")
      ])
    ]);
  }
  const PagesRegisterRegister = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__scopeId", "data-v-bac4a35d"], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/register/register.vue"]]);
  function getCompanions() {
    return request({
      url: "/api/v1/companions/",
      method: "get"
    });
  }
  function createCompanion(data) {
    return request({
      url: "/api/v1/companions/",
      method: "post",
      data
    });
  }
  function getCompanionById(id) {
    return request({
      url: `/api/v1/companions/${id}`,
      method: "get"
    });
  }
  function updateCompanion(id, data) {
    return request({
      url: `/api/v1/companions/${id}`,
      method: "patch",
      data
    });
  }
  function deleteCompanion(id) {
    return request({
      url: `/api/v1/companions/${id}`,
      method: "delete"
    });
  }
  const _imports_0$2 = "/static/images/add-companion-icon.png";
  const _sfc_main$5 = {
    data() {
      return {
        companionList: [],
        isLoading: true,
        isMenuShow: false,
        handleCompanionsUpdate: null
        // 将句柄存储在 data 中
      };
    },
    onLoad() {
      this.handleCompanionsUpdate = () => {
        formatAppLog("log", "at pages/index/index.vue:64", "👂 [index.js] 监听到伙伴列表需要更新，正在刷新...");
        this.fetchCompanions();
      };
    },
    onShow() {
      const app = getApp();
      if (app && app.event && typeof app.event.on === "function") {
        app.event.on("companionsUpdated", this.handleCompanionsUpdate);
      }
      this.fetchCompanions();
    },
    onHide() {
      const app = getApp();
      if (app && app.event && typeof app.event.off === "function") {
        app.event.off("companionsUpdated", this.handleCompanionsUpdate);
      }
    },
    onUnload() {
      const app = getApp();
      if (app && app.event && typeof app.event.off === "function") {
        app.event.off("companionsUpdated", this.handleCompanionsUpdate);
      }
    },
    onPullDownRefresh() {
      this.fetchCompanions().finally(() => {
        uni.stopPullDownRefresh();
      });
    },
    methods: {
      fetchCompanions() {
        this.isLoading = true;
        getCompanions().then((res) => {
          this.companionList = res;
        }).catch((err) => {
          formatAppLog("error", "at pages/index/index.vue:105", "获取伙伴列表失败", err);
          uni.showToast({ title: "加载失败，请下拉刷新", icon: "none" });
        }).finally(() => {
          this.isLoading = false;
        });
      },
      toggleMenu() {
        this.isMenuShow = !this.isMenuShow;
      },
      goToAddCompanion() {
        this.isMenuShow = false;
        uni.navigateTo({
          // 请确保这个路径是正确的
          url: "/pages/companion-form/companion-form"
        });
      }
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", null, [
      vue.createElementVNode("view", { class: "global-bg" }),
      vue.createElementVNode("view", { class: "header-container" }, [
        vue.createElementVNode("text", { class: "app-title" }, "Sona"),
        vue.createElementVNode("view", {
          class: "top-menu-button",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.toggleMenu && $options.toggleMenu(...args))
        }, [
          vue.createElementVNode("image", {
            class: "menu-icon",
            src: _imports_0$2
          })
        ])
      ]),
      vue.createElementVNode(
        "view",
        {
          class: vue.normalizeClass(["popup-menu", { show: $data.isMenuShow }])
        },
        [
          vue.createElementVNode("view", {
            class: "menu-item",
            onClick: _cache[1] || (_cache[1] = (...args) => $options.goToAddCompanion && $options.goToAddCompanion(...args))
          }, [
            vue.createElementVNode("image", {
              class: "menu-item-icon",
              src: _imports_0$2
            }),
            vue.createElementVNode("text", { class: "menu-item-text" }, "添加AI伙伴")
          ])
        ],
        2
        /* CLASS */
      ),
      $data.isMenuShow ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "menu-overlay",
        onClick: _cache[2] || (_cache[2] = (...args) => $options.toggleMenu && $options.toggleMenu(...args))
      })) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("view", { class: "container" }, [
        $data.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "loading-container"
        }, [
          vue.createElementVNode("text", null, "正在加载...")
        ])) : (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "contact-list"
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.companionList, (item) => {
              return vue.openBlock(), vue.createElementBlock("navigator", {
                key: item.id,
                class: "contact-item",
                url: "/pages/chat/chat?id=" + item.id + "&name=" + item.name + "&avatar=" + (item.src || "/static/images/default-avatar.png"),
                "hover-class": "none"
              }, [
                vue.createElementVNode("image", {
                  class: "avatar",
                  mode: "aspectFill",
                  src: item.src || "/static/images/default-avatar.png"
                }, null, 8, ["src"]),
                vue.createElementVNode("view", { class: "info" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "name" },
                    vue.toDisplayString(item.name),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "description" },
                    vue.toDisplayString(item.description),
                    1
                    /* TEXT */
                  )
                ])
              ], 8, ["url"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])),
        !$data.isLoading && $data.companionList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "empty-container"
        }, [
          vue.createElementVNode("text", null, '你还没有创建任何 AI 伙伴，点击左上角 "+" 创建你的第一个AI伙伴吧')
        ])) : vue.createCommentVNode("v-if", true)
      ])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/index/index.vue"]]);
  function getMessages(companionId) {
    return request({
      // 后端定义的正确路径是 GET /api/v1/chat/messages/{companion_id}
      url: `/api/v1/chat/messages/${companionId}`,
      method: "get"
    });
  }
  const _imports_0$1 = "/static/images/back-arrow-icon.png";
  const _imports_0 = "/static/images/right-arrow-icon.png";
  const _sfc_main$4 = {
    data() {
      return {
        companionId: null,
        companionAvatar: "",
        companionName: "",
        userAvatar: "/static/images/user-avatar.png",
        messages: [],
        inputValue: "",
        isSending: false,
        socketOpen: false,
        socketTask: null,
        scrollTop: 99999,
        // 初始滚动到底部
        // 动态计算的高度
        statusBarHeight: 0,
        navBarHeight: 0,
        inputBarHeight: 50
        // 输入框初始高度
      };
    },
    onLoad(options) {
      if (!options.id) {
        uni.showToast({ title: "参数错误", icon: "none", duration: 2e3, success: () => setTimeout(() => uni.navigateBack(), 2e3) });
        return;
      }
      this.companionId = options.id;
      this.companionName = options.name || "聊天";
      this.companionAvatar = options.avatar || "/static/images/default-avatar.png";
      this.calculateHeights();
      this.loadHistoryMessages();
      this.connectWebSocket();
    },
    onReady() {
      this.calculateInputBarHeight();
    },
    onUnload() {
      this.closeWebSocket();
      const app = getApp();
      if (app && app.event) {
        app.event.off("companionUpdated", this.handleCompanionUpdate);
      }
    },
    methods: {
      // 动态计算各种高度，适配不同机型
      calculateHeights() {
        const systemInfo = uni.getSystemInfoSync();
        this.statusBarHeight = systemInfo.statusBarHeight;
        this.navBarHeight = systemInfo.statusBarHeight + 44;
      },
      calculateInputBarHeight() {
        const query = uni.createSelectorQuery().in(this);
        query.select("#input-bar-container").boundingClientRect((data) => {
          if (data) {
            this.inputBarHeight = data.height;
          }
        }).exec();
      },
      // --- 数据加载 ---
      async loadHistoryMessages() {
        uni.showLoading({ title: "加载记录中..." });
        try {
          const history = await getMessages(this.companionId);
          this.messages = this.processMessages(history);
        } catch (err) {
          formatAppLog("error", "at pages/chat/chat.vue:141", "加载历史消息失败", err);
          uni.showToast({ title: "加载历史失败", icon: "none" });
        } finally {
          uni.hideLoading();
          this.$nextTick(() => this.scrollToBottom());
        }
      },
      // --- WebSocket 核心逻辑 ---
      connectWebSocket() {
        const token = getToken();
        if (!token) {
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }
        const wsUrl = `ws://120.53.230.215:8000/api/v1/chat/ws/${this.companionId}?token=${encodeURIComponent(token)}`;
        this.socketTask = uni.connectSocket({
          url: wsUrl,
          success: () => {
          },
          // success回调在H5平台无用
          fail: (err) => {
            formatAppLog("error", "at pages/chat/chat.vue:165", "WebSocket 连接失败", err);
            uni.showToast({ title: "连接聊天服务器失败", icon: "none" });
          }
        });
        this.onWebSocketEvents();
      },
      onWebSocketEvents() {
        this.socketTask.onOpen(() => {
          formatAppLog("log", "at pages/chat/chat.vue:173", "WebSocket 连接成功");
          this.socketOpen = true;
        });
        this.socketTask.onClose(() => {
          formatAppLog("log", "at pages/chat/chat.vue:177", "WebSocket 连接关闭");
          this.socketOpen = false;
          this.isSending = false;
        });
        this.socketTask.onError((err) => {
          formatAppLog("error", "at pages/chat/chat.vue:182", "WebSocket 连接出错", err);
          this.socketOpen = false;
          this.isSending = false;
          uni.showToast({ title: "连接已断开", icon: "none" });
        });
        this.socketTask.onMessage((res) => {
          const receivedText = res.data;
          if (receivedText === "[END_OF_STREAM]") {
            this.isSending = false;
            const lastMsg2 = this.messages[this.messages.length - 1];
            if (lastMsg2 && lastMsg2.role === "ai") {
              lastMsg2.done = true;
            }
            return;
          }
          if (receivedText.startsWith("[ERROR]")) {
            uni.showToast({ title: "AI 思考时出错了", icon: "none" });
            this.isSending = false;
            return;
          }
          const lastMsg = this.messages[this.messages.length - 1];
          if (lastMsg && lastMsg.role === "ai" && !lastMsg.done) {
            lastMsg.content += receivedText;
          } else {
            const newAiMessage = { role: "ai", content: receivedText, done: false, created_at: (/* @__PURE__ */ new Date()).toISOString() };
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
        if (!content || this.isSending || !this.socketOpen)
          return;
        const userMessage = { role: "user", content, created_at: (/* @__PURE__ */ new Date()).toISOString() };
        this.messages = this.processMessages([userMessage], this.messages);
        this.socketTask.send({ data: content });
        this.inputValue = "";
        this.isSending = true;
        this.$nextTick(() => this.scrollToBottom());
      },
      // --- 导航 ---
      navigateBack() {
        uni.navigateBack();
      },
      navigateToSettings() {
        uni.navigateTo({
          url: `/pages/knowledge-base/knowledge-base?id=${this.companionId}&name=${this.companionName}`
        });
      },
      // --- 工具函数 ---
      scrollToBottom() {
        this.$nextTick(() => {
          uni.createSelectorQuery().in(this).select("#message-list").boundingClientRect((rect) => {
            if (rect) {
              this.scrollTop = rect.height;
            }
          }).exec();
        });
      },
      processMessages(newMessages, existingMessages = []) {
        let lastTimestamp = existingMessages.length > 0 ? new Date(existingMessages[existingMessages.length - 1].created_at).getTime() : 0;
        const tenMinutes = 10 * 60 * 1e3;
        newMessages.forEach((msg) => {
          msg._id = msg.id || msg.role + "_" + Date.now() + Math.random();
          const currentTimestamp = new Date(msg.created_at).getTime();
          if (currentTimestamp - lastTimestamp > tenMinutes) {
            msg.displayTime = this.formatDisplayTime(currentTimestamp);
          } else {
            msg.displayTime = null;
          }
          lastTimestamp = currentTimestamp;
          msg.done = msg.done === void 0 ? true : msg.done;
        });
        return [...existingMessages, ...newMessages];
      },
      formatDisplayTime(timestamp) {
        const date = new Date(timestamp);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = ("0" + date.getHours()).slice(-2);
        const minute = ("0" + date.getMinutes()).slice(-2);
        return `${month}月${day}日 ${hour}:${minute}`;
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "chat-page" }, [
      vue.createElementVNode(
        "view",
        {
          class: "custom-nav-bar",
          style: vue.normalizeStyle({ paddingTop: $data.statusBarHeight + "px" })
        },
        [
          vue.createElementVNode("view", { class: "nav-bar-content" }, [
            vue.createElementVNode("view", {
              class: "back-button",
              onClick: _cache[0] || (_cache[0] = (...args) => $options.navigateBack && $options.navigateBack(...args))
            }, [
              vue.createElementVNode("image", {
                class: "back-icon",
                src: _imports_0$1
              })
            ]),
            vue.createElementVNode("view", {
              class: "title-container",
              onClick: _cache[1] || (_cache[1] = (...args) => $options.navigateToSettings && $options.navigateToSettings(...args))
            }, [
              vue.createElementVNode(
                "text",
                { class: "nav-bar-title" },
                vue.toDisplayString($data.companionName),
                1
                /* TEXT */
              ),
              vue.createElementVNode("image", {
                class: "settings-entry-icon",
                src: _imports_0
              })
            ])
          ])
        ],
        4
        /* STYLE */
      ),
      vue.createElementVNode("view", { class: "global-bg" }),
      vue.createElementVNode("scroll-view", {
        class: "chat-container",
        style: vue.normalizeStyle({ paddingTop: $data.navBarHeight + "px", paddingBottom: $data.inputBarHeight + "px" }),
        "scroll-y": true,
        "scroll-top": $data.scrollTop,
        "scroll-with-animation": true
      }, [
        vue.createElementVNode("view", {
          class: "message-list",
          id: "message-list"
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.messages, (item) => {
              return vue.openBlock(), vue.createElementBlock(
                vue.Fragment,
                {
                  key: item._id
                },
                [
                  item.displayTime ? (vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: 0,
                      class: "time-stamp"
                    },
                    vue.toDisplayString(item.displayTime),
                    1
                    /* TEXT */
                  )) : vue.createCommentVNode("v-if", true),
                  vue.createElementVNode(
                    "view",
                    {
                      class: vue.normalizeClass(["message-item", item.role === "user" ? "user-message" : "ai-message"])
                    },
                    [
                      item.role === "ai" ? (vue.openBlock(), vue.createElementBlock("image", {
                        key: 0,
                        class: "avatar",
                        src: $data.companionAvatar
                      }, null, 8, ["src"])) : vue.createCommentVNode("v-if", true),
                      item.role === "user" ? (vue.openBlock(), vue.createElementBlock("image", {
                        key: 1,
                        class: "avatar",
                        src: $data.userAvatar
                      }, null, 8, ["src"])) : vue.createCommentVNode("v-if", true),
                      vue.createElementVNode("view", { class: "message-content" }, [
                        vue.createElementVNode(
                          "text",
                          { selectable: true },
                          vue.toDisplayString(item.content),
                          1
                          /* TEXT */
                        ),
                        item.role === "ai" && !item.done ? (vue.openBlock(), vue.createElementBlock("view", {
                          key: 0,
                          class: "cursor"
                        })) : vue.createCommentVNode("v-if", true)
                      ])
                    ],
                    2
                    /* CLASS */
                  )
                ],
                64
                /* STABLE_FRAGMENT */
              );
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ], 12, ["scroll-top"]),
      vue.createElementVNode("view", {
        class: "input-bar-container",
        id: "input-bar-container"
      }, [
        vue.createElementVNode("view", { class: "input-bar" }, [
          vue.withDirectives(vue.createElementVNode("input", {
            class: "input-field",
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.inputValue = $event),
            placeholder: "说点什么吧...",
            "confirm-type": "send",
            onConfirm: _cache[3] || (_cache[3] = (...args) => $options.sendMessage && $options.sendMessage(...args)),
            disabled: $data.isSending,
            "adjust-position": false,
            "cursor-spacing": "20"
          }, null, 40, ["disabled"]), [
            [vue.vModelText, $data.inputValue]
          ]),
          vue.createElementVNode("button", {
            class: "send-button",
            onClick: _cache[4] || (_cache[4] = (...args) => $options.sendMessage && $options.sendMessage(...args)),
            disabled: $data.isSending || !$data.inputValue.trim()
          }, "发送", 8, ["disabled"])
        ])
      ])
    ]);
  }
  const PagesChatChat = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/chat/chat.vue"]]);
  const _sfc_main$3 = {
    data() {
      return {
        form: {
          id: null,
          name: "",
          description: "",
          instructions: "",
          seed: "",
          src: "",
          gender: "NONE"
        },
        mode: "create",
        isSubmitting: false
      };
    },
    onLoad(options) {
      if (options.mode === "edit" && options.id) {
        this.mode = "edit";
        this.form.id = options.id;
        uni.setNavigationBarTitle({ title: "编辑伙伴" });
        this.loadCompanionData(options.id);
      } else {
        this.mode = "create";
        this.form = { id: null, name: "", description: "一个新建的AI伙伴", instructions: "", seed: "", src: "", gender: "NONE" };
        uni.setNavigationBarTitle({ title: "创建新的AI伙伴" });
      }
      चींटी(Chīṇṭī);
    },
    methods: {
      async loadCompanionData(companionId) {
        uni.showLoading({ title: "加载数据..." });
        try {
          const companionData = await getCompanionById(companionId);
          this.form = companionData;
        } catch (err) {
          uni.showToast({ title: "加载失败", icon: "none" });
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
          sizeType: ["compressed"],
          sourceType: ["album", "camera"],
          success: (res) => {
            const tempFilePath = res.tempFilePaths[0];
            this.form.src = tempFilePath;
            uni.showToast({ title: "头像上传成功(演示)", icon: "none" });
          }
        });
      },
      onGenderChange(e) {
        this.form.gender = e.detail.value;
      },
      async handleSubmit() {
        const app = getApp();
        if (this.isSubmitting)
          return;
        if (!this.form.name || !this.form.instructions) {
          uni.showToast({ title: "昵称和角色设定不能为空", icon: "none" });
          return;
        }
        const dataToSubmit = {
          name: this.form.name,
          description: this.form.description,
          instructions: this.form.instructions,
          seed: this.form.seed || `我是${this.form.name}，很高兴认识你！`,
          src: this.form.src
          // gender 字段后端 companion schema 中没有，暂时不提交
        };
        this.isSubmitting = true;
        uni.showLoading({ title: "正在保存..." });
        try {
          if (this.mode === "edit") {
            await updateCompanion(this.form.id, dataToSubmit);
          } else {
            await createCompanion(dataToSubmit);
          }
          uni.showToast({ title: "保存成功！", icon: "success" });
          if (app && app.event && typeof app.event.emit === "function") {
            app.event.emit("companionsUpdated");
          }
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        } catch (err) {
          formatAppLog("error", "at pages/companion-form/companion-form.vue:174", "保存伙伴失败", err);
          uni.showToast({ title: "保存失败", icon: "none" });
        } finally {
          uni.hideLoading();
          this.isSubmitting = false;
        }
      }
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "form-container" }, [
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "form-label" }, "伙伴头像"),
        vue.createElementVNode("image", {
          class: "avatar-uploader",
          src: $data.form.src || "/static/images/default-avatar.png",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.chooseAvatar && $options.chooseAvatar(...args)),
          mode: "aspectFill"
        }, null, 8, ["src"])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "form-label" }, "伙伴昵称"),
        vue.createElementVNode("input", {
          class: "form-input",
          placeholder: "给你的伙伴起个名字",
          value: $data.form.name,
          onInput: _cache[1] || (_cache[1] = ($event) => $options.handleInput($event, "name"))
        }, null, 40, ["value"])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "form-label" }, "伙伴性别"),
        vue.createElementVNode(
          "radio-group",
          {
            class: "form-radio-group",
            onChange: _cache[2] || (_cache[2] = (...args) => $options.onGenderChange && $options.onGenderChange(...args))
          },
          [
            vue.createElementVNode("label", { class: "radio" }, [
              vue.createElementVNode("radio", {
                value: "MALE",
                checked: $data.form.gender === "MALE"
              }, null, 8, ["checked"]),
              vue.createTextVNode("男 ")
            ]),
            vue.createElementVNode("label", { class: "radio" }, [
              vue.createElementVNode("radio", {
                value: "FEMALE",
                checked: $data.form.gender === "FEMALE"
              }, null, 8, ["checked"]),
              vue.createTextVNode("女 ")
            ]),
            vue.createElementVNode("label", { class: "radio" }, [
              vue.createElementVNode("radio", {
                value: "NONE",
                checked: $data.form.gender === "NONE"
              }, null, 8, ["checked"]),
              vue.createTextVNode("保密 ")
            ])
          ],
          32
          /* NEED_HYDRATION */
        )
      ]),
      vue.createElementVNode("view", { class: "form-item column" }, [
        vue.createElementVNode("text", { class: "form-label" }, "角色设定 (Instructions)"),
        vue.createElementVNode("view", { class: "textarea-wrapper" }, [
          vue.createElementVNode("textarea", {
            class: "scroll-textarea",
            value: $data.form.instructions,
            placeholder: "简短描述角色的性格/背景/说话风格（建议 50-300 字）",
            "show-count": true,
            maxlength: 1e3,
            onInput: _cache[3] || (_cache[3] = ($event) => $options.handleInput($event, "instructions")),
            "adjust-position": true
          }, null, 40, ["value"])
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item column" }, [
        vue.createElementVNode("text", { class: "form-label" }, "示例对话 (Seed)"),
        vue.createElementVNode("view", { class: "textarea-wrapper" }, [
          vue.createElementVNode("textarea", {
            class: "scroll-textarea",
            value: $data.form.seed,
            placeholder: "角色与用户的一个小对话示例（建议 20-100 字）",
            "show-count": true,
            maxlength: 500,
            onInput: _cache[4] || (_cache[4] = ($event) => $options.handleInput($event, "seed")),
            "adjust-position": true
          }, null, 40, ["value"])
        ])
      ]),
      vue.createElementVNode("button", {
        class: "submit-btn",
        onClick: _cache[5] || (_cache[5] = (...args) => $options.handleSubmit && $options.handleSubmit(...args)),
        disabled: $data.isSubmitting
      }, "保存伙伴", 8, ["disabled"])
    ]);
  }
  const PagesCompanionFormCompanionForm = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/companion-form/companion-form.vue"]]);
  const baseUrl = "https://your-backend-api-url.com/api/v1";
  function getKnowledgeFiles(companionId) {
    return request({
      // 后端定义的正确路径是 /api/v1/companions/{companion_id}/knowledge
      url: `/api/v1/companions/${companionId}/knowledge`,
      method: "get"
    });
  }
  function uploadKnowledgeFile(companionId, filePath) {
    const token = getToken();
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: `${baseUrl}/api/v1/companions/${companionId}/knowledge`,
        filePath,
        name: "file",
        // 这个 'file' 必须和后端 FastAPI.File(...) 的参数名一致
        header: {
          "Authorization": `Bearer ${token}`
        },
        success: (uploadRes) => {
          if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
            resolve(JSON.parse(uploadRes.data));
          } else {
            reject(uploadRes);
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }
  function deleteKnowledgeFile(fileId) {
    return request({
      url: `/api/v1/knowledge/${fileId}`,
      method: "delete"
    });
  }
  const _sfc_main$2 = {
    data() {
      return {
        companionId: null,
        files: [],
        isUploading: false,
        isLoading: true
        // 新增一个加载状态
      };
    },
    onLoad(options) {
      this.companionId = options.id;
      uni.setNavigationBarTitle({ title: "知识库管理" });
    },
    onShow() {
      this.fetchFiles();
    },
    methods: {
      // --- 1. 数据获取与删除 (已连接真实API) ---
      async fetchFiles() {
        if (!this.companionId)
          return;
        this.isLoading = true;
        try {
          const fileList = await getKnowledgeFiles(this.companionId);
          this.files = fileList;
        } catch (err) {
          formatAppLog("error", "at pages/companion-settings/companion-settings.vue:48", "获取文件列表失败", err);
          uni.showToast({ title: "获取列表失败", icon: "none" });
        } finally {
          this.isLoading = false;
        }
      },
      confirmDelete(file) {
        uni.showModal({
          title: "确认删除",
          content: `确定要删除文件 "${file.file_name}" 吗？`,
          confirmText: "删除",
          confirmColor: "#fa5151",
          success: (res) => {
            if (res.confirm) {
              this.deleteFile(file.id);
            }
          }
        });
      },
      async deleteFile(fileId) {
        uni.showLoading({ title: "删除中..." });
        try {
          await deleteKnowledgeFile(fileId);
          uni.showToast({ title: "删除成功", icon: "success" });
          this.fetchFiles();
        } catch (err) {
          formatAppLog("error", "at pages/companion-settings/companion-settings.vue:74", "删除失败", err);
          uni.showToast({ title: "删除失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      // --- 2. 兼容多平台的文件选择逻辑 (最终版) ---
      async chooseAndUploadFile() {
        try {
          const res = await new Promise((resolve, reject) => {
            uni.chooseFile({
              count: 1,
              type: "all",
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
          if (e.errMsg && e.errMsg.indexOf("cancel") === -1) {
            formatAppLog("warn", "at pages/companion-settings/companion-settings.vue:102", "uni.chooseFile API调用失败，可能是当前环境不支持。错误:", e);
          }
        }
        uni.showToast({ title: "当前环境不支持文件选择", icon: "none" });
      },
      // --- 3. 统一的上传处理函数 (已连接真实API) ---
      async uploadFile(fileOrPath) {
        this.isUploading = true;
        uni.showLoading({ title: "上传中..." });
        try {
          await uploadKnowledgeFile(this.companionId, fileOrPath);
          uni.showToast({ title: "上传成功，后台处理中...", icon: "success" });
          setTimeout(() => {
            this.fetchFiles();
          }, 2e3);
        } catch (err) {
          formatAppLog("error", "at pages/companion-settings/companion-settings.vue:140", "上传失败", err);
          uni.showToast({ title: "上传失败", icon: "none" });
        } finally {
          this.isUploading = false;
          uni.hideLoading();
        }
      },
      formatStatus(status) {
        const statusMap = { "UPLOADED": "已上传", "PROCESSING": "处理中", "INDEXED": "已索引", "FAILED": "失败" };
        return statusMap[status] || status;
      }
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "file-list-container" }, [
        !$data.isLoading && $data.files.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "file-list"
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.files, (file) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: file.id,
                class: "file-item"
              }, [
                vue.createElementVNode("view", { class: "file-info" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "file-name" },
                    vue.toDisplayString(file.file_name),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    {
                      class: vue.normalizeClass(["file-status", [file.status]])
                    },
                    vue.toDisplayString($options.formatStatus(file.status)),
                    3
                    /* TEXT, CLASS */
                  )
                ]),
                vue.createElementVNode("button", {
                  class: "delete-btn",
                  size: "mini",
                  onClick: ($event) => $options.confirmDelete(file)
                }, "删除", 8, ["onClick"])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : vue.createCommentVNode("v-if", true),
        !$data.isLoading && $data.files.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "empty-tip"
        }, "知识库为空，请上传文件")) : vue.createCommentVNode("v-if", true),
        $data.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "loading-tip"
        }, "正在加载文件列表...")) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createElementVNode("button", {
        class: "upload-btn",
        onClick: _cache[0] || (_cache[0] = (...args) => $options.chooseAndUploadFile && $options.chooseAndUploadFile(...args)),
        loading: $data.isUploading
      }, "上传新文件", 8, ["loading"])
    ]);
  }
  const PagesCompanionSettingsCompanionSettings = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-021beadd"], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/companion-settings/companion-settings.vue"]]);
  const _sfc_main$1 = {
    data() {
      return {
        companionId: null,
        companionName: ""
      };
    },
    onLoad(options) {
      if (!options.id) {
        uni.showToast({ title: "参数错误", icon: "none" });
        uni.navigateBack();
        return;
      }
      this.companionId = options.id;
      this.companionName = options.name || "";
    },
    methods: {
      navigateToKnowledgeSettings() {
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
        const companionName = this.companionName;
        uni.showModal({
          title: "请再次确认",
          content: `确定要永久删除 "${companionName}" 吗？所有相关数据都将被彻底清除且无法恢复。`,
          confirmText: "确定删除",
          confirmColor: "#fa5151",
          success: (res) => {
            if (res.confirm)
              this.performDelete();
          }
        });
      },
      async performDelete() {
        const app = getApp();
        const companionId = this.companionId;
        uni.showLoading({ title: "正在删除...", mask: true });
        try {
          const result = await deleteCompanion(companionId);
          uni.showToast({ title: result.message || "删除成功", icon: "success" });
          if (app && app.event && typeof app.event.emit === "function") {
            app.event.emit("companionsUpdated");
          }
          setTimeout(() => uni.reLaunch({ url: "/pages/index/index" }), 2e3);
        } catch (err) {
          formatAppLog("error", "at pages/knowledge-base/knowledge-base.vue:88", "删除伙伴时发生前端错误", err);
          uni.showToast({ title: "删除失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      }
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", null, [
      vue.createElementVNode("view", { class: "settings-container" }, [
        vue.createElementVNode("view", { class: "menu-group" }, [
          vue.createElementVNode("view", {
            class: "menu-item",
            onClick: _cache[0] || (_cache[0] = (...args) => $options.navigateToKnowledgeSettings && $options.navigateToKnowledgeSettings(...args))
          }, [
            vue.createElementVNode("text", { class: "menu-label" }, "知识库管理"),
            vue.createElementVNode("image", {
              class: "arrow-icon",
              src: _imports_0
            })
          ]),
          vue.createElementVNode("view", {
            class: "menu-item",
            onClick: _cache[1] || (_cache[1] = (...args) => $options.navigateToEditPersona && $options.navigateToEditPersona(...args))
          }, [
            vue.createElementVNode("text", { class: "menu-label" }, "修改人设"),
            vue.createElementVNode("image", {
              class: "arrow-icon",
              src: _imports_0
            })
          ])
        ])
      ]),
      vue.createElementVNode("view", { class: "danger-zone" }, [
        vue.createElementVNode("view", { class: "danger-zone-title" }, "危险操作"),
        vue.createElementVNode("button", {
          class: "delete-button",
          type: "warn",
          onClick: _cache[2] || (_cache[2] = (...args) => $options.onDeleteCompanion && $options.onDeleteCompanion(...args))
        }, "删除此AI伙伴"),
        vue.createElementVNode("view", { class: "danger-zone-tip" }, "此操作将永久删除伙伴的所有数据，包括聊天记录和知识库，且无法恢复。")
      ])
    ]);
  }
  const PagesKnowledgeBaseKnowledgeBase = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/knowledge-base/knowledge-base.vue"]]);
  __definePage("pages/login/login", PagesLoginLogin);
  __definePage("pages/register/register", PagesRegisterRegister);
  __definePage("pages/index/index", PagesIndexIndex);
  __definePage("pages/chat/chat", PagesChatChat);
  __definePage("pages/companion-form/companion-form", PagesCompanionFormCompanionForm);
  __definePage("pages/companion-settings/companion-settings", PagesCompanionSettingsCompanionSettings);
  __definePage("pages/knowledge-base/knowledge-base", PagesKnowledgeBaseKnowledgeBase);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "D:/HBuilderX/项目/ai情感陪伴/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
