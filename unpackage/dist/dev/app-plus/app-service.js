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
  const global2 = uni.requireGlobal();
  ArrayBuffer = global2.ArrayBuffer;
  Int8Array = global2.Int8Array;
  Uint8Array = global2.Uint8Array;
  Uint8ClampedArray = global2.Uint8ClampedArray;
  Int16Array = global2.Int16Array;
  Uint16Array = global2.Uint16Array;
  Int32Array = global2.Int32Array;
  Uint32Array = global2.Uint32Array;
  Float32Array = global2.Float32Array;
  Float64Array = global2.Float64Array;
  BigInt64Array = global2.BigInt64Array;
  BigUint64Array = global2.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  const ON_SHOW = "onShow";
  const ON_LOAD = "onLoad";
  const ON_UNLOAD = "onUnload";
  const ON_PULL_DOWN_REFRESH = "onPullDownRefresh";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  function resolveEasycom(component, easycom) {
    return typeof component === "string" ? easycom : component;
  }
  const createLifeCycleHook = (lifecycle, flag = 0) => (hook, target = vue.getCurrentInstance()) => {
    !vue.isInSSRComponentSetup && vue.injectHook(lifecycle, hook, target);
  };
  const onShow = /* @__PURE__ */ createLifeCycleHook(
    ON_SHOW,
    1 | 2
    /* HookFlags.PAGE */
  );
  const onLoad = /* @__PURE__ */ createLifeCycleHook(
    ON_LOAD,
    2
    /* HookFlags.PAGE */
  );
  const onUnload = /* @__PURE__ */ createLifeCycleHook(
    ON_UNLOAD,
    2
    /* HookFlags.PAGE */
  );
  const onPullDownRefresh = /* @__PURE__ */ createLifeCycleHook(
    ON_PULL_DOWN_REFRESH,
    2
    /* HookFlags.PAGE */
  );
  var isVue2 = false;
  function set(target, key, val) {
    if (Array.isArray(target)) {
      target.length = Math.max(target.length, key);
      target.splice(key, 1, val);
      return val;
    }
    target[key] = val;
    return val;
  }
  function del(target, key) {
    if (Array.isArray(target)) {
      target.splice(key, 1);
      return;
    }
    delete target[key];
  }
  function getDevtoolsGlobalHook() {
    return getTarget().__VUE_DEVTOOLS_GLOBAL_HOOK__;
  }
  function getTarget() {
    return typeof navigator !== "undefined" && typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {};
  }
  const isProxyAvailable = typeof Proxy === "function";
  const HOOK_SETUP = "devtools-plugin:setup";
  const HOOK_PLUGIN_SETTINGS_SET = "plugin:settings:set";
  let supported;
  let perf;
  function isPerformanceSupported() {
    var _a;
    if (supported !== void 0) {
      return supported;
    }
    if (typeof window !== "undefined" && window.performance) {
      supported = true;
      perf = window.performance;
    } else if (typeof global !== "undefined" && ((_a = global.perf_hooks) === null || _a === void 0 ? void 0 : _a.performance)) {
      supported = true;
      perf = global.perf_hooks.performance;
    } else {
      supported = false;
    }
    return supported;
  }
  function now() {
    return isPerformanceSupported() ? perf.now() : Date.now();
  }
  class ApiProxy {
    constructor(plugin, hook) {
      this.target = null;
      this.targetQueue = [];
      this.onQueue = [];
      this.plugin = plugin;
      this.hook = hook;
      const defaultSettings = {};
      if (plugin.settings) {
        for (const id in plugin.settings) {
          const item = plugin.settings[id];
          defaultSettings[id] = item.defaultValue;
        }
      }
      const localSettingsSaveId = `__vue-devtools-plugin-settings__${plugin.id}`;
      let currentSettings = Object.assign({}, defaultSettings);
      try {
        const raw = localStorage.getItem(localSettingsSaveId);
        const data = JSON.parse(raw);
        Object.assign(currentSettings, data);
      } catch (e) {
      }
      this.fallbacks = {
        getSettings() {
          return currentSettings;
        },
        setSettings(value) {
          try {
            localStorage.setItem(localSettingsSaveId, JSON.stringify(value));
          } catch (e) {
          }
          currentSettings = value;
        },
        now() {
          return now();
        }
      };
      if (hook) {
        hook.on(HOOK_PLUGIN_SETTINGS_SET, (pluginId, value) => {
          if (pluginId === this.plugin.id) {
            this.fallbacks.setSettings(value);
          }
        });
      }
      this.proxiedOn = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target.on[prop];
          } else {
            return (...args) => {
              this.onQueue.push({
                method: prop,
                args
              });
            };
          }
        }
      });
      this.proxiedTarget = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target[prop];
          } else if (prop === "on") {
            return this.proxiedOn;
          } else if (Object.keys(this.fallbacks).includes(prop)) {
            return (...args) => {
              this.targetQueue.push({
                method: prop,
                args,
                resolve: () => {
                }
              });
              return this.fallbacks[prop](...args);
            };
          } else {
            return (...args) => {
              return new Promise((resolve) => {
                this.targetQueue.push({
                  method: prop,
                  args,
                  resolve
                });
              });
            };
          }
        }
      });
    }
    async setRealTarget(target) {
      this.target = target;
      for (const item of this.onQueue) {
        this.target.on[item.method](...item.args);
      }
      for (const item of this.targetQueue) {
        item.resolve(await this.target[item.method](...item.args));
      }
    }
  }
  function setupDevtoolsPlugin(pluginDescriptor, setupFn) {
    const descriptor = pluginDescriptor;
    const target = getTarget();
    const hook = getDevtoolsGlobalHook();
    const enableProxy = isProxyAvailable && descriptor.enableEarlyProxy;
    if (hook && (target.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !enableProxy)) {
      hook.emit(HOOK_SETUP, pluginDescriptor, setupFn);
    } else {
      const proxy = enableProxy ? new ApiProxy(descriptor, hook) : null;
      const list = target.__VUE_DEVTOOLS_PLUGINS__ = target.__VUE_DEVTOOLS_PLUGINS__ || [];
      list.push({
        pluginDescriptor: descriptor,
        setupFn,
        proxy
      });
      if (proxy)
        setupFn(proxy.proxiedTarget);
    }
  }
  /*!
   * pinia v2.1.7
   * (c) 2023 Eduardo San Martin Morote
   * @license MIT
   */
  let activePinia;
  const setActivePinia = (pinia) => activePinia = pinia;
  const getActivePinia = () => vue.hasInjectionContext() && vue.inject(piniaSymbol) || activePinia;
  const piniaSymbol = Symbol("pinia");
  function isPlainObject(o) {
    return o && typeof o === "object" && Object.prototype.toString.call(o) === "[object Object]" && typeof o.toJSON !== "function";
  }
  var MutationType;
  (function(MutationType2) {
    MutationType2["direct"] = "direct";
    MutationType2["patchObject"] = "patch object";
    MutationType2["patchFunction"] = "patch function";
  })(MutationType || (MutationType = {}));
  const IS_CLIENT = typeof window !== "undefined";
  const USE_DEVTOOLS = IS_CLIENT;
  const _global = /* @__PURE__ */ (() => typeof window === "object" && window.window === window ? window : typeof self === "object" && self.self === self ? self : typeof global === "object" && global.global === global ? global : typeof globalThis === "object" ? globalThis : { HTMLElement: null })();
  function bom(blob, { autoBom = false } = {}) {
    if (autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
      return new Blob([String.fromCharCode(65279), blob], { type: blob.type });
    }
    return blob;
  }
  function download(url, name, opts) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.onload = function() {
      saveAs(xhr.response, name, opts);
    };
    xhr.onerror = function() {
      console.error("could not download file");
    };
    xhr.send();
  }
  function corsEnabled(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, false);
    try {
      xhr.send();
    } catch (e) {
    }
    return xhr.status >= 200 && xhr.status <= 299;
  }
  function click(node) {
    try {
      node.dispatchEvent(new MouseEvent("click"));
    } catch (e) {
      const evt = document.createEvent("MouseEvents");
      evt.initMouseEvent("click", true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);
      node.dispatchEvent(evt);
    }
  }
  const _navigator = typeof navigator === "object" ? navigator : { userAgent: "" };
  const isMacOSWebView = /* @__PURE__ */ (() => /Macintosh/.test(_navigator.userAgent) && /AppleWebKit/.test(_navigator.userAgent) && !/Safari/.test(_navigator.userAgent))();
  const saveAs = !IS_CLIENT ? () => {
  } : (
    // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView or mini program
    typeof HTMLAnchorElement !== "undefined" && "download" in HTMLAnchorElement.prototype && !isMacOSWebView ? downloadSaveAs : (
      // Use msSaveOrOpenBlob as a second approach
      "msSaveOrOpenBlob" in _navigator ? msSaveAs : (
        // Fallback to using FileReader and a popup
        fileSaverSaveAs
      )
    )
  );
  function downloadSaveAs(blob, name = "download", opts) {
    const a = document.createElement("a");
    a.download = name;
    a.rel = "noopener";
    if (typeof blob === "string") {
      a.href = blob;
      if (a.origin !== location.origin) {
        if (corsEnabled(a.href)) {
          download(blob, name, opts);
        } else {
          a.target = "_blank";
          click(a);
        }
      } else {
        click(a);
      }
    } else {
      a.href = URL.createObjectURL(blob);
      setTimeout(function() {
        URL.revokeObjectURL(a.href);
      }, 4e4);
      setTimeout(function() {
        click(a);
      }, 0);
    }
  }
  function msSaveAs(blob, name = "download", opts) {
    if (typeof blob === "string") {
      if (corsEnabled(blob)) {
        download(blob, name, opts);
      } else {
        const a = document.createElement("a");
        a.href = blob;
        a.target = "_blank";
        setTimeout(function() {
          click(a);
        });
      }
    } else {
      navigator.msSaveOrOpenBlob(bom(blob, opts), name);
    }
  }
  function fileSaverSaveAs(blob, name, opts, popup) {
    popup = popup || open("", "_blank");
    if (popup) {
      popup.document.title = popup.document.body.innerText = "downloading...";
    }
    if (typeof blob === "string")
      return download(blob, name, opts);
    const force = blob.type === "application/octet-stream";
    const isSafari = /constructor/i.test(String(_global.HTMLElement)) || "safari" in _global;
    const isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent);
    if ((isChromeIOS || force && isSafari || isMacOSWebView) && typeof FileReader !== "undefined") {
      const reader = new FileReader();
      reader.onloadend = function() {
        let url = reader.result;
        if (typeof url !== "string") {
          popup = null;
          throw new Error("Wrong reader.result type");
        }
        url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, "data:attachment/file;");
        if (popup) {
          popup.location.href = url;
        } else {
          location.assign(url);
        }
        popup = null;
      };
      reader.readAsDataURL(blob);
    } else {
      const url = URL.createObjectURL(blob);
      if (popup)
        popup.location.assign(url);
      else
        location.href = url;
      popup = null;
      setTimeout(function() {
        URL.revokeObjectURL(url);
      }, 4e4);
    }
  }
  function toastMessage(message, type) {
    const piniaMessage = "🍍 " + message;
    if (typeof __VUE_DEVTOOLS_TOAST__ === "function") {
      __VUE_DEVTOOLS_TOAST__(piniaMessage, type);
    } else if (type === "error") {
      console.error(piniaMessage);
    } else if (type === "warn") {
      console.warn(piniaMessage);
    } else {
      console.log(piniaMessage);
    }
  }
  function isPinia(o) {
    return "_a" in o && "install" in o;
  }
  function checkClipboardAccess() {
    if (!("clipboard" in navigator)) {
      toastMessage(`Your browser doesn't support the Clipboard API`, "error");
      return true;
    }
  }
  function checkNotFocusedError(error) {
    if (error instanceof Error && error.message.toLowerCase().includes("document is not focused")) {
      toastMessage('You need to activate the "Emulate a focused page" setting in the "Rendering" panel of devtools.', "warn");
      return true;
    }
    return false;
  }
  async function actionGlobalCopyState(pinia) {
    if (checkClipboardAccess())
      return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(pinia.state.value));
      toastMessage("Global state copied to clipboard.");
    } catch (error) {
      if (checkNotFocusedError(error))
        return;
      toastMessage(`Failed to serialize the state. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  async function actionGlobalPasteState(pinia) {
    if (checkClipboardAccess())
      return;
    try {
      loadStoresState(pinia, JSON.parse(await navigator.clipboard.readText()));
      toastMessage("Global state pasted from clipboard.");
    } catch (error) {
      if (checkNotFocusedError(error))
        return;
      toastMessage(`Failed to deserialize the state from clipboard. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  async function actionGlobalSaveState(pinia) {
    try {
      saveAs(new Blob([JSON.stringify(pinia.state.value)], {
        type: "text/plain;charset=utf-8"
      }), "pinia-state.json");
    } catch (error) {
      toastMessage(`Failed to export the state as JSON. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  let fileInput;
  function getFileOpener() {
    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";
    }
    function openFile() {
      return new Promise((resolve, reject) => {
        fileInput.onchange = async () => {
          const files = fileInput.files;
          if (!files)
            return resolve(null);
          const file = files.item(0);
          if (!file)
            return resolve(null);
          return resolve({ text: await file.text(), file });
        };
        fileInput.oncancel = () => resolve(null);
        fileInput.onerror = reject;
        fileInput.click();
      });
    }
    return openFile;
  }
  async function actionGlobalOpenStateFile(pinia) {
    try {
      const open2 = getFileOpener();
      const result = await open2();
      if (!result)
        return;
      const { text, file } = result;
      loadStoresState(pinia, JSON.parse(text));
      toastMessage(`Global state imported from "${file.name}".`);
    } catch (error) {
      toastMessage(`Failed to import the state from JSON. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  function loadStoresState(pinia, state) {
    for (const key in state) {
      const storeState = pinia.state.value[key];
      if (storeState) {
        Object.assign(storeState, state[key]);
      } else {
        pinia.state.value[key] = state[key];
      }
    }
  }
  function formatDisplay(display) {
    return {
      _custom: {
        display
      }
    };
  }
  const PINIA_ROOT_LABEL = "🍍 Pinia (root)";
  const PINIA_ROOT_ID = "_root";
  function formatStoreForInspectorTree(store) {
    return isPinia(store) ? {
      id: PINIA_ROOT_ID,
      label: PINIA_ROOT_LABEL
    } : {
      id: store.$id,
      label: store.$id
    };
  }
  function formatStoreForInspectorState(store) {
    if (isPinia(store)) {
      const storeNames = Array.from(store._s.keys());
      const storeMap = store._s;
      const state2 = {
        state: storeNames.map((storeId) => ({
          editable: true,
          key: storeId,
          value: store.state.value[storeId]
        })),
        getters: storeNames.filter((id) => storeMap.get(id)._getters).map((id) => {
          const store2 = storeMap.get(id);
          return {
            editable: false,
            key: id,
            value: store2._getters.reduce((getters, key) => {
              getters[key] = store2[key];
              return getters;
            }, {})
          };
        })
      };
      return state2;
    }
    const state = {
      state: Object.keys(store.$state).map((key) => ({
        editable: true,
        key,
        value: store.$state[key]
      }))
    };
    if (store._getters && store._getters.length) {
      state.getters = store._getters.map((getterName) => ({
        editable: false,
        key: getterName,
        value: store[getterName]
      }));
    }
    if (store._customProperties.size) {
      state.customProperties = Array.from(store._customProperties).map((key) => ({
        editable: true,
        key,
        value: store[key]
      }));
    }
    return state;
  }
  function formatEventData(events) {
    if (!events)
      return {};
    if (Array.isArray(events)) {
      return events.reduce((data, event) => {
        data.keys.push(event.key);
        data.operations.push(event.type);
        data.oldValue[event.key] = event.oldValue;
        data.newValue[event.key] = event.newValue;
        return data;
      }, {
        oldValue: {},
        keys: [],
        operations: [],
        newValue: {}
      });
    } else {
      return {
        operation: formatDisplay(events.type),
        key: formatDisplay(events.key),
        oldValue: events.oldValue,
        newValue: events.newValue
      };
    }
  }
  function formatMutationType(type) {
    switch (type) {
      case MutationType.direct:
        return "mutation";
      case MutationType.patchFunction:
        return "$patch";
      case MutationType.patchObject:
        return "$patch";
      default:
        return "unknown";
    }
  }
  let isTimelineActive = true;
  const componentStateTypes = [];
  const MUTATIONS_LAYER_ID = "pinia:mutations";
  const INSPECTOR_ID = "pinia";
  const { assign: assign$1 } = Object;
  const getStoreType = (id) => "🍍 " + id;
  function registerPiniaDevtools(app, pinia) {
    setupDevtoolsPlugin({
      id: "dev.esm.pinia",
      label: "Pinia 🍍",
      logo: "https://pinia.vuejs.org/logo.svg",
      packageName: "pinia",
      homepage: "https://pinia.vuejs.org",
      componentStateTypes,
      app
    }, (api) => {
      if (typeof api.now !== "function") {
        toastMessage("You seem to be using an outdated version of Vue Devtools. Are you still using the Beta release instead of the stable one? You can find the links at https://devtools.vuejs.org/guide/installation.html.");
      }
      api.addTimelineLayer({
        id: MUTATIONS_LAYER_ID,
        label: `Pinia 🍍`,
        color: 15064968
      });
      api.addInspector({
        id: INSPECTOR_ID,
        label: "Pinia 🍍",
        icon: "storage",
        treeFilterPlaceholder: "Search stores",
        actions: [
          {
            icon: "content_copy",
            action: () => {
              actionGlobalCopyState(pinia);
            },
            tooltip: "Serialize and copy the state"
          },
          {
            icon: "content_paste",
            action: async () => {
              await actionGlobalPasteState(pinia);
              api.sendInspectorTree(INSPECTOR_ID);
              api.sendInspectorState(INSPECTOR_ID);
            },
            tooltip: "Replace the state with the content of your clipboard"
          },
          {
            icon: "save",
            action: () => {
              actionGlobalSaveState(pinia);
            },
            tooltip: "Save the state as a JSON file"
          },
          {
            icon: "folder_open",
            action: async () => {
              await actionGlobalOpenStateFile(pinia);
              api.sendInspectorTree(INSPECTOR_ID);
              api.sendInspectorState(INSPECTOR_ID);
            },
            tooltip: "Import the state from a JSON file"
          }
        ],
        nodeActions: [
          {
            icon: "restore",
            tooltip: 'Reset the state (with "$reset")',
            action: (nodeId) => {
              const store = pinia._s.get(nodeId);
              if (!store) {
                toastMessage(`Cannot reset "${nodeId}" store because it wasn't found.`, "warn");
              } else if (typeof store.$reset !== "function") {
                toastMessage(`Cannot reset "${nodeId}" store because it doesn't have a "$reset" method implemented.`, "warn");
              } else {
                store.$reset();
                toastMessage(`Store "${nodeId}" reset.`);
              }
            }
          }
        ]
      });
      api.on.inspectComponent((payload, ctx) => {
        const proxy = payload.componentInstance && payload.componentInstance.proxy;
        if (proxy && proxy._pStores) {
          const piniaStores = payload.componentInstance.proxy._pStores;
          Object.values(piniaStores).forEach((store) => {
            payload.instanceData.state.push({
              type: getStoreType(store.$id),
              key: "state",
              editable: true,
              value: store._isOptionsAPI ? {
                _custom: {
                  value: vue.toRaw(store.$state),
                  actions: [
                    {
                      icon: "restore",
                      tooltip: "Reset the state of this store",
                      action: () => store.$reset()
                    }
                  ]
                }
              } : (
                // NOTE: workaround to unwrap transferred refs
                Object.keys(store.$state).reduce((state, key) => {
                  state[key] = store.$state[key];
                  return state;
                }, {})
              )
            });
            if (store._getters && store._getters.length) {
              payload.instanceData.state.push({
                type: getStoreType(store.$id),
                key: "getters",
                editable: false,
                value: store._getters.reduce((getters, key) => {
                  try {
                    getters[key] = store[key];
                  } catch (error) {
                    getters[key] = error;
                  }
                  return getters;
                }, {})
              });
            }
          });
        }
      });
      api.on.getInspectorTree((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          let stores = [pinia];
          stores = stores.concat(Array.from(pinia._s.values()));
          payload.rootNodes = (payload.filter ? stores.filter((store) => "$id" in store ? store.$id.toLowerCase().includes(payload.filter.toLowerCase()) : PINIA_ROOT_LABEL.toLowerCase().includes(payload.filter.toLowerCase())) : stores).map(formatStoreForInspectorTree);
        }
      });
      api.on.getInspectorState((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const inspectedStore = payload.nodeId === PINIA_ROOT_ID ? pinia : pinia._s.get(payload.nodeId);
          if (!inspectedStore) {
            return;
          }
          if (inspectedStore) {
            payload.state = formatStoreForInspectorState(inspectedStore);
          }
        }
      });
      api.on.editInspectorState((payload, ctx) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const inspectedStore = payload.nodeId === PINIA_ROOT_ID ? pinia : pinia._s.get(payload.nodeId);
          if (!inspectedStore) {
            return toastMessage(`store "${payload.nodeId}" not found`, "error");
          }
          const { path } = payload;
          if (!isPinia(inspectedStore)) {
            if (path.length !== 1 || !inspectedStore._customProperties.has(path[0]) || path[0] in inspectedStore.$state) {
              path.unshift("$state");
            }
          } else {
            path.unshift("state");
          }
          isTimelineActive = false;
          payload.set(inspectedStore, path, payload.state.value);
          isTimelineActive = true;
        }
      });
      api.on.editComponentState((payload) => {
        if (payload.type.startsWith("🍍")) {
          const storeId = payload.type.replace(/^🍍\s*/, "");
          const store = pinia._s.get(storeId);
          if (!store) {
            return toastMessage(`store "${storeId}" not found`, "error");
          }
          const { path } = payload;
          if (path[0] !== "state") {
            return toastMessage(`Invalid path for store "${storeId}":
${path}
Only state can be modified.`);
          }
          path[0] = "$state";
          isTimelineActive = false;
          payload.set(store, path, payload.state.value);
          isTimelineActive = true;
        }
      });
    });
  }
  function addStoreToDevtools(app, store) {
    if (!componentStateTypes.includes(getStoreType(store.$id))) {
      componentStateTypes.push(getStoreType(store.$id));
    }
    setupDevtoolsPlugin({
      id: "dev.esm.pinia",
      label: "Pinia 🍍",
      logo: "https://pinia.vuejs.org/logo.svg",
      packageName: "pinia",
      homepage: "https://pinia.vuejs.org",
      componentStateTypes,
      app,
      settings: {
        logStoreChanges: {
          label: "Notify about new/deleted stores",
          type: "boolean",
          defaultValue: true
        }
        // useEmojis: {
        //   label: 'Use emojis in messages ⚡️',
        //   type: 'boolean',
        //   defaultValue: true,
        // },
      }
    }, (api) => {
      const now2 = typeof api.now === "function" ? api.now.bind(api) : Date.now;
      store.$onAction(({ after, onError, name, args }) => {
        const groupId = runningActionId++;
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: {
            time: now2(),
            title: "🛫 " + name,
            subtitle: "start",
            data: {
              store: formatDisplay(store.$id),
              action: formatDisplay(name),
              args
            },
            groupId
          }
        });
        after((result) => {
          activeAction = void 0;
          api.addTimelineEvent({
            layerId: MUTATIONS_LAYER_ID,
            event: {
              time: now2(),
              title: "🛬 " + name,
              subtitle: "end",
              data: {
                store: formatDisplay(store.$id),
                action: formatDisplay(name),
                args,
                result
              },
              groupId
            }
          });
        });
        onError((error) => {
          activeAction = void 0;
          api.addTimelineEvent({
            layerId: MUTATIONS_LAYER_ID,
            event: {
              time: now2(),
              logType: "error",
              title: "💥 " + name,
              subtitle: "end",
              data: {
                store: formatDisplay(store.$id),
                action: formatDisplay(name),
                args,
                error
              },
              groupId
            }
          });
        });
      }, true);
      store._customProperties.forEach((name) => {
        vue.watch(() => vue.unref(store[name]), (newValue, oldValue) => {
          api.notifyComponentUpdate();
          api.sendInspectorState(INSPECTOR_ID);
          if (isTimelineActive) {
            api.addTimelineEvent({
              layerId: MUTATIONS_LAYER_ID,
              event: {
                time: now2(),
                title: "Change",
                subtitle: name,
                data: {
                  newValue,
                  oldValue
                },
                groupId: activeAction
              }
            });
          }
        }, { deep: true });
      });
      store.$subscribe(({ events, type }, state) => {
        api.notifyComponentUpdate();
        api.sendInspectorState(INSPECTOR_ID);
        if (!isTimelineActive)
          return;
        const eventData = {
          time: now2(),
          title: formatMutationType(type),
          data: assign$1({ store: formatDisplay(store.$id) }, formatEventData(events)),
          groupId: activeAction
        };
        if (type === MutationType.patchFunction) {
          eventData.subtitle = "⤵️";
        } else if (type === MutationType.patchObject) {
          eventData.subtitle = "🧩";
        } else if (events && !Array.isArray(events)) {
          eventData.subtitle = events.type;
        }
        if (events) {
          eventData.data["rawEvent(s)"] = {
            _custom: {
              display: "DebuggerEvent",
              type: "object",
              tooltip: "raw DebuggerEvent[]",
              value: events
            }
          };
        }
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: eventData
        });
      }, { detached: true, flush: "sync" });
      const hotUpdate = store._hotUpdate;
      store._hotUpdate = vue.markRaw((newStore) => {
        hotUpdate(newStore);
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: {
            time: now2(),
            title: "🔥 " + store.$id,
            subtitle: "HMR update",
            data: {
              store: formatDisplay(store.$id),
              info: formatDisplay(`HMR update`)
            }
          }
        });
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
      });
      const { $dispose } = store;
      store.$dispose = () => {
        $dispose();
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
        api.getSettings().logStoreChanges && toastMessage(`Disposed "${store.$id}" store 🗑`);
      };
      api.notifyComponentUpdate();
      api.sendInspectorTree(INSPECTOR_ID);
      api.sendInspectorState(INSPECTOR_ID);
      api.getSettings().logStoreChanges && toastMessage(`"${store.$id}" store installed 🆕`);
    });
  }
  let runningActionId = 0;
  let activeAction;
  function patchActionForGrouping(store, actionNames, wrapWithProxy) {
    const actions = actionNames.reduce((storeActions, actionName) => {
      storeActions[actionName] = vue.toRaw(store)[actionName];
      return storeActions;
    }, {});
    for (const actionName in actions) {
      store[actionName] = function() {
        const _actionId = runningActionId;
        const trackedStore = wrapWithProxy ? new Proxy(store, {
          get(...args) {
            activeAction = _actionId;
            return Reflect.get(...args);
          },
          set(...args) {
            activeAction = _actionId;
            return Reflect.set(...args);
          }
        }) : store;
        activeAction = _actionId;
        const retValue = actions[actionName].apply(trackedStore, arguments);
        activeAction = void 0;
        return retValue;
      };
    }
  }
  function devtoolsPlugin({ app, store, options }) {
    if (store.$id.startsWith("__hot:")) {
      return;
    }
    store._isOptionsAPI = !!options.state;
    patchActionForGrouping(store, Object.keys(options.actions), store._isOptionsAPI);
    const originalHotUpdate = store._hotUpdate;
    vue.toRaw(store)._hotUpdate = function(newStore) {
      originalHotUpdate.apply(this, arguments);
      patchActionForGrouping(store, Object.keys(newStore._hmrPayload.actions), !!store._isOptionsAPI);
    };
    addStoreToDevtools(
      app,
      // FIXME: is there a way to allow the assignment from Store<Id, S, G, A> to StoreGeneric?
      store
    );
  }
  function createPinia() {
    const scope = vue.effectScope(true);
    const state = scope.run(() => vue.ref({}));
    let _p = [];
    let toBeInstalled = [];
    const pinia = vue.markRaw({
      install(app) {
        setActivePinia(pinia);
        {
          pinia._a = app;
          app.provide(piniaSymbol, pinia);
          app.config.globalProperties.$pinia = pinia;
          if (USE_DEVTOOLS) {
            registerPiniaDevtools(app, pinia);
          }
          toBeInstalled.forEach((plugin) => _p.push(plugin));
          toBeInstalled = [];
        }
      },
      use(plugin) {
        if (!this._a && !isVue2) {
          toBeInstalled.push(plugin);
        } else {
          _p.push(plugin);
        }
        return this;
      },
      _p,
      // it's actually undefined here
      // @ts-expect-error
      _a: null,
      _e: scope,
      _s: /* @__PURE__ */ new Map(),
      state
    });
    if (USE_DEVTOOLS && typeof Proxy !== "undefined") {
      pinia.use(devtoolsPlugin);
    }
    return pinia;
  }
  const isUseStore = (fn) => {
    return typeof fn === "function" && typeof fn.$id === "string";
  };
  function patchObject(newState, oldState) {
    for (const key in oldState) {
      const subPatch = oldState[key];
      if (!(key in newState)) {
        continue;
      }
      const targetValue = newState[key];
      if (isPlainObject(targetValue) && isPlainObject(subPatch) && !vue.isRef(subPatch) && !vue.isReactive(subPatch)) {
        newState[key] = patchObject(targetValue, subPatch);
      } else {
        {
          newState[key] = subPatch;
        }
      }
    }
    return newState;
  }
  function acceptHMRUpdate(initialUseStore, hot) {
    return (newModule) => {
      const pinia = hot.data.pinia || initialUseStore._pinia;
      if (!pinia) {
        return;
      }
      hot.data.pinia = pinia;
      for (const exportName in newModule) {
        const useStore = newModule[exportName];
        if (isUseStore(useStore) && pinia._s.has(useStore.$id)) {
          const id = useStore.$id;
          if (id !== initialUseStore.$id) {
            console.warn(`The id of the store changed from "${initialUseStore.$id}" to "${id}". Reloading.`);
            return hot.invalidate();
          }
          const existingStore = pinia._s.get(id);
          if (!existingStore) {
            console.log(`[Pinia]: skipping hmr because store doesn't exist yet`);
            return;
          }
          useStore(pinia, existingStore);
        }
      }
    };
  }
  const noop = () => {
  };
  function addSubscription(subscriptions, callback, detached, onCleanup = noop) {
    subscriptions.push(callback);
    const removeSubscription = () => {
      const idx = subscriptions.indexOf(callback);
      if (idx > -1) {
        subscriptions.splice(idx, 1);
        onCleanup();
      }
    };
    if (!detached && vue.getCurrentScope()) {
      vue.onScopeDispose(removeSubscription);
    }
    return removeSubscription;
  }
  function triggerSubscriptions(subscriptions, ...args) {
    subscriptions.slice().forEach((callback) => {
      callback(...args);
    });
  }
  const fallbackRunWithContext = (fn) => fn();
  function mergeReactiveObjects(target, patchToApply) {
    if (target instanceof Map && patchToApply instanceof Map) {
      patchToApply.forEach((value, key) => target.set(key, value));
    }
    if (target instanceof Set && patchToApply instanceof Set) {
      patchToApply.forEach(target.add, target);
    }
    for (const key in patchToApply) {
      if (!patchToApply.hasOwnProperty(key))
        continue;
      const subPatch = patchToApply[key];
      const targetValue = target[key];
      if (isPlainObject(targetValue) && isPlainObject(subPatch) && target.hasOwnProperty(key) && !vue.isRef(subPatch) && !vue.isReactive(subPatch)) {
        target[key] = mergeReactiveObjects(targetValue, subPatch);
      } else {
        target[key] = subPatch;
      }
    }
    return target;
  }
  const skipHydrateSymbol = Symbol("pinia:skipHydration");
  function skipHydrate(obj) {
    return Object.defineProperty(obj, skipHydrateSymbol, {});
  }
  function shouldHydrate(obj) {
    return !isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol);
  }
  const { assign } = Object;
  function isComputed(o) {
    return !!(vue.isRef(o) && o.effect);
  }
  function createOptionsStore(id, options, pinia, hot) {
    const { state, actions, getters } = options;
    const initialState = pinia.state.value[id];
    let store;
    function setup() {
      if (!initialState && !hot) {
        {
          pinia.state.value[id] = state ? state() : {};
        }
      }
      const localState = hot ? (
        // use ref() to unwrap refs inside state TODO: check if this is still necessary
        vue.toRefs(vue.ref(state ? state() : {}).value)
      ) : vue.toRefs(pinia.state.value[id]);
      return assign(localState, actions, Object.keys(getters || {}).reduce((computedGetters, name) => {
        if (name in localState) {
          console.warn(`[🍍]: A getter cannot have the same name as another state property. Rename one of them. Found with "${name}" in store "${id}".`);
        }
        computedGetters[name] = vue.markRaw(vue.computed(() => {
          setActivePinia(pinia);
          const store2 = pinia._s.get(id);
          return getters[name].call(store2, store2);
        }));
        return computedGetters;
      }, {}));
    }
    store = createSetupStore(id, setup, options, pinia, hot, true);
    return store;
  }
  function createSetupStore($id, setup, options = {}, pinia, hot, isOptionsStore) {
    let scope;
    const optionsForPlugin = assign({ actions: {} }, options);
    if (!pinia._e.active) {
      throw new Error("Pinia destroyed");
    }
    const $subscribeOptions = {
      deep: true
      // flush: 'post',
    };
    {
      $subscribeOptions.onTrigger = (event) => {
        if (isListening) {
          debuggerEvents = event;
        } else if (isListening == false && !store._hotUpdating) {
          if (Array.isArray(debuggerEvents)) {
            debuggerEvents.push(event);
          } else {
            console.error("🍍 debuggerEvents should be an array. This is most likely an internal Pinia bug.");
          }
        }
      };
    }
    let isListening;
    let isSyncListening;
    let subscriptions = [];
    let actionSubscriptions = [];
    let debuggerEvents;
    const initialState = pinia.state.value[$id];
    if (!isOptionsStore && !initialState && !hot) {
      {
        pinia.state.value[$id] = {};
      }
    }
    const hotState = vue.ref({});
    let activeListener;
    function $patch(partialStateOrMutator) {
      let subscriptionMutation;
      isListening = isSyncListening = false;
      {
        debuggerEvents = [];
      }
      if (typeof partialStateOrMutator === "function") {
        partialStateOrMutator(pinia.state.value[$id]);
        subscriptionMutation = {
          type: MutationType.patchFunction,
          storeId: $id,
          events: debuggerEvents
        };
      } else {
        mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator);
        subscriptionMutation = {
          type: MutationType.patchObject,
          payload: partialStateOrMutator,
          storeId: $id,
          events: debuggerEvents
        };
      }
      const myListenerId = activeListener = Symbol();
      vue.nextTick().then(() => {
        if (activeListener === myListenerId) {
          isListening = true;
        }
      });
      isSyncListening = true;
      triggerSubscriptions(subscriptions, subscriptionMutation, pinia.state.value[$id]);
    }
    const $reset = isOptionsStore ? function $reset2() {
      const { state } = options;
      const newState = state ? state() : {};
      this.$patch(($state) => {
        assign($state, newState);
      });
    } : (
      /* istanbul ignore next */
      () => {
        throw new Error(`🍍: Store "${$id}" is built using the setup syntax and does not implement $reset().`);
      }
    );
    function $dispose() {
      scope.stop();
      subscriptions = [];
      actionSubscriptions = [];
      pinia._s.delete($id);
    }
    function wrapAction(name, action) {
      return function() {
        setActivePinia(pinia);
        const args = Array.from(arguments);
        const afterCallbackList = [];
        const onErrorCallbackList = [];
        function after(callback) {
          afterCallbackList.push(callback);
        }
        function onError(callback) {
          onErrorCallbackList.push(callback);
        }
        triggerSubscriptions(actionSubscriptions, {
          args,
          name,
          store,
          after,
          onError
        });
        let ret;
        try {
          ret = action.apply(this && this.$id === $id ? this : store, args);
        } catch (error) {
          triggerSubscriptions(onErrorCallbackList, error);
          throw error;
        }
        if (ret instanceof Promise) {
          return ret.then((value) => {
            triggerSubscriptions(afterCallbackList, value);
            return value;
          }).catch((error) => {
            triggerSubscriptions(onErrorCallbackList, error);
            return Promise.reject(error);
          });
        }
        triggerSubscriptions(afterCallbackList, ret);
        return ret;
      };
    }
    const _hmrPayload = /* @__PURE__ */ vue.markRaw({
      actions: {},
      getters: {},
      state: [],
      hotState
    });
    const partialStore = {
      _p: pinia,
      // _s: scope,
      $id,
      $onAction: addSubscription.bind(null, actionSubscriptions),
      $patch,
      $reset,
      $subscribe(callback, options2 = {}) {
        const removeSubscription = addSubscription(subscriptions, callback, options2.detached, () => stopWatcher());
        const stopWatcher = scope.run(() => vue.watch(() => pinia.state.value[$id], (state) => {
          if (options2.flush === "sync" ? isSyncListening : isListening) {
            callback({
              storeId: $id,
              type: MutationType.direct,
              events: debuggerEvents
            }, state);
          }
        }, assign({}, $subscribeOptions, options2)));
        return removeSubscription;
      },
      $dispose
    };
    const store = vue.reactive(assign(
      {
        _hmrPayload,
        _customProperties: vue.markRaw(/* @__PURE__ */ new Set())
        // devtools custom properties
      },
      partialStore
      // must be added later
      // setupStore
    ));
    pinia._s.set($id, store);
    const runWithContext = pinia._a && pinia._a.runWithContext || fallbackRunWithContext;
    const setupStore = runWithContext(() => pinia._e.run(() => (scope = vue.effectScope()).run(setup)));
    for (const key in setupStore) {
      const prop = setupStore[key];
      if (vue.isRef(prop) && !isComputed(prop) || vue.isReactive(prop)) {
        if (hot) {
          set(hotState.value, key, vue.toRef(setupStore, key));
        } else if (!isOptionsStore) {
          if (initialState && shouldHydrate(prop)) {
            if (vue.isRef(prop)) {
              prop.value = initialState[key];
            } else {
              mergeReactiveObjects(prop, initialState[key]);
            }
          }
          {
            pinia.state.value[$id][key] = prop;
          }
        }
        {
          _hmrPayload.state.push(key);
        }
      } else if (typeof prop === "function") {
        const actionValue = hot ? prop : wrapAction(key, prop);
        {
          setupStore[key] = actionValue;
        }
        {
          _hmrPayload.actions[key] = prop;
        }
        optionsForPlugin.actions[key] = prop;
      } else {
        if (isComputed(prop)) {
          _hmrPayload.getters[key] = isOptionsStore ? (
            // @ts-expect-error
            options.getters[key]
          ) : prop;
          if (IS_CLIENT) {
            const getters = setupStore._getters || // @ts-expect-error: same
            (setupStore._getters = vue.markRaw([]));
            getters.push(key);
          }
        }
      }
    }
    {
      assign(store, setupStore);
      assign(vue.toRaw(store), setupStore);
    }
    Object.defineProperty(store, "$state", {
      get: () => hot ? hotState.value : pinia.state.value[$id],
      set: (state) => {
        if (hot) {
          throw new Error("cannot set hotState");
        }
        $patch(($state) => {
          assign($state, state);
        });
      }
    });
    {
      store._hotUpdate = vue.markRaw((newStore) => {
        store._hotUpdating = true;
        newStore._hmrPayload.state.forEach((stateKey) => {
          if (stateKey in store.$state) {
            const newStateTarget = newStore.$state[stateKey];
            const oldStateSource = store.$state[stateKey];
            if (typeof newStateTarget === "object" && isPlainObject(newStateTarget) && isPlainObject(oldStateSource)) {
              patchObject(newStateTarget, oldStateSource);
            } else {
              newStore.$state[stateKey] = oldStateSource;
            }
          }
          set(store, stateKey, vue.toRef(newStore.$state, stateKey));
        });
        Object.keys(store.$state).forEach((stateKey) => {
          if (!(stateKey in newStore.$state)) {
            del(store, stateKey);
          }
        });
        isListening = false;
        isSyncListening = false;
        pinia.state.value[$id] = vue.toRef(newStore._hmrPayload, "hotState");
        isSyncListening = true;
        vue.nextTick().then(() => {
          isListening = true;
        });
        for (const actionName in newStore._hmrPayload.actions) {
          const action = newStore[actionName];
          set(store, actionName, wrapAction(actionName, action));
        }
        for (const getterName in newStore._hmrPayload.getters) {
          const getter = newStore._hmrPayload.getters[getterName];
          const getterValue = isOptionsStore ? (
            // special handling of options api
            vue.computed(() => {
              setActivePinia(pinia);
              return getter.call(store, store);
            })
          ) : getter;
          set(store, getterName, getterValue);
        }
        Object.keys(store._hmrPayload.getters).forEach((key) => {
          if (!(key in newStore._hmrPayload.getters)) {
            del(store, key);
          }
        });
        Object.keys(store._hmrPayload.actions).forEach((key) => {
          if (!(key in newStore._hmrPayload.actions)) {
            del(store, key);
          }
        });
        store._hmrPayload = newStore._hmrPayload;
        store._getters = newStore._getters;
        store._hotUpdating = false;
      });
    }
    if (USE_DEVTOOLS) {
      const nonEnumerable = {
        writable: true,
        configurable: true,
        // avoid warning on devtools trying to display this property
        enumerable: false
      };
      ["_p", "_hmrPayload", "_getters", "_customProperties"].forEach((p) => {
        Object.defineProperty(store, p, assign({ value: store[p] }, nonEnumerable));
      });
    }
    pinia._p.forEach((extender) => {
      if (USE_DEVTOOLS) {
        const extensions = scope.run(() => extender({
          store,
          app: pinia._a,
          pinia,
          options: optionsForPlugin
        }));
        Object.keys(extensions || {}).forEach((key) => store._customProperties.add(key));
        assign(store, extensions);
      } else {
        assign(store, scope.run(() => extender({
          store,
          app: pinia._a,
          pinia,
          options: optionsForPlugin
        })));
      }
    });
    if (store.$state && typeof store.$state === "object" && typeof store.$state.constructor === "function" && !store.$state.constructor.toString().includes("[native code]")) {
      console.warn(`[🍍]: The "state" must be a plain object. It cannot be
	state: () => new MyClass()
Found in store "${store.$id}".`);
    }
    if (initialState && isOptionsStore && options.hydrate) {
      options.hydrate(store.$state, initialState);
    }
    isListening = true;
    isSyncListening = true;
    return store;
  }
  function defineStore(idOrOptions, setup, setupOptions) {
    let id;
    let options;
    const isSetupStore = typeof setup === "function";
    if (typeof idOrOptions === "string") {
      id = idOrOptions;
      options = isSetupStore ? setupOptions : setup;
    } else {
      options = idOrOptions;
      id = idOrOptions.id;
      if (typeof id !== "string") {
        throw new Error(`[🍍]: "defineStore()" must be passed a store id as its first argument.`);
      }
    }
    function useStore(pinia, hot) {
      const hasContext = vue.hasInjectionContext();
      pinia = // in test mode, ignore the argument provided as we can always retrieve a
      // pinia instance with getActivePinia()
      pinia || (hasContext ? vue.inject(piniaSymbol, null) : null);
      if (pinia)
        setActivePinia(pinia);
      if (!activePinia) {
        throw new Error(`[🍍]: "getActivePinia()" was called but there was no active Pinia. Are you trying to use a store before calling "app.use(pinia)"?
See https://pinia.vuejs.org/core-concepts/outside-component-usage.html for help.
This will fail in production.`);
      }
      pinia = activePinia;
      if (!pinia._s.has(id)) {
        if (isSetupStore) {
          createSetupStore(id, setup, options, pinia);
        } else {
          createOptionsStore(id, options, pinia);
        }
        {
          useStore._pinia = pinia;
        }
      }
      const store = pinia._s.get(id);
      if (hot) {
        const hotId = "__hot:" + id;
        const newStore = isSetupStore ? createSetupStore(hotId, setup, options, pinia, true) : createOptionsStore(hotId, assign({}, options), pinia, true);
        hot._hotUpdate(newStore);
        delete pinia.state.value[hotId];
        pinia._s.delete(hotId);
      }
      if (IS_CLIENT) {
        const currentInstance = vue.getCurrentInstance();
        if (currentInstance && currentInstance.proxy && // avoid adding stores that are just built for hot module replacement
        !hot) {
          const vm = currentInstance.proxy;
          const cache = "_pStores" in vm ? vm._pStores : vm._pStores = {};
          cache[id] = store;
        }
      }
      return store;
    }
    useStore.$id = id;
    return useStore;
  }
  let mapStoreSuffix = "Store";
  function setMapStoreSuffix(suffix) {
    mapStoreSuffix = suffix;
  }
  function mapStores(...stores) {
    if (Array.isArray(stores[0])) {
      console.warn(`[🍍]: Directly pass all stores to "mapStores()" without putting them in an array:
Replace
	mapStores([useAuthStore, useCartStore])
with
	mapStores(useAuthStore, useCartStore)
This will fail in production if not fixed.`);
      stores = stores[0];
    }
    return stores.reduce((reduced, useStore) => {
      reduced[useStore.$id + mapStoreSuffix] = function() {
        return useStore(this.$pinia);
      };
      return reduced;
    }, {});
  }
  function mapState(useStore, keysOrMapper) {
    return Array.isArray(keysOrMapper) ? keysOrMapper.reduce((reduced, key) => {
      reduced[key] = function() {
        return useStore(this.$pinia)[key];
      };
      return reduced;
    }, {}) : Object.keys(keysOrMapper).reduce((reduced, key) => {
      reduced[key] = function() {
        const store = useStore(this.$pinia);
        const storeKey = keysOrMapper[key];
        return typeof storeKey === "function" ? storeKey.call(this, store) : store[storeKey];
      };
      return reduced;
    }, {});
  }
  const mapGetters = mapState;
  function mapActions(useStore, keysOrMapper) {
    return Array.isArray(keysOrMapper) ? keysOrMapper.reduce((reduced, key) => {
      reduced[key] = function(...args) {
        return useStore(this.$pinia)[key](...args);
      };
      return reduced;
    }, {}) : Object.keys(keysOrMapper).reduce((reduced, key) => {
      reduced[key] = function(...args) {
        return useStore(this.$pinia)[keysOrMapper[key]](...args);
      };
      return reduced;
    }, {});
  }
  function mapWritableState(useStore, keysOrMapper) {
    return Array.isArray(keysOrMapper) ? keysOrMapper.reduce((reduced, key) => {
      reduced[key] = {
        get() {
          return useStore(this.$pinia)[key];
        },
        set(value) {
          return useStore(this.$pinia)[key] = value;
        }
      };
      return reduced;
    }, {}) : Object.keys(keysOrMapper).reduce((reduced, key) => {
      reduced[key] = {
        get() {
          return useStore(this.$pinia)[keysOrMapper[key]];
        },
        set(value) {
          return useStore(this.$pinia)[keysOrMapper[key]] = value;
        }
      };
      return reduced;
    }, {});
  }
  function storeToRefs(store) {
    {
      store = vue.toRaw(store);
      const refs = {};
      for (const key in store) {
        const value = store[key];
        if (vue.isRef(value) || vue.isReactive(value)) {
          refs[key] = // ---
          vue.toRef(store, key);
        }
      }
      return refs;
    }
  }
  const PiniaVuePlugin = function(_Vue) {
    _Vue.mixin({
      beforeCreate() {
        const options = this.$options;
        if (options.pinia) {
          const pinia = options.pinia;
          if (!this._provided) {
            const provideCache = {};
            Object.defineProperty(this, "_provided", {
              get: () => provideCache,
              set: (v) => Object.assign(provideCache, v)
            });
          }
          this._provided[piniaSymbol] = pinia;
          if (!this.$pinia) {
            this.$pinia = pinia;
          }
          pinia._a = this;
          if (IS_CLIENT) {
            setActivePinia(pinia);
          }
          if (USE_DEVTOOLS) {
            registerPiniaDevtools(pinia._a, pinia);
          }
        } else if (!this.$pinia && options.parent && options.parent.$pinia) {
          this.$pinia = options.parent.$pinia;
        }
      },
      destroyed() {
        delete this._pStores;
      }
    });
  };
  const Pinia = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    get MutationType() {
      return MutationType;
    },
    PiniaVuePlugin,
    acceptHMRUpdate,
    createPinia,
    defineStore,
    getActivePinia,
    mapActions,
    mapGetters,
    mapState,
    mapStores,
    mapWritableState,
    setActivePinia,
    setMapStoreSuffix,
    skipHydrate,
    storeToRefs
  }, Symbol.toStringTag, { value: "Module" }));
  function registerRequest(data) {
    return request({
      url: "/api/v1/auth/register",
      method: "POST",
      data
    });
  }
  function loginRequest(data) {
    const username = data.email;
    const password = data.password;
    return request({
      url: "/api/v1/auth/login",
      method: "POST",
      header: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      // [修正] 将 data.username 改为使用我们传入的 email 值
      data: `username=${username}&password=${password}`
    });
  }
  const useUserStore = defineStore("user", {
    state: () => ({
      token: uni.getStorageSync("token") || null,
      userInfo: JSON.parse(uni.getStorageSync("userInfo") || "{}")
    }),
    getters: {
      isLoggedIn: (state) => !!state.token
    },
    actions: {
      async login(loginData) {
        var _a;
        try {
          const response = await loginRequest(loginData);
          const accessToken = response.access_token;
          if (!accessToken) {
            throw new Error("Token not found in response");
          }
          this.token = accessToken;
          uni.setStorageSync("token", accessToken);
          uni.showToast({ title: "登录成功", icon: "success" });
          uni.switchTab({
            url: "/pages/index/index"
          });
        } catch (error) {
          formatAppLog("error", "at stores/user.js:36", "Login failed:", error);
          const errorMsg = ((_a = error.data) == null ? void 0 : _a.detail) || "登录失败，请检查凭据";
          uni.showToast({ title: errorMsg, icon: "none" });
          throw error;
        }
      },
      async register(registerData) {
        var _a;
        try {
          await registerRequest(registerData);
          uni.showToast({
            title: "注册成功，请登录",
            icon: "success",
            duration: 2e3
          });
          setTimeout(() => {
            uni.navigateTo({
              url: "/pages/login/login"
            });
          }, 2e3);
        } catch (error) {
          formatAppLog("error", "at stores/user.js:56", "Registration failed:", error);
          const errorMsg = ((_a = error.data) == null ? void 0 : _a.detail) || "注册失败，请稍后再试";
          uni.showToast({ title: errorMsg, icon: "none" });
          throw error;
        }
      },
      // 【修正】彻底移除 fetchUserInfo 这个 action
      /*
      async fetchUserInfo() {
          try {
              const userInfo = await getUserInfoRequest();
              this.userInfo = userInfo;
              uni.setStorageSync('userInfo', JSON.stringify(userInfo));
          } catch (error) {
              __f__('error','at stores/user.js:71','Fetch user info failed:', error);
              this.logout();
          }
      },
      */
      logout() {
        this.token = null;
        this.userInfo = {};
        uni.removeStorageSync("token");
        uni.removeStorageSync("userInfo");
        uni.showToast({ title: "已退出登录", icon: "none" });
        uni.reLaunch({
          url: "/pages/login/login"
        });
      }
    }
  });
  const BASE_URL = "http://120.53.230.215:8000";
  const request = (options) => {
    return new Promise((resolve, reject) => {
      let userStore;
      try {
        userStore = useUserStore();
      } catch (error) {
        formatAppLog("error", "at utils/request.js:14", "在请求拦截器中获取 Pinia store 失败:", error);
      }
      if (userStore && userStore.token) {
        if (!options.header)
          options.header = {};
        options.header.Authorization = `Bearer ${userStore.token}`;
        formatAppLog("log", "at utils/request.js:22", "请求已携带Token:", options.header.Authorization);
      }
      uni.request({
        url: BASE_URL + options.url,
        method: options.method || "GET",
        data: options.data || {},
        header: options.header || {},
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            formatAppLog("error", "at utils/request.js:35", "响应拦截器：收到401，认证失败");
            if (userStore) {
              userStore.logout();
            } else {
              uni.reLaunch({ url: "/pages/login/login" });
            }
            reject(res.data);
          } else {
            formatAppLog("error", "at utils/request.js:44", `响应拦截器：请求失败，状态码 ${res.statusCode}`);
            reject(res.data);
          }
        },
        fail: (err) => {
          uni.showToast({ title: "网络请求异常", icon: "none" });
          formatAppLog("error", "at utils/request.js:50", "网络请求失败:", err);
          reject(err);
        }
      });
    });
  };
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
  const useCompanionStore = defineStore("companion", () => {
    const companionList = vue.ref([]);
    const isLoading = vue.ref(true);
    const fetchCompanions = async () => {
      isLoading.value = true;
      try {
        const res = await getCompanions();
        companionList.value = res;
        formatAppLog("log", "at stores/companionStore.js:21", "伙伴列表已更新:", companionList.value);
      } catch (error) {
        formatAppLog("error", "at stores/companionStore.js:23", "获取伙伴列表失败", error);
        uni.showToast({ title: "加载失败，请下拉刷新", icon: "none" });
      } finally {
        isLoading.value = false;
      }
    };
    const createCompanion$1 = async (companionData) => {
      try {
        await createCompanion(companionData);
        uni.showToast({ title: "创建成功！", icon: "success" });
        await fetchCompanions();
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (error) {
        formatAppLog("error", "at stores/companionStore.js:45", "创建伙伴失败", error);
        uni.showToast({ title: "创建失败", icon: "none" });
        throw error;
      }
    };
    const updateCompanion$1 = async (id, companionData) => {
      try {
        await updateCompanion(id, companionData);
        uni.showToast({ title: "更新成功！", icon: "success" });
        await fetchCompanions();
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (error) {
        formatAppLog("error", "at stores/companionStore.js:67", "更新伙伴失败", error);
        uni.showToast({ title: "更新失败", icon: "none" });
        throw error;
      }
    };
    const deleteCompanion$1 = async (companionId) => {
      uni.showLoading({ title: "正在删除...", mask: true });
      try {
        await deleteCompanion(companionId);
        uni.showToast({ title: "删除成功", icon: "success" });
        await fetchCompanions();
        setTimeout(() => uni.reLaunch({ url: "/pages/index/index" }), 1500);
      } catch (err) {
        formatAppLog("error", "at stores/companionStore.js:90", "删除伙伴时发生错误", err);
        uni.showToast({ title: "删除失败", icon: "none" });
        throw err;
      } finally {
        uni.hideLoading();
      }
    };
    return {
      companionList,
      isLoading,
      fetchCompanions,
      createCompanion: createCompanion$1,
      updateCompanion: updateCompanion$1,
      deleteCompanion: deleteCompanion$1
      // <-- 【新增】在这里导出新函数
    };
  });
  const _imports_0$2 = "/static/images/add-companion-icon.png";
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$9 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const companionStore = useCompanionStore();
      const { companionList, isLoading } = storeToRefs(companionStore);
      const isMenuShow = vue.ref(false);
      onShow(() => {
        companionStore.fetchCompanions();
      });
      onPullDownRefresh(async () => {
        await companionStore.fetchCompanions();
        uni.stopPullDownRefresh();
      });
      const toggleMenu = () => {
        isMenuShow.value = !isMenuShow.value;
      };
      const goToAddCompanion = () => {
        isMenuShow.value = false;
        uni.navigateTo({
          url: "/pages/companion-form/companion-form"
        });
      };
      const __returned__ = { companionStore, companionList, isLoading, isMenuShow, toggleMenu, goToAddCompanion, ref: vue.ref, get onShow() {
        return onShow;
      }, get onPullDownRefresh() {
        return onPullDownRefresh;
      }, get storeToRefs() {
        return storeToRefs;
      }, get useCompanionStore() {
        return useCompanionStore;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", null, [
      vue.createElementVNode("view", { class: "global-bg" }),
      vue.createElementVNode("view", { class: "header-container" }, [
        vue.createElementVNode("text", { class: "app-title" }, "Sona"),
        vue.createElementVNode("view", {
          class: "top-menu-button",
          onClick: $setup.toggleMenu
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
          class: vue.normalizeClass(["popup-menu", { show: $setup.isMenuShow }])
        },
        [
          vue.createElementVNode("view", {
            class: "menu-item",
            onClick: $setup.goToAddCompanion
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
      $setup.isMenuShow ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "menu-overlay",
        onClick: $setup.toggleMenu
      })) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("view", { class: "container" }, [
        $setup.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
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
            vue.renderList($setup.companionList, (item) => {
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
        !$setup.isLoading && $setup.companionList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "empty-container"
        }, [
          vue.createElementVNode("text", null, '你还没有创建任何 AI 伙伴，点击左上角 "+" 创建你的第一个AI伙伴吧')
        ])) : vue.createCommentVNode("v-if", true)
      ])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$8], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/index/index.vue"]]);
  function getMessages(companionId) {
    return request({
      // 后端定义的正确路径是 GET /api/v1/chat/messages/{companion_id}
      url: `/api/v1/chat/messages/${companionId}`,
      method: "get"
    });
  }
  const WS_BASE_URL = "ws://120.53.230.215:8000";
  const useChatStore = defineStore("chat", () => {
    const messages = vue.ref([]);
    const companionId = vue.ref(null);
    const socketTask = vue.ref(null);
    const isSending = vue.ref(false);
    const scrollTop = vue.ref(99999);
    const initializeChat = async (id) => {
      messages.value = [];
      isSending.value = false;
      if (socketTask.value) {
        socketTask.value.close();
        socketTask.value = null;
      }
      companionId.value = id;
      await loadHistoryMessages();
      connectWebSocket();
    };
    const loadHistoryMessages = async () => {
      if (!companionId.value)
        return;
      uni.showLoading({ title: "加载记录中..." });
      try {
        const history = await getMessages(companionId.value);
        messages.value = processMessages(history);
      } catch (err) {
        formatAppLog("error", "at stores/chatStore.js:49", "加载历史消息失败", err);
        uni.showToast({ title: "加载历史失败", icon: "none" });
      } finally {
        uni.hideLoading();
        scrollToBottom();
      }
    };
    const connectWebSocket = () => {
      const userStore = useUserStore();
      const token = userStore.token;
      if (!token) {
        uni.showToast({ title: "请先登录", icon: "none" });
        return;
      }
      const wsUrl = `${WS_BASE_URL}/api/v1/chat/ws/${companionId.value}?token=${encodeURIComponent(token)}`;
      socketTask.value = uni.connectSocket({
        url: wsUrl,
        success: () => {
        },
        fail: (err) => {
          formatAppLog("error", "at stores/chatStore.js:75", "WebSocket 连接失败", err);
          uni.showToast({ title: "连接聊天服务器失败", icon: "none" });
        }
      });
      socketTask.value.onOpen(() => formatAppLog("log", "at stores/chatStore.js:81", "WebSocket 连接成功"));
      socketTask.value.onClose(() => formatAppLog("log", "at stores/chatStore.js:82", "WebSocket 连接关闭"));
      socketTask.value.onError((err) => {
        formatAppLog("error", "at stores/chatStore.js:84", "WebSocket 连接出错", err);
        isSending.value = false;
        uni.showToast({ title: "连接已断开", icon: "none" });
      });
      socketTask.value.onMessage(handleSocketMessage);
    };
    const handleSocketMessage = (res) => {
      const receivedText = res.data;
      if (receivedText === "[END_OF_STREAM]") {
        isSending.value = false;
        const lastMsg2 = messages.value[messages.value.length - 1];
        if (lastMsg2 && lastMsg2.role === "ai") {
          lastMsg2.done = true;
        }
        return;
      }
      if (receivedText.startsWith("[ERROR]")) {
        uni.showToast({ title: "AI 思考时出错了", icon: "none" });
        isSending.value = false;
        return;
      }
      const lastMsg = messages.value[messages.value.length - 1];
      if (lastMsg && lastMsg.role === "ai" && !lastMsg.done) {
        lastMsg.content += receivedText;
      } else {
        const newAiMessage = { role: "ai", content: receivedText, done: false, created_at: (/* @__PURE__ */ new Date()).toISOString() };
        messages.value = processMessages([newAiMessage], messages.value);
      }
      scrollToBottom();
    };
    const sendMessage = (content) => {
      if (!content || isSending.value || !socketTask.value)
        return;
      const userMessage = { role: "user", content, created_at: (/* @__PURE__ */ new Date()).toISOString() };
      messages.value = processMessages([userMessage], messages.value);
      socketTask.value.send({ data: content });
      isSending.value = true;
      scrollToBottom();
    };
    const closeChat = () => {
      if (socketTask.value) {
        socketTask.value.close();
        socketTask.value = null;
      }
    };
    const scrollToBottom = () => {
      vue.nextTick(() => {
        scrollTop.value += 1e4;
      });
    };
    const processMessages = (newMessages, existingMessages = []) => {
      let lastTimestamp = existingMessages.length > 0 ? new Date(existingMessages[existingMessages.length - 1].created_at).getTime() : 0;
      const tenMinutes = 10 * 60 * 1e3;
      newMessages.forEach((msg) => {
        msg._id = msg.id || msg.role + "_" + Date.now() + Math.random();
        const currentTimestamp = new Date(msg.created_at).getTime();
        if (currentTimestamp - lastTimestamp > tenMinutes) {
          msg.displayTime = formatDisplayTime(currentTimestamp);
        }
        lastTimestamp = currentTimestamp;
        msg.done = msg.done === void 0 ? true : msg.done;
      });
      return [...existingMessages, ...newMessages];
    };
    const formatDisplayTime = (timestamp) => {
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}月${date.getDate()}日 ${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}`;
    };
    return {
      messages,
      isSending,
      scrollTop,
      initializeChat,
      sendMessage,
      closeChat
    };
  });
  const _imports_0$1 = "/static/images/back-arrow-icon.png";
  const _imports_0 = "/static/images/right-arrow-icon.png";
  const _sfc_main$8 = {
    __name: "chat",
    setup(__props, { expose: __expose }) {
      __expose();
      const companionId = vue.ref(null);
      const companionName = vue.ref("");
      const companionAvatar = vue.ref("");
      const userAvatar = vue.ref("/static/images/user-avatar.png");
      const inputValue = vue.ref("");
      const chatStore = useChatStore();
      const { messages, isSending, scrollTop } = storeToRefs(chatStore);
      const statusBarHeight = vue.ref(0);
      const navBarHeight = vue.ref(0);
      const inputBarHeight = vue.ref(50);
      const calculateHeights = () => {
        const systemInfo = uni.getSystemInfoSync();
        statusBarHeight.value = systemInfo.statusBarHeight;
        navBarHeight.value = systemInfo.statusBarHeight + 44;
      };
      const calculateInputBarHeight = () => {
        uni.createSelectorQuery().select("#input-bar-container").boundingClientRect((data) => {
          if (data) {
            inputBarHeight.value = data.height;
          }
        }).exec();
      };
      const handleSend = () => {
        const content = inputValue.value.trim();
        if (content) {
          chatStore.sendMessage(content);
          inputValue.value = "";
        }
      };
      const navigateBack = () => {
        uni.navigateBack();
      };
      const navigateToSettings = () => {
        uni.navigateTo({
          url: `/pages/knowledge-base/knowledge-base?id=${companionId.value}&name=${companionName.value}`
        });
      };
      onLoad((options) => {
        if (!options.id) {
          uni.showToast({ title: "参数错误", icon: "none", duration: 2e3, success: () => setTimeout(() => uni.navigateBack(), 2e3) });
          return;
        }
        companionId.value = options.id;
        companionName.value = options.name || "聊天";
        companionAvatar.value = options.avatar || "/static/images/default-avatar.png";
        calculateHeights();
        chatStore.initializeChat(options.id);
      });
      const __returned__ = { companionId, companionName, companionAvatar, userAvatar, inputValue, chatStore, messages, isSending, scrollTop, statusBarHeight, navBarHeight, inputBarHeight, calculateHeights, calculateInputBarHeight, handleSend, navigateBack, navigateToSettings, ref: vue.ref, onMounted: vue.onMounted, get onLoad() {
        return onLoad;
      }, get onUnload() {
        return onUnload;
      }, get storeToRefs() {
        return storeToRefs;
      }, get useChatStore() {
        return useChatStore;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "chat-page" }, [
      vue.createElementVNode(
        "view",
        {
          class: "custom-nav-bar",
          style: vue.normalizeStyle({ paddingTop: $setup.statusBarHeight + "px" })
        },
        [
          vue.createElementVNode("view", { class: "nav-bar-content" }, [
            vue.createElementVNode("view", {
              class: "back-button",
              onClick: $setup.navigateBack
            }, [
              vue.createElementVNode("image", {
                class: "back-icon",
                src: _imports_0$1
              })
            ]),
            vue.createElementVNode("view", {
              class: "title-container",
              onClick: $setup.navigateToSettings
            }, [
              vue.createElementVNode(
                "text",
                { class: "nav-bar-title" },
                vue.toDisplayString($setup.companionName),
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
        style: vue.normalizeStyle({ paddingTop: $setup.navBarHeight + "px", paddingBottom: $setup.inputBarHeight + "px" }),
        "scroll-y": true,
        "scroll-top": $setup.scrollTop,
        "scroll-with-animation": true
      }, [
        vue.createElementVNode("view", { class: "message-list" }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.messages, (item) => {
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
                        src: $setup.companionAvatar
                      }, null, 8, ["src"])) : vue.createCommentVNode("v-if", true),
                      item.role === "user" ? (vue.openBlock(), vue.createElementBlock("image", {
                        key: 1,
                        class: "avatar",
                        src: $setup.userAvatar
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
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.inputValue = $event),
            placeholder: "说点什么吧...",
            "confirm-type": "send",
            onConfirm: $setup.handleSend,
            disabled: $setup.isSending,
            "adjust-position": false,
            "cursor-spacing": "20"
          }, null, 40, ["disabled"]), [
            [vue.vModelText, $setup.inputValue]
          ]),
          vue.createElementVNode("button", {
            class: "send-button",
            onClick: $setup.handleSend,
            disabled: $setup.isSending || !$setup.inputValue.trim()
          }, "发送", 8, ["disabled"])
        ])
      ])
    ]);
  }
  const PagesChatChat = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$7], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/chat/chat.vue"]]);
  const _sfc_main$7 = {
    __name: "login",
    setup(__props, { expose: __expose }) {
      __expose();
      const userStore = useUserStore();
      const loginForm = vue.reactive({
        // [已修改] 将 username 属性改为 email
        email: "",
        password: ""
      });
      const handleLogin = async () => {
        if (!loginForm.email || !loginForm.password) {
          uni.showToast({ title: "请输入邮箱和密码", icon: "none" });
          return;
        }
        try {
          await userStore.login(loginForm);
        } catch (error) {
          formatAppLog("log", "at pages/login/login.vue:45", "Login page caught an error.");
        }
      };
      const goToRegister = () => {
        uni.navigateTo({
          url: "/pages/register/register"
        });
      };
      const __returned__ = { userStore, loginForm, handleLogin, goToRegister, reactive: vue.reactive, get useUserStore() {
        return useUserStore;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
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
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.loginForm.email = $event),
            placeholder: "请输入邮箱"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.loginForm.email]
        ]),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input-item",
            type: "password",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.loginForm.password = $event),
            placeholder: "请输入密码"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.loginForm.password]
        ]),
        vue.createElementVNode("button", {
          class: "action-btn",
          onClick: $setup.handleLogin
        }, "登录"),
        vue.createElementVNode("view", {
          class: "link",
          onClick: $setup.goToRegister
        }, "还没有账户？立即注册")
      ])
    ]);
  }
  const PagesLoginLogin = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__scopeId", "data-v-e4e4508d"], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/login/login.vue"]]);
  const fontData = [
    {
      "font_class": "arrow-down",
      "unicode": ""
    },
    {
      "font_class": "arrow-left",
      "unicode": ""
    },
    {
      "font_class": "arrow-right",
      "unicode": ""
    },
    {
      "font_class": "arrow-up",
      "unicode": ""
    },
    {
      "font_class": "auth",
      "unicode": ""
    },
    {
      "font_class": "auth-filled",
      "unicode": ""
    },
    {
      "font_class": "back",
      "unicode": ""
    },
    {
      "font_class": "bars",
      "unicode": ""
    },
    {
      "font_class": "calendar",
      "unicode": ""
    },
    {
      "font_class": "calendar-filled",
      "unicode": ""
    },
    {
      "font_class": "camera",
      "unicode": ""
    },
    {
      "font_class": "camera-filled",
      "unicode": ""
    },
    {
      "font_class": "cart",
      "unicode": ""
    },
    {
      "font_class": "cart-filled",
      "unicode": ""
    },
    {
      "font_class": "chat",
      "unicode": ""
    },
    {
      "font_class": "chat-filled",
      "unicode": ""
    },
    {
      "font_class": "chatboxes",
      "unicode": ""
    },
    {
      "font_class": "chatboxes-filled",
      "unicode": ""
    },
    {
      "font_class": "chatbubble",
      "unicode": ""
    },
    {
      "font_class": "chatbubble-filled",
      "unicode": ""
    },
    {
      "font_class": "checkbox",
      "unicode": ""
    },
    {
      "font_class": "checkbox-filled",
      "unicode": ""
    },
    {
      "font_class": "checkmarkempty",
      "unicode": ""
    },
    {
      "font_class": "circle",
      "unicode": ""
    },
    {
      "font_class": "circle-filled",
      "unicode": ""
    },
    {
      "font_class": "clear",
      "unicode": ""
    },
    {
      "font_class": "close",
      "unicode": ""
    },
    {
      "font_class": "closeempty",
      "unicode": ""
    },
    {
      "font_class": "cloud-download",
      "unicode": ""
    },
    {
      "font_class": "cloud-download-filled",
      "unicode": ""
    },
    {
      "font_class": "cloud-upload",
      "unicode": ""
    },
    {
      "font_class": "cloud-upload-filled",
      "unicode": ""
    },
    {
      "font_class": "color",
      "unicode": ""
    },
    {
      "font_class": "color-filled",
      "unicode": ""
    },
    {
      "font_class": "compose",
      "unicode": ""
    },
    {
      "font_class": "contact",
      "unicode": ""
    },
    {
      "font_class": "contact-filled",
      "unicode": ""
    },
    {
      "font_class": "down",
      "unicode": ""
    },
    {
      "font_class": "bottom",
      "unicode": ""
    },
    {
      "font_class": "download",
      "unicode": ""
    },
    {
      "font_class": "download-filled",
      "unicode": ""
    },
    {
      "font_class": "email",
      "unicode": ""
    },
    {
      "font_class": "email-filled",
      "unicode": ""
    },
    {
      "font_class": "eye",
      "unicode": ""
    },
    {
      "font_class": "eye-filled",
      "unicode": ""
    },
    {
      "font_class": "eye-slash",
      "unicode": ""
    },
    {
      "font_class": "eye-slash-filled",
      "unicode": ""
    },
    {
      "font_class": "fire",
      "unicode": ""
    },
    {
      "font_class": "fire-filled",
      "unicode": ""
    },
    {
      "font_class": "flag",
      "unicode": ""
    },
    {
      "font_class": "flag-filled",
      "unicode": ""
    },
    {
      "font_class": "folder-add",
      "unicode": ""
    },
    {
      "font_class": "folder-add-filled",
      "unicode": ""
    },
    {
      "font_class": "font",
      "unicode": ""
    },
    {
      "font_class": "forward",
      "unicode": ""
    },
    {
      "font_class": "gear",
      "unicode": ""
    },
    {
      "font_class": "gear-filled",
      "unicode": ""
    },
    {
      "font_class": "gift",
      "unicode": ""
    },
    {
      "font_class": "gift-filled",
      "unicode": ""
    },
    {
      "font_class": "hand-down",
      "unicode": ""
    },
    {
      "font_class": "hand-down-filled",
      "unicode": ""
    },
    {
      "font_class": "hand-up",
      "unicode": ""
    },
    {
      "font_class": "hand-up-filled",
      "unicode": ""
    },
    {
      "font_class": "headphones",
      "unicode": ""
    },
    {
      "font_class": "heart",
      "unicode": ""
    },
    {
      "font_class": "heart-filled",
      "unicode": ""
    },
    {
      "font_class": "help",
      "unicode": ""
    },
    {
      "font_class": "help-filled",
      "unicode": ""
    },
    {
      "font_class": "home",
      "unicode": ""
    },
    {
      "font_class": "home-filled",
      "unicode": ""
    },
    {
      "font_class": "image",
      "unicode": ""
    },
    {
      "font_class": "image-filled",
      "unicode": ""
    },
    {
      "font_class": "images",
      "unicode": ""
    },
    {
      "font_class": "images-filled",
      "unicode": ""
    },
    {
      "font_class": "info",
      "unicode": ""
    },
    {
      "font_class": "info-filled",
      "unicode": ""
    },
    {
      "font_class": "left",
      "unicode": ""
    },
    {
      "font_class": "link",
      "unicode": ""
    },
    {
      "font_class": "list",
      "unicode": ""
    },
    {
      "font_class": "location",
      "unicode": ""
    },
    {
      "font_class": "location-filled",
      "unicode": ""
    },
    {
      "font_class": "locked",
      "unicode": ""
    },
    {
      "font_class": "locked-filled",
      "unicode": ""
    },
    {
      "font_class": "loop",
      "unicode": ""
    },
    {
      "font_class": "mail-open",
      "unicode": ""
    },
    {
      "font_class": "mail-open-filled",
      "unicode": ""
    },
    {
      "font_class": "map",
      "unicode": ""
    },
    {
      "font_class": "map-filled",
      "unicode": ""
    },
    {
      "font_class": "map-pin",
      "unicode": ""
    },
    {
      "font_class": "map-pin-ellipse",
      "unicode": ""
    },
    {
      "font_class": "medal",
      "unicode": ""
    },
    {
      "font_class": "medal-filled",
      "unicode": ""
    },
    {
      "font_class": "mic",
      "unicode": ""
    },
    {
      "font_class": "mic-filled",
      "unicode": ""
    },
    {
      "font_class": "micoff",
      "unicode": ""
    },
    {
      "font_class": "micoff-filled",
      "unicode": ""
    },
    {
      "font_class": "minus",
      "unicode": ""
    },
    {
      "font_class": "minus-filled",
      "unicode": ""
    },
    {
      "font_class": "more",
      "unicode": ""
    },
    {
      "font_class": "more-filled",
      "unicode": ""
    },
    {
      "font_class": "navigate",
      "unicode": ""
    },
    {
      "font_class": "navigate-filled",
      "unicode": ""
    },
    {
      "font_class": "notification",
      "unicode": ""
    },
    {
      "font_class": "notification-filled",
      "unicode": ""
    },
    {
      "font_class": "paperclip",
      "unicode": ""
    },
    {
      "font_class": "paperplane",
      "unicode": ""
    },
    {
      "font_class": "paperplane-filled",
      "unicode": ""
    },
    {
      "font_class": "person",
      "unicode": ""
    },
    {
      "font_class": "person-filled",
      "unicode": ""
    },
    {
      "font_class": "personadd",
      "unicode": ""
    },
    {
      "font_class": "personadd-filled",
      "unicode": ""
    },
    {
      "font_class": "personadd-filled-copy",
      "unicode": ""
    },
    {
      "font_class": "phone",
      "unicode": ""
    },
    {
      "font_class": "phone-filled",
      "unicode": ""
    },
    {
      "font_class": "plus",
      "unicode": ""
    },
    {
      "font_class": "plus-filled",
      "unicode": ""
    },
    {
      "font_class": "plusempty",
      "unicode": ""
    },
    {
      "font_class": "pulldown",
      "unicode": ""
    },
    {
      "font_class": "pyq",
      "unicode": ""
    },
    {
      "font_class": "qq",
      "unicode": ""
    },
    {
      "font_class": "redo",
      "unicode": ""
    },
    {
      "font_class": "redo-filled",
      "unicode": ""
    },
    {
      "font_class": "refresh",
      "unicode": ""
    },
    {
      "font_class": "refresh-filled",
      "unicode": ""
    },
    {
      "font_class": "refreshempty",
      "unicode": ""
    },
    {
      "font_class": "reload",
      "unicode": ""
    },
    {
      "font_class": "right",
      "unicode": ""
    },
    {
      "font_class": "scan",
      "unicode": ""
    },
    {
      "font_class": "search",
      "unicode": ""
    },
    {
      "font_class": "settings",
      "unicode": ""
    },
    {
      "font_class": "settings-filled",
      "unicode": ""
    },
    {
      "font_class": "shop",
      "unicode": ""
    },
    {
      "font_class": "shop-filled",
      "unicode": ""
    },
    {
      "font_class": "smallcircle",
      "unicode": ""
    },
    {
      "font_class": "smallcircle-filled",
      "unicode": ""
    },
    {
      "font_class": "sound",
      "unicode": ""
    },
    {
      "font_class": "sound-filled",
      "unicode": ""
    },
    {
      "font_class": "spinner-cycle",
      "unicode": ""
    },
    {
      "font_class": "staff",
      "unicode": ""
    },
    {
      "font_class": "staff-filled",
      "unicode": ""
    },
    {
      "font_class": "star",
      "unicode": ""
    },
    {
      "font_class": "star-filled",
      "unicode": ""
    },
    {
      "font_class": "starhalf",
      "unicode": ""
    },
    {
      "font_class": "trash",
      "unicode": ""
    },
    {
      "font_class": "trash-filled",
      "unicode": ""
    },
    {
      "font_class": "tune",
      "unicode": ""
    },
    {
      "font_class": "tune-filled",
      "unicode": ""
    },
    {
      "font_class": "undo",
      "unicode": ""
    },
    {
      "font_class": "undo-filled",
      "unicode": ""
    },
    {
      "font_class": "up",
      "unicode": ""
    },
    {
      "font_class": "top",
      "unicode": ""
    },
    {
      "font_class": "upload",
      "unicode": ""
    },
    {
      "font_class": "upload-filled",
      "unicode": ""
    },
    {
      "font_class": "videocam",
      "unicode": ""
    },
    {
      "font_class": "videocam-filled",
      "unicode": ""
    },
    {
      "font_class": "vip",
      "unicode": ""
    },
    {
      "font_class": "vip-filled",
      "unicode": ""
    },
    {
      "font_class": "wallet",
      "unicode": ""
    },
    {
      "font_class": "wallet-filled",
      "unicode": ""
    },
    {
      "font_class": "weibo",
      "unicode": ""
    },
    {
      "font_class": "weixin",
      "unicode": ""
    }
  ];
  const getVal = (val) => {
    const reg = /^[0-9]*$/g;
    return typeof val === "number" || reg.test(val) ? val + "px" : val;
  };
  const _sfc_main$6 = {
    name: "UniIcons",
    emits: ["click"],
    props: {
      type: {
        type: String,
        default: ""
      },
      color: {
        type: String,
        default: "#333333"
      },
      size: {
        type: [Number, String],
        default: 16
      },
      customPrefix: {
        type: String,
        default: ""
      },
      fontFamily: {
        type: String,
        default: ""
      }
    },
    data() {
      return {
        icons: fontData
      };
    },
    computed: {
      unicode() {
        let code = this.icons.find((v) => v.font_class === this.type);
        if (code) {
          return code.unicode;
        }
        return "";
      },
      iconSize() {
        return getVal(this.size);
      },
      styleObj() {
        if (this.fontFamily !== "") {
          return `color: ${this.color}; font-size: ${this.iconSize}; font-family: ${this.fontFamily};`;
        }
        return `color: ${this.color}; font-size: ${this.iconSize};`;
      }
    },
    methods: {
      _onClick(e) {
        this.$emit("click", e);
      }
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock(
      "text",
      {
        style: vue.normalizeStyle($options.styleObj),
        class: vue.normalizeClass(["uni-icons", ["uniui-" + $props.type, $props.customPrefix, $props.customPrefix ? $props.type : ""]]),
        onClick: _cache[0] || (_cache[0] = (...args) => $options._onClick && $options._onClick(...args))
      },
      [
        vue.renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ],
      6
      /* CLASS, STYLE */
    );
  }
  const __easycom_0$1 = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__scopeId", "data-v-946bce22"], ["__file", "D:/HBuilderX/项目/ai情感陪伴/node_modules/@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue"]]);
  function obj2strClass(obj) {
    let classess = "";
    for (let key in obj) {
      const val = obj[key];
      if (val) {
        classess += `${key} `;
      }
    }
    return classess;
  }
  function obj2strStyle(obj) {
    let style = "";
    for (let key in obj) {
      const val = obj[key];
      style += `${key}:${val};`;
    }
    return style;
  }
  const _sfc_main$5 = {
    name: "uni-easyinput",
    emits: [
      "click",
      "iconClick",
      "update:modelValue",
      "input",
      "focus",
      "blur",
      "confirm",
      "clear",
      "eyes",
      "change",
      "keyboardheightchange"
    ],
    model: {
      prop: "modelValue",
      event: "update:modelValue"
    },
    options: {
      virtualHost: true
    },
    inject: {
      form: {
        from: "uniForm",
        default: null
      },
      formItem: {
        from: "uniFormItem",
        default: null
      }
    },
    props: {
      name: String,
      value: [Number, String],
      modelValue: [Number, String],
      type: {
        type: String,
        default: "text"
      },
      clearable: {
        type: Boolean,
        default: true
      },
      autoHeight: {
        type: Boolean,
        default: false
      },
      placeholder: {
        type: String,
        default: " "
      },
      placeholderStyle: String,
      focus: {
        type: Boolean,
        default: false
      },
      disabled: {
        type: Boolean,
        default: false
      },
      maxlength: {
        type: [Number, String],
        default: 140
      },
      confirmType: {
        type: String,
        default: "done"
      },
      clearSize: {
        type: [Number, String],
        default: 24
      },
      inputBorder: {
        type: Boolean,
        default: true
      },
      prefixIcon: {
        type: String,
        default: ""
      },
      suffixIcon: {
        type: String,
        default: ""
      },
      trim: {
        type: [Boolean, String],
        default: false
      },
      cursorSpacing: {
        type: Number,
        default: 0
      },
      passwordIcon: {
        type: Boolean,
        default: true
      },
      adjustPosition: {
        type: Boolean,
        default: true
      },
      primaryColor: {
        type: String,
        default: "#2979ff"
      },
      styles: {
        type: Object,
        default() {
          return {
            color: "#333",
            backgroundColor: "#fff",
            disableColor: "#F7F6F6",
            borderColor: "#e5e5e5"
          };
        }
      },
      errorMessage: {
        type: [String, Boolean],
        default: ""
      }
    },
    data() {
      return {
        focused: false,
        val: "",
        showMsg: "",
        border: false,
        isFirstBorder: false,
        showClearIcon: false,
        showPassword: false,
        focusShow: false,
        localMsg: "",
        isEnter: false
        // 用于判断当前是否是使用回车操作
      };
    },
    computed: {
      // 输入框内是否有值
      isVal() {
        const val = this.val;
        if (val || val === 0) {
          return true;
        }
        return false;
      },
      msg() {
        return this.localMsg || this.errorMessage;
      },
      // 因为uniapp的input组件的maxlength组件必须要数值，这里转为数值，用户可以传入字符串数值
      inputMaxlength() {
        return Number(this.maxlength);
      },
      // 处理外层样式的style
      boxStyle() {
        return `color:${this.inputBorder && this.msg ? "#e43d33" : this.styles.color};`;
      },
      // input 内容的类和样式处理
      inputContentClass() {
        return obj2strClass({
          "is-input-border": this.inputBorder,
          "is-input-error-border": this.inputBorder && this.msg,
          "is-textarea": this.type === "textarea",
          "is-disabled": this.disabled,
          "is-focused": this.focusShow
        });
      },
      inputContentStyle() {
        const focusColor = this.focusShow ? this.primaryColor : this.styles.borderColor;
        const borderColor = this.inputBorder && this.msg ? "#dd524d" : focusColor;
        return obj2strStyle({
          "border-color": borderColor || "#e5e5e5",
          "background-color": this.disabled ? this.styles.disableColor : this.styles.backgroundColor
        });
      },
      // input右侧样式
      inputStyle() {
        const paddingRight = this.type === "password" || this.clearable || this.prefixIcon ? "" : "10px";
        return obj2strStyle({
          "padding-right": paddingRight,
          "padding-left": this.prefixIcon ? "" : "10px",
          ...this.styles
        });
      }
    },
    watch: {
      value(newVal) {
        if (newVal === null) {
          this.val = "";
          return;
        }
        this.val = newVal;
      },
      modelValue(newVal) {
        if (newVal === null) {
          this.val = "";
          return;
        }
        this.val = newVal;
      },
      focus(newVal) {
        this.$nextTick(() => {
          this.focused = this.focus;
          this.focusShow = this.focus;
        });
      }
    },
    created() {
      this.init();
      if (this.form && this.formItem) {
        this.$watch("formItem.errMsg", (newVal) => {
          this.localMsg = newVal;
        });
      }
    },
    mounted() {
      this.$nextTick(() => {
        this.focused = this.focus;
        this.focusShow = this.focus;
      });
    },
    methods: {
      /**
       * 初始化变量值
       */
      init() {
        if (this.value || this.value === 0) {
          this.val = this.value;
        } else if (this.modelValue || this.modelValue === 0 || this.modelValue === "") {
          this.val = this.modelValue;
        } else {
          this.val = "";
        }
      },
      /**
       * 点击图标时触发
       * @param {Object} type
       */
      onClickIcon(type) {
        this.$emit("iconClick", type);
      },
      /**
       * 显示隐藏内容，密码框时生效
       */
      onEyes() {
        this.showPassword = !this.showPassword;
        this.$emit("eyes", this.showPassword);
      },
      /**
       * 输入时触发
       * @param {Object} event
       */
      onInput(event) {
        let value = event.detail.value;
        if (this.trim) {
          if (typeof this.trim === "boolean" && this.trim) {
            value = this.trimStr(value);
          }
          if (typeof this.trim === "string") {
            value = this.trimStr(value, this.trim);
          }
        }
        if (this.errMsg)
          this.errMsg = "";
        this.val = value;
        this.$emit("input", value);
        this.$emit("update:modelValue", value);
      },
      /**
       * 外部调用方法
       * 获取焦点时触发
       * @param {Object} event
       */
      onFocus() {
        this.$nextTick(() => {
          this.focused = true;
        });
        this.$emit("focus", null);
      },
      _Focus(event) {
        this.focusShow = true;
        this.$emit("focus", event);
      },
      /**
       * 外部调用方法
       * 失去焦点时触发
       * @param {Object} event
       */
      onBlur() {
        this.focused = false;
        this.$emit("blur", null);
      },
      _Blur(event) {
        event.detail.value;
        this.focusShow = false;
        this.$emit("blur", event);
        if (this.isEnter === false) {
          this.$emit("change", this.val);
        }
        if (this.form && this.formItem) {
          const { validateTrigger } = this.form;
          if (validateTrigger === "blur") {
            this.formItem.onFieldChange();
          }
        }
      },
      /**
       * 按下键盘的发送键
       * @param {Object} e
       */
      onConfirm(e) {
        this.$emit("confirm", this.val);
        this.isEnter = true;
        this.$emit("change", this.val);
        this.$nextTick(() => {
          this.isEnter = false;
        });
      },
      /**
       * 清理内容
       * @param {Object} event
       */
      onClear(event) {
        this.val = "";
        this.$emit("input", "");
        this.$emit("update:modelValue", "");
        this.$emit("clear");
      },
      /**
       * 键盘高度发生变化的时候触发此事件
       * 兼容性：微信小程序2.7.0+、App 3.1.0+
       * @param {Object} event
       */
      onkeyboardheightchange(event) {
        this.$emit("keyboardheightchange", event);
      },
      /**
       * 去除空格
       */
      trimStr(str, pos = "both") {
        if (pos === "both") {
          return str.trim();
        } else if (pos === "left") {
          return str.trimLeft();
        } else if (pos === "right") {
          return str.trimRight();
        } else if (pos === "start") {
          return str.trimStart();
        } else if (pos === "end") {
          return str.trimEnd();
        } else if (pos === "all") {
          return str.replace(/\s+/g, "");
        } else if (pos === "none") {
          return str;
        }
        return str;
      }
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_uni_icons = resolveEasycom(vue.resolveDynamicComponent("uni-icons"), __easycom_0$1);
    return vue.openBlock(), vue.createElementBlock(
      "view",
      {
        class: vue.normalizeClass(["uni-easyinput", { "uni-easyinput-error": $options.msg }]),
        style: vue.normalizeStyle($options.boxStyle)
      },
      [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["uni-easyinput__content", $options.inputContentClass]),
            style: vue.normalizeStyle($options.inputContentStyle)
          },
          [
            $props.prefixIcon ? (vue.openBlock(), vue.createBlock(_component_uni_icons, {
              key: 0,
              class: "content-clear-icon",
              type: $props.prefixIcon,
              color: "#c0c4cc",
              onClick: _cache[0] || (_cache[0] = ($event) => $options.onClickIcon("prefix")),
              size: "22"
            }, null, 8, ["type"])) : vue.createCommentVNode("v-if", true),
            vue.renderSlot(_ctx.$slots, "left", {}, void 0, true),
            $props.type === "textarea" ? (vue.openBlock(), vue.createElementBlock("textarea", {
              key: 1,
              class: vue.normalizeClass(["uni-easyinput__content-textarea", { "input-padding": $props.inputBorder }]),
              name: $props.name,
              value: $data.val,
              placeholder: $props.placeholder,
              placeholderStyle: $props.placeholderStyle,
              disabled: $props.disabled,
              "placeholder-class": "uni-easyinput__placeholder-class",
              maxlength: $options.inputMaxlength,
              focus: $data.focused,
              autoHeight: $props.autoHeight,
              "cursor-spacing": $props.cursorSpacing,
              "adjust-position": $props.adjustPosition,
              onInput: _cache[1] || (_cache[1] = (...args) => $options.onInput && $options.onInput(...args)),
              onBlur: _cache[2] || (_cache[2] = (...args) => $options._Blur && $options._Blur(...args)),
              onFocus: _cache[3] || (_cache[3] = (...args) => $options._Focus && $options._Focus(...args)),
              onConfirm: _cache[4] || (_cache[4] = (...args) => $options.onConfirm && $options.onConfirm(...args)),
              onKeyboardheightchange: _cache[5] || (_cache[5] = (...args) => $options.onkeyboardheightchange && $options.onkeyboardheightchange(...args))
            }, null, 42, ["name", "value", "placeholder", "placeholderStyle", "disabled", "maxlength", "focus", "autoHeight", "cursor-spacing", "adjust-position"])) : (vue.openBlock(), vue.createElementBlock("input", {
              key: 2,
              type: $props.type === "password" ? "text" : $props.type,
              class: "uni-easyinput__content-input",
              style: vue.normalizeStyle($options.inputStyle),
              name: $props.name,
              value: $data.val,
              password: !$data.showPassword && $props.type === "password",
              placeholder: $props.placeholder,
              placeholderStyle: $props.placeholderStyle,
              "placeholder-class": "uni-easyinput__placeholder-class",
              disabled: $props.disabled,
              maxlength: $options.inputMaxlength,
              focus: $data.focused,
              confirmType: $props.confirmType,
              "cursor-spacing": $props.cursorSpacing,
              "adjust-position": $props.adjustPosition,
              onFocus: _cache[6] || (_cache[6] = (...args) => $options._Focus && $options._Focus(...args)),
              onBlur: _cache[7] || (_cache[7] = (...args) => $options._Blur && $options._Blur(...args)),
              onInput: _cache[8] || (_cache[8] = (...args) => $options.onInput && $options.onInput(...args)),
              onConfirm: _cache[9] || (_cache[9] = (...args) => $options.onConfirm && $options.onConfirm(...args)),
              onKeyboardheightchange: _cache[10] || (_cache[10] = (...args) => $options.onkeyboardheightchange && $options.onkeyboardheightchange(...args))
            }, null, 44, ["type", "name", "value", "password", "placeholder", "placeholderStyle", "disabled", "maxlength", "focus", "confirmType", "cursor-spacing", "adjust-position"])),
            $props.type === "password" && $props.passwordIcon ? (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              { key: 3 },
              [
                vue.createCommentVNode(" 开启密码时显示小眼睛 "),
                $options.isVal ? (vue.openBlock(), vue.createBlock(_component_uni_icons, {
                  key: 0,
                  class: vue.normalizeClass(["content-clear-icon", { "is-textarea-icon": $props.type === "textarea" }]),
                  type: $data.showPassword ? "eye-slash-filled" : "eye-filled",
                  size: 22,
                  color: $data.focusShow ? $props.primaryColor : "#c0c4cc",
                  onClick: $options.onEyes
                }, null, 8, ["class", "type", "color", "onClick"])) : vue.createCommentVNode("v-if", true)
              ],
              64
              /* STABLE_FRAGMENT */
            )) : vue.createCommentVNode("v-if", true),
            $props.suffixIcon ? (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              { key: 4 },
              [
                $props.suffixIcon ? (vue.openBlock(), vue.createBlock(_component_uni_icons, {
                  key: 0,
                  class: "content-clear-icon",
                  type: $props.suffixIcon,
                  color: "#c0c4cc",
                  onClick: _cache[11] || (_cache[11] = ($event) => $options.onClickIcon("suffix")),
                  size: "22"
                }, null, 8, ["type"])) : vue.createCommentVNode("v-if", true)
              ],
              64
              /* STABLE_FRAGMENT */
            )) : (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              { key: 5 },
              [
                $props.clearable && $options.isVal && !$props.disabled && $props.type !== "textarea" ? (vue.openBlock(), vue.createBlock(_component_uni_icons, {
                  key: 0,
                  class: vue.normalizeClass(["content-clear-icon", { "is-textarea-icon": $props.type === "textarea" }]),
                  type: "clear",
                  size: $props.clearSize,
                  color: $options.msg ? "#dd524d" : $data.focusShow ? $props.primaryColor : "#c0c4cc",
                  onClick: $options.onClear
                }, null, 8, ["class", "size", "color", "onClick"])) : vue.createCommentVNode("v-if", true)
              ],
              64
              /* STABLE_FRAGMENT */
            )),
            vue.renderSlot(_ctx.$slots, "right", {}, void 0, true)
          ],
          6
          /* CLASS, STYLE */
        )
      ],
      6
      /* CLASS, STYLE */
    );
  }
  const __easycom_0 = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__scopeId", "data-v-f7a14e66"], ["__file", "D:/HBuilderX/项目/ai情感陪伴/node_modules/@dcloudio/uni-ui/lib/uni-easyinput/uni-easyinput.vue"]]);
  const _sfc_main$4 = {
    __name: "register",
    setup(__props, { expose: __expose }) {
      __expose();
      const userStore = useUserStore();
      const nickname = vue.ref("");
      const email = vue.ref("");
      const password = vue.ref("");
      const confirmPassword = vue.ref("");
      const handleRegister = async () => {
        if (!nickname.value || !email.value || !password.value) {
          uni.showToast({ title: "昵称、邮箱和密码不能为空", icon: "none" });
          return;
        }
        if (password.value !== confirmPassword.value) {
          uni.showToast({ title: "两次输入的密码不一致", icon: "none" });
          return;
        }
        try {
          await userStore.register({
            nickname: nickname.value,
            email: email.value,
            password: password.value
          });
        } catch (error) {
          formatAppLog("log", "at pages/register/register.vue:47", "Register page caught an error.");
        }
      };
      const __returned__ = { userStore, nickname, email, password, confirmPassword, handleRegister, ref: vue.ref, get useUserStore() {
        return useUserStore;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_uni_easyinput = resolveEasycom(vue.resolveDynamicComponent("uni-easyinput"), __easycom_0);
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "form-group" }, [
        vue.createVNode(_component_uni_easyinput, {
          modelValue: $setup.nickname,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.nickname = $event),
          placeholder: "请输入昵称"
        }, null, 8, ["modelValue"])
      ]),
      vue.createElementVNode("view", { class: "form-group" }, [
        vue.createVNode(_component_uni_easyinput, {
          modelValue: $setup.email,
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.email = $event),
          placeholder: "请输入邮箱"
        }, null, 8, ["modelValue"])
      ]),
      vue.createElementVNode("view", { class: "form-group" }, [
        vue.createVNode(_component_uni_easyinput, {
          modelValue: $setup.password,
          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.password = $event),
          type: "password",
          placeholder: "请输入密码"
        }, null, 8, ["modelValue"])
      ]),
      vue.createElementVNode("view", { class: "form-group" }, [
        vue.createVNode(_component_uni_easyinput, {
          modelValue: $setup.confirmPassword,
          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.confirmPassword = $event),
          type: "password",
          placeholder: "请确认密码"
        }, null, 8, ["modelValue"])
      ]),
      vue.createElementVNode("button", {
        onClick: $setup.handleRegister,
        class: "submit-btn"
      }, "注册")
    ]);
  }
  const PagesRegisterRegister = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/register/register.vue"]]);
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
  const baseUrl = "http://120.53.230.215:8000/api/v1";
  const TokenKey = "user_access_token";
  function getToken() {
    return uni.getStorageSync(TokenKey);
  }
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
  const useKnowledgeStore = defineStore("knowledge", () => {
    const files = vue.ref([]);
    const isLoading = vue.ref(true);
    const isUploading = vue.ref(false);
    const currentCompanionId = vue.ref(null);
    const initializeKnowledgeBase = async (companionId) => {
      currentCompanionId.value = companionId;
      await fetchFiles();
    };
    const fetchFiles = async () => {
      if (!currentCompanionId.value)
        return;
      isLoading.value = true;
      try {
        const fileList = await getKnowledgeFiles(currentCompanionId.value);
        files.value = fileList;
      } catch (err) {
        formatAppLog("error", "at stores/knowledgeStore.js:34", "获取文件列表失败", err);
        uni.showToast({ title: "获取列表失败", icon: "none" });
      } finally {
        isLoading.value = false;
      }
    };
    const uploadFile = async (fileOrPath) => {
      if (!currentCompanionId.value)
        return;
      isUploading.value = true;
      uni.showLoading({ title: "上传中..." });
      try {
        await uploadKnowledgeFile(currentCompanionId.value, fileOrPath);
        uni.showToast({ title: "上传成功，后台处理中...", icon: "success" });
        setTimeout(() => {
          fetchFiles();
        }, 2e3);
      } catch (err) {
        formatAppLog("error", "at stores/knowledgeStore.js:56", "上传失败", err);
        uni.showToast({ title: "上传失败", icon: "none" });
      } finally {
        isUploading.value = false;
        uni.hideLoading();
      }
    };
    const deleteFile = async (fileId) => {
      uni.showLoading({ title: "删除中..." });
      try {
        await deleteKnowledgeFile(fileId);
        uni.showToast({ title: "删除成功", icon: "success" });
        await fetchFiles();
      } catch (err) {
        formatAppLog("error", "at stores/knowledgeStore.js:75", "删除失败", err);
        uni.showToast({ title: "删除失败", icon: "none" });
      } finally {
        uni.hideLoading();
      }
    };
    return {
      files,
      isLoading,
      isUploading,
      initializeKnowledgeBase,
      fetchFiles,
      uploadFile,
      deleteFile
    };
  });
  const _sfc_main$2 = {
    __name: "companion-settings",
    setup(__props, { expose: __expose }) {
      __expose();
      const knowledgeStore = useKnowledgeStore();
      const { files, isLoading, isUploading } = storeToRefs(knowledgeStore);
      let companionId = null;
      onLoad((options) => {
        companionId = options.id;
        uni.setNavigationBarTitle({ title: "知识库管理" });
        knowledgeStore.initializeKnowledgeBase(companionId);
      });
      onShow(() => {
        knowledgeStore.fetchFiles();
      });
      const confirmDelete = (file) => {
        uni.showModal({
          title: "确认删除",
          content: `确定要删除文件 "${file.file_name}" 吗？`,
          confirmText: "删除",
          confirmColor: "#fa5151",
          success: (res) => {
            if (res.confirm) {
              knowledgeStore.deleteFile(file.id);
            }
          }
        });
      };
      const chooseAndUploadFile = async () => {
      };
      const formatStatus = (status) => {
        const statusMap = { "UPLOADED": "已上传", "PROCESSING": "处理中", "INDEXED": "已索引", "FAILED": "失败" };
        return statusMap[status] || status;
      };
      const __returned__ = { knowledgeStore, files, isLoading, isUploading, get companionId() {
        return companionId;
      }, set companionId(v) {
        companionId = v;
      }, confirmDelete, chooseAndUploadFile, formatStatus, get onShow() {
        return onShow;
      }, get onLoad() {
        return onLoad;
      }, get storeToRefs() {
        return storeToRefs;
      }, get useKnowledgeStore() {
        return useKnowledgeStore;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "file-list-container" }, [
        !$setup.isLoading && $setup.files.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "file-list"
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.files, (file) => {
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
                    vue.toDisplayString($setup.formatStatus(file.status)),
                    3
                    /* TEXT, CLASS */
                  )
                ]),
                vue.createElementVNode("button", {
                  class: "delete-btn",
                  size: "mini",
                  onClick: ($event) => $setup.confirmDelete(file)
                }, "删除", 8, ["onClick"])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : vue.createCommentVNode("v-if", true),
        !$setup.isLoading && $setup.files.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "empty-tip"
        }, "知识库为空，请上传文件")) : vue.createCommentVNode("v-if", true),
        $setup.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "loading-tip"
        }, "正在加载文件列表...")) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createElementVNode("button", {
        class: "upload-btn",
        onClick: $setup.chooseAndUploadFile,
        loading: $setup.isUploading
      }, "上传新文件", 8, ["loading"])
    ]);
  }
  const PagesCompanionSettingsCompanionSettings = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-021beadd"], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/companion-settings/companion-settings.vue"]]);
  const _sfc_main$1 = {
    __name: "knowledge-base",
    setup(__props, { expose: __expose }) {
      __expose();
      const companionId = vue.ref(null);
      const companionName = vue.ref("");
      const companionStore = useCompanionStore();
      onLoad((options) => {
        if (!options.id) {
          uni.showToast({ title: "参数错误", icon: "none" });
          uni.navigateBack();
          return;
        }
        companionId.value = options.id;
        companionName.value = options.name || "";
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
          title: "请再次确认",
          content: `确定要永久删除 "${companionName.value}" 吗？所有相关数据都将被彻底清除且无法恢复。`,
          confirmText: "确定删除",
          confirmColor: "#fa5151",
          success: (res) => {
            if (res.confirm) {
              companionStore.deleteCompanion(companionId.value);
            }
          }
        });
      };
      const __returned__ = { companionId, companionName, companionStore, navigateToKnowledgeSettings, navigateToEditPersona, onDeleteCompanion, ref: vue.ref, get onLoad() {
        return onLoad;
      }, get useCompanionStore() {
        return useCompanionStore;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", null, [
      vue.createElementVNode("view", { class: "settings-container" }, [
        vue.createElementVNode("view", { class: "menu-group" }, [
          vue.createElementVNode("view", {
            class: "menu-item",
            onClick: $setup.navigateToKnowledgeSettings
          }, [
            vue.createElementVNode("text", { class: "menu-label" }, "知识库管理"),
            vue.createElementVNode("image", {
              class: "arrow-icon",
              src: _imports_0
            })
          ]),
          vue.createElementVNode("view", {
            class: "menu-item",
            onClick: $setup.navigateToEditPersona
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
          onClick: $setup.onDeleteCompanion
        }, "删除此AI伙伴"),
        vue.createElementVNode("view", { class: "danger-zone-tip" }, "此操作将永久删除伙伴的所有数据，包括聊天记录和知识库，且无法恢复。")
      ])
    ]);
  }
  const PagesKnowledgeBaseKnowledgeBase = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "D:/HBuilderX/项目/ai情感陪伴/pages/knowledge-base/knowledge-base.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  __definePage("pages/chat/chat", PagesChatChat);
  __definePage("pages/login/login", PagesLoginLogin);
  __definePage("pages/register/register", PagesRegisterRegister);
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
    const pinia = createPinia();
    app.use(pinia);
    return {
      app,
      Pinia
      // HBuilderX 最新版本需要同时导出 Pinia
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
