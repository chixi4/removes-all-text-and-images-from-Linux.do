// ==UserScript==
// @name         LinuxDo 极简隐字隐图模式
// @namespace    https://linux.do/
// @version      0.1.0
// @description  开启后不显示任何文字和位图，只保留页面布局与交互区域；再次切换可恢复。
// @author       you
// @match        *://linux.do/*
// @match        *://*.linux.do/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  const KEY = 'concealEnabled';
  const DEFAULT_ENABLED = true;

  // 生成 CSS：隐藏文本、位图、背景图、伪元素内容等，但保留尺寸/布局
  const STYLE_ID = 'ldo-conceal-style';
  const CSS = `
  /* 隐藏所有可见文本（含输入框等），移除阴影，防止文字通过描边等方式露出 */
  * {
    color: transparent !important;
    text-shadow: none !important;
    -webkit-text-stroke: 0 !important;
    text-stroke: 0 !important;
    caret-color: transparent !important; /* 输入光标也隐藏 */
  }

  /* 移除通过 ::before/::after 注入的文字/图标 */
  *::before, *::after {
    content: '' !important;
    text-shadow: none !important;
  }

  /* 隐藏位图/图形媒介 */
  img, picture, video, canvas, svg {
    display: none !important;
  }

  /* 禁用 CSS 背景图、遮罩图（常用于装饰/图标/头像） */
  *, *::before, *::after {
    background-image: none !important;
    -webkit-mask-image: none !important;
    mask-image: none !important;
  }

  /* 代码块/预格式文本同样隐藏其内容（留空白块以保留布局高度） */
  pre, code, kbd, samp {
    color: transparent !important;
  }

  /* 避免选择高亮时出现反色可见文本 */
  ::selection {
    background: transparent !important;
    color: transparent !important;
  }
  `;

  function isEnabled() {
    const v = GM_getValue(KEY);
    if (typeof v === 'undefined') return DEFAULT_ENABLED;
    return !!v;
  }

  function applyStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.type = 'text/css';
    style.appendChild(document.createTextNode(CSS));
    document.documentElement.appendChild(style);
  }

  function removeStyle() {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }

  function setEnabled(on) {
    GM_setValue(KEY, !!on);
    if (on) applyStyle(); else removeStyle();
  }

  // 初始状态（document-start 即可插入，避免闪现）
  if (isEnabled()) applyStyle();

  // 菜单切换
  function refreshMenu() {
    // 先清空已有菜单（Tampermonkey 会在每次刷新时重建，不提供移除 API，重复注册也没问题）
    GM_registerMenuCommand(isEnabled() ? '关闭隐字隐图模式' : '开启隐字隐图模式', () => {
      setEnabled(!isEnabled());
      // 给出轻微的视觉提示（可选）
      try {
        const n = document.createElement('div');
        n.textContent = isEnabled() ? '已开启' : '已关闭';
        Object.assign(n.style, {
          position: 'fixed', inset: '16px auto auto 16px',
          padding: '6px 10px', background: 'rgba(0,0,0,0.5)',
          color: '#fff', borderRadius: '8px', fontSize: '12px',
          zIndex: 2147483647, pointerEvents: 'none'
        });
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 900);
      } catch {}
    });
  }
  refreshMenu();

  // 键盘快捷键：Ctrl + Shift + 0 切换
  window.addEventListener('keydown', (e) => {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
    if (ctrlOrCmd && e.shiftKey && e.key === '0') {
      e.preventDefault();
      setEnabled(!isEnabled());
    }
  }, { passive: false });

  // 对于 SPA（论坛是单页应用），路由切换后样式仍然生效；但若站点热替换 <html> 或 <head>，则再注入
  const obs = new MutationObserver(() => {
    if (isEnabled() && !document.getElementById(STYLE_ID)) applyStyle();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
